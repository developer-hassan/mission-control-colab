import express from 'express';
import openclawAgents from '../integrations/openclaw-agents.js';
import googleApis from '../integrations/google-apis.js';
import facebookAds from '../integrations/facebook-ads.js';

const router = express.Router();

/**
 * GET /api/overview
 * Get executive dashboard overview
 */
router.get('/', async (req, res) => {
  try {
    // Use Promise.allSettled to handle individual API failures gracefully
    const results = await Promise.allSettled([
      openclawAgents.getAgents(),
      googleApis.getGoogleAdsCampaigns(),
      facebookAds.getAccountInsights()
    ]);

    // Extract results, using defaults if any fail
    const agents = results[0].status === 'fulfilled' ? results[0].value : [];
    const googleData = results[1].status === 'fulfilled' ? results[1].value : {};
    const facebookInsights = results[2].status === 'fulfilled' ? results[2].value : {};

    // Log any errors for debugging
    if (results[0].status === 'rejected') console.warn('Agents API failed:', results[0].reason?.message);
    if (results[1].status === 'rejected') console.warn('Google APIs failed:', results[1].reason?.message);
    if (results[2].status === 'rejected') console.warn('Facebook Ads API failed:', results[2].reason?.message);

    const overview = {
      revenue: {
        today: 1245.50,
        mtd: 18923.75,
        projected: 24500,
        recurring: 14230
      },
      customers: {
        active: 187,
        new: 12,
        lost: 3,
        netGrowth: 9
      },
      jobs: {
        completedToday: 8,
        scheduledThisWeek: 34,
        missedDelayed: 1
      },
      leads: {
        open: 47,
        needingFollowup: 8,
        quotesOut: 12,
        closureRate: 25.5
      },
      reviews: {
        count: 85,
        rating: 4.8,
        thisMonth: 7
      },
      ads: {
        totalSpend: (googleData.summary?.totalSpend || 0) + (parseFloat(facebookInsights.spend || 0) || 0),
        costPerLead: 32.45,
        costPerBooking: 145.80
      },
      automations: {
        healthScore: agents.length > 0 ? await openclawAgents.getAgentHealthScore() : { score: 75 },
        activeAgents: agents.filter(a => a.status === 'active').length,
        failedAgents: agents.filter(a => a.status === 'failed').length
      }
    };

    // Calculate status indicators
    const indicators = {
      revenue: overview.revenue.mtd >= 15000 ? 'green' : overview.revenue.mtd >= 10000 ? 'yellow' : 'red',
      customerGrowth: overview.customers.netGrowth >= 5 ? 'green' : overview.customers.netGrowth >= 0 ? 'yellow' : 'red',
      leadFlow: overview.leads.needingFollowup <= 5 ? 'green' : overview.leads.needingFollowup <= 10 ? 'yellow' : 'red',
      adEfficiency: overview.ads.costPerBooking <= 150 ? 'green' : overview.ads.costPerBooking <= 200 ? 'yellow' : 'red',
      automationHealth: overview.automations.healthScore?.score >= 80 ? 'green' : overview.automations.healthScore?.score >= 60 ? 'yellow' : 'red'
    };

    res.json({
      overview,
      indicators,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/overview/kpis
 * Get key performance indicators
 */
router.get('/kpis', async (req, res) => {
  try {
    const kpis = {
      revenue: {
        label: 'MTD Revenue',
        value: '$18,923.75',
        target: '$20,000',
        percentageOfTarget: 94.6,
        trend: '+12.3%'
      },
      customerAcquisition: {
        label: 'New Customers',
        value: '12',
        target: '15',
        percentageOfTarget: 80,
        trend: '+8.5%'
      },
      conversionRate: {
        label: 'Lead Conversion',
        value: '25.5%',
        target: '30%',
        percentageOfTarget: 85,
        trend: '+2.1%'
      },
      customerRetention: {
        label: 'Retention Rate',
        value: '94.2%',
        target: '95%',
        percentageOfTarget: 99.2,
        trend: '-0.3%'
      },
      adROAS: {
        label: 'Ad ROAS',
        value: '3.24x',
        target: '3.5x',
        percentageOfTarget: 92.6,
        trend: '+0.45x'
      }
    };

    res.json({
      kpis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/overview/tasks
 * Get top tasks for the day
 */
router.get('/tasks', (req, res) => {
  const tasks = [
    {
      priority: 1,
      title: 'Follow up on 2 high-value quotes',
      impact: 'Could close ~$2,800 in revenue',
      deadline: 'Today'
    },
    {
      priority: 2,
      title: 'Review failed Jobber sync agent',
      impact: 'Currently blocking 47 queued items',
      deadline: 'Today'
    },
    {
      priority: 3,
      title: 'Check low-performing Google Ads campaign',
      impact: 'Cost per lead is 40% above target',
      deadline: 'This Week'
    },
    {
      priority: 4,
      title: 'Respond to 3 new leads from Facebook',
      impact: 'Each lead has ~$150 potential value',
      deadline: 'Today'
    },
    {
      priority: 5,
      title: 'Review Q2 seasonal campaign performance',
      impact: 'Plan Q3 promotions',
      deadline: 'This Week'
    }
  ];

  res.json({
    tasks,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/overview/alerts
 * Get system alerts and warnings
 */
router.get('/alerts', async (req, res) => {
  try {
    const agentIssues = await openclawAgents.getAgentIssues();

    const alerts = [
      ...(agentIssues.length > 0 ? [{
        type: 'AGENT_FAILURE',
        severity: 'critical',
        message: `${agentIssues.filter(i => i.type === 'FAILED').length} agents have failed`,
        count: agentIssues.filter(i => i.type === 'FAILED').length
      }] : []),
      {
        type: 'QUOTE_FOLLOWUP',
        severity: 'high',
        message: '3 quotes have not been followed up in 48 hours',
        count: 3
      },
      {
        type: 'LOW_LEAD_RESPONSE',
        severity: 'medium',
        message: 'Average lead response time is 3.5 hours (target: 2 hours)',
        count: 1
      }
    ];

    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
