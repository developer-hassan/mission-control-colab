import express from 'express';
import facebookAds from '../integrations/facebook-ads.js';
import googleApis from '../integrations/google-apis.js';

const router = express.Router();

/**
 * GET /api/ads/overview
 * Get unified ads performance across all platforms
 */
router.get('/overview', async (req, res) => {
  try {
    const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate = new Date().toISOString().split('T')[0] } = req.query;

    // Use Promise.allSettled to handle individual API failures gracefully
    const results = await Promise.allSettled([
      googleApis.getGoogleAdsCampaigns(),
      facebookAds.getCampaigns(startDate, endDate),
      facebookAds.getAccountInsights(startDate, endDate)
    ]);

    const googleData = results[0].status === 'fulfilled' ? results[0].value : { summary: {}, campaigns: [] };
    const facebookCampaigns = results[1].status === 'fulfilled' ? results[1].value : [];
    const facebookInsights = results[2].status === 'fulfilled' ? results[2].value : {};

    // Log any errors for debugging
    if (results[0].status === 'rejected') console.warn('Google Ads API failed:', results[0].reason?.message);
    if (results[1].status === 'rejected') console.warn('Facebook Campaigns API failed:', results[1].reason?.message);
    if (results[2].status === 'rejected') console.warn('Facebook Insights API failed:', results[2].reason?.message);

    const unified = {
      summary: {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        averageCpc: 0,
        averageCtr: 0,
        totalROAS: 0,
        costPerLead: 0
      },
      byPlatform: {
        googleAds: googleData.summary || {},
        facebookAds: facebookAds.calculateMetrics(facebookInsights)
      },
      campaigns: [...(googleData.campaigns || []), ...facebookCampaigns],
      recommendations: generateAdRecommendations(googleData, facebookCampaigns, facebookInsights)
    };

    // Calculate combined metrics
    const allCampaigns = [...(googleData.campaigns || []), ...facebookCampaigns];
    if (allCampaigns.length > 0) {
      unified.summary.totalSpend = allCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      unified.summary.totalImpressions = allCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
      unified.summary.totalClicks = allCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      unified.summary.totalConversions = allCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
      unified.summary.averageCpc = unified.summary.totalClicks > 0 ? unified.summary.totalSpend / unified.summary.totalClicks : 0;
      unified.summary.averageCtr = unified.summary.totalImpressions > 0 ? (unified.summary.totalClicks / unified.summary.totalImpressions * 100) : 0;
      unified.summary.costPerLead = unified.summary.totalConversions > 0 ? unified.summary.totalSpend / unified.summary.totalConversions : 0;
    }

    res.json({
      overview: unified,
      dateRange: { startDate, endDate },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching ads overview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/google
 * Get Google Ads performance
 */
router.get('/google', async (req, res) => {
  try {
    const googleData = await googleApis.getGoogleAdsCampaigns();

    res.json({
      platform: 'Google Ads',
      data: googleData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Google ads:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/facebook
 * Get Facebook Ads performance
 */
router.get('/facebook', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [campaigns, adsets, insights] = await Promise.all([
      facebookAds.getCampaigns(startDate, endDate),
      facebookAds.getAdSets(null, startDate, endDate),
      facebookAds.getAccountInsights(startDate, endDate)
    ]);

    res.json({
      platform: 'Facebook Ads',
      campaigns,
      adsets,
      accountInsights: insights,
      metrics: facebookAds.calculateMetrics(insights),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Facebook ads:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/campaigns
 * Get all campaigns with filtering
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { type = 'all', status = 'all' } = req.query;

    const [googleData, facebookCampaigns] = await Promise.all([
      googleApis.getGoogleAdsCampaigns(),
      facebookAds.getCampaigns()
    ]);

    let campaigns = [
      ...(googleData.campaigns || []).map(c => ({ ...c, platform: 'Google Ads' })),
      ...facebookCampaigns.map(c => ({ ...c, platform: 'Facebook Ads' }))
    ];

    if (type !== 'all') {
      campaigns = campaigns.filter(c => c.objective === type || c.type === type);
    }

    if (status !== 'all') {
      campaigns = campaigns.filter(c => c.status === status);
    }

    // Sort by spend descending
    campaigns.sort((a, b) => (b.spend || 0) - (a.spend || 0));

    res.json({
      campaigns,
      count: campaigns.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/roi
 * Get ROI analysis
 */
router.get('/roi', async (req, res) => {
  try {
    const { startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } = req.query;

    const [googleData, facebookInsights] = await Promise.all([
      googleApis.getGoogleAdsCampaigns(),
      facebookAds.getAccountInsights(startDate)
    ]);

    const roiAnalysis = {
      byPlatform: {
        googleAds: {
          spend: googleData.summary?.totalSpend || 0,
          conversions: googleData.summary?.totalConversions || 0,
          conversionValue: googleData.summary?.totalConversions * 95 || 0, // Assume $95 avg value
          roi: 0
        },
        facebookAds: {
          spend: parseFloat(facebookInsights.spend || 0),
          conversions: facebookAds.getLeadCount(facebookInsights.actions || []),
          conversionValue: facebookAds.getLeadCount(facebookInsights.actions || []) * 95,
          roi: 0
        }
      },
      topPerformers: [],
      lowPerformers: []
    };

    // Calculate ROI
    Object.keys(roiAnalysis.byPlatform).forEach(platform => {
      const data = roiAnalysis.byPlatform[platform];
      data.roi = data.spend > 0 ? ((data.conversionValue - data.spend) / data.spend * 100).toFixed(2) : 0;
    });

    res.json({
      roiAnalysis,
      period: startDate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching ROI analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/recommendations
 * Get AI recommendations for ads
 */
router.get('/recommendations', async (req, res) => {
  try {
    const [googleData, facebookCampaigns, facebookInsights] = await Promise.all([
      googleApis.getGoogleAdsCampaigns(),
      facebookAds.getCampaigns(),
      facebookAds.getAccountInsights()
    ]);

    const recommendations = generateAdRecommendations(googleData, facebookCampaigns, facebookInsights);

    res.json({
      recommendations: recommendations.slice(0, 10), // Top 10
      total: recommendations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate AI recommendations for ads optimization
 */
function generateAdRecommendations(googleData, facebookCampaigns, facebookInsights) {
  const recommendations = [];

  // Google Ads recommendations
  if (googleData.campaigns) {
    googleData.campaigns.forEach(campaign => {
      if (campaign.costPerLead > 50) {
        recommendations.push({
          type: 'COST_PER_LEAD_HIGH',
          campaign: campaign.name,
          platform: 'Google Ads',
          severity: 'high',
          message: `Cost per lead is $${campaign.costPerLead.toFixed(2)}, consider optimizing targeting or bid strategy`,
          action: 'Review audience targeting and bid strategy',
          estimatedImpact: 'Could reduce CPA by 15-25%'
        });
      }
    });
  }

  // Facebook Ads recommendations
  if (facebookInsights.spend && facebookInsights.spend > 1000) {
    const facebookMetrics = facebookAds.calculateMetrics(facebookInsights);

    if (facebookMetrics.costPerLead > 40) {
      recommendations.push({
        type: 'FACEBOOK_CPA_HIGH',
        platform: 'Facebook Ads',
        severity: 'medium',
        message: `Facebook cost per lead is $${facebookMetrics.costPerLead.toFixed(2)}`,
        action: 'Test new ad creative or audience segments',
        estimatedImpact: 'Could improve conversion rate by 10-20%'
      });
    }
  }

  // Budget recommendations
  const totalSpend = (googleData.summary?.totalSpend || 0) + (parseFloat(facebookInsights.spend || 0));
  if (totalSpend < 1000) {
    recommendations.push({
      type: 'LOW_BUDGET',
      severity: 'medium',
      message: 'Total ad spend is below $1000/month',
      action: 'Consider increasing budget to improve learning phase and data collection',
      estimatedImpact: 'Better algorithm optimization and more lead volume'
    });
  }

  // Seasonal recommendations
  const month = new Date().getMonth();
  if (month === 2 || month === 3) { // Spring (March, April)
    recommendations.push({
      type: 'SEASONAL_OPPORTUNITY',
      severity: 'low',
      message: 'Spring cleanup season is here',
      action: 'Increase budget for spring cleanup campaigns by 25-40%',
      estimatedImpact: 'Capture seasonal demand surge'
    });
  }

  return recommendations;
}

export default router;
