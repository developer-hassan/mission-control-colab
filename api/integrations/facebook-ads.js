import axios from 'axios';
import { credentials } from '../../config/credentials.js';

const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_API_BASE = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

class FacebookAdsIntegration {
  constructor() {
    this.accessToken = credentials.facebook.accessToken;
    this.businessAccountId = credentials.facebook.businessAccountId;
    this.adAccountId = credentials.facebook.adAccountId;
    this.adAccountPath = `act_${this.adAccountId}`;
  }

  /**
   * Get campaigns with performance metrics
   */
  async getCampaigns(dateFrom = null, dateTo = null) {
    try {
      const params = {
        fields: [
          'id',
          'name',
          'status',
          'objective',
          'daily_budget',
          'budget_remaining',
          'start_time',
          'stop_time',
          'insights{spend,impressions,clicks,ctr,cpp,cpc,cpm,actions,action_values}'
        ].join(','),
        access_token: this.accessToken,
        limit: 100
      };

      // Facebook doesn't support 'custom' date_preset, use 'last_30d' instead
      params.date_preset = 'last_30d';

      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${this.adAccountPath}/campaigns`,
        { params }
      );

      return this.transformCampaignData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching Facebook campaigns:', error.message);
      console.error('Full Error:', JSON.stringify({
        status: error.response?.status,
        data: error.response?.data,
        config: { url: error.config?.url }
      }, null, 2));
      throw error;
    }
  }

  /**
   * Get ad sets with performance data
   */
  async getAdSets(campaignId = null, dateFrom = null, dateTo = null) {
    try {
      let url = `${FACEBOOK_API_BASE}/${this.adAccountPath}/adsets`;

      if (campaignId) {
        url = `${FACEBOOK_API_BASE}/${campaignId}/adsets`;
      }

      const params = {
        fields: [
          'id',
          'name',
          'campaign_id',
          'status',
          'daily_budget',
          'insights{spend,impressions,clicks,ctr,cpp,cpc,cpm,actions,action_values}'
        ].join(','),
        access_token: this.accessToken,
        limit: 100
      };

      if (dateFrom && dateTo) {
        params.date_preset = 'custom';
        params.time_range = JSON.stringify({
          since: dateFrom,
          until: dateTo
        });
      }

      const response = await axios.get(url, { params });
      return this.transformAdSetData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching Facebook ad sets:', error.message);
      throw error;
    }
  }

  /**
   * Get ads with performance data
   */
  async getAds(adSetId = null, dateFrom = null, dateTo = null) {
    try {
      let url = `${FACEBOOK_API_BASE}/${this.adAccountPath}/ads`;

      if (adSetId) {
        url = `${FACEBOOK_API_BASE}/${adSetId}/ads`;
      }

      const params = {
        fields: [
          'id',
          'name',
          'adset_id',
          'status',
          'creative{id,body,title,image_url}',
          'insights{spend,impressions,clicks,ctr,cpp,cpc,cpm,actions,action_values,lead_gen_by_click_leads}'
        ].join(','),
        access_token: this.accessToken,
        limit: 100
      };

      if (dateFrom && dateTo) {
        params.date_preset = 'custom';
        params.time_range = JSON.stringify({
          since: dateFrom,
          until: dateTo
        });
      }

      const response = await axios.get(url, { params });
      return this.transformAdData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching Facebook ads:', error.message);
      throw error;
    }
  }

  /**
   * Get leads from Lead Gen Ads
   */
  async getLeads(formId, dateFrom = null, dateTo = null) {
    try {
      const params = {
        fields: [
          'id',
          'created_time',
          'field_data',
          'ad_id',
          'adset_id',
          'campaign_id'
        ].join(','),
        access_token: this.accessToken,
        limit: 100
      };

      if (dateFrom && dateTo) {
        params.filtering = JSON.stringify([
          {
            field: 'created_time',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: Math.floor(new Date(dateFrom).getTime() / 1000)
          },
          {
            field: 'created_time',
            operator: 'LESS_THAN_OR_EQUAL',
            value: Math.floor(new Date(dateTo).getTime() / 1000)
          }
        ]);
      }

      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${formId}/leads`,
        { params }
      );

      return this.transformLeadData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching Facebook leads:', error.message);
      throw error;
    }
  }

  /**
   * Get account insights
   */
  async getAccountInsights(dateFrom = null, dateTo = null) {
    try {
      const params = {
        fields: [
          'spend',
          'impressions',
          'clicks',
          'ctr',
          'cpp',
          'cpc',
          'cpm',
          'actions',
          'action_values',
          'conversion_rate_ranking',
          'quality_ranking'
        ].join(','),
        access_token: this.accessToken
      };

      // Facebook doesn't support 'custom' date_preset, use 'last_30d' instead
      params.date_preset = 'last_30d';

      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${this.adAccountPath}/insights`,
        { params }
      );

      return response.data.data?.[0] || {};
    } catch (error) {
      console.error('Error fetching Facebook account insights:', error.message);
      console.error('Full Error:', JSON.stringify({
        status: error.response?.status,
        data: error.response?.data,
        config: { url: error.config?.url }
      }, null, 2));
      throw error;
    }
  }

  // Transform methods
  transformCampaignData(campaigns) {
    return campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      budget: c.daily_budget,
      budgetRemaining: c.budget_remaining,
      startTime: c.start_time,
      stopTime: c.stop_time,
      insights: c.insights ? c.insights.data?.[0] : null
    }));
  }

  transformAdSetData(adSets) {
    return adSets.map(a => ({
      id: a.id,
      name: a.name,
      campaignId: a.campaign_id,
      status: a.status,
      budget: a.daily_budget,
      insights: a.insights ? a.insights.data?.[0] : null
    }));
  }

  transformAdData(ads) {
    return ads.map(a => ({
      id: a.id,
      name: a.name,
      adSetId: a.adset_id,
      status: a.status,
      creative: a.creative,
      insights: a.insights ? a.insights.data?.[0] : null
    }));
  }

  transformLeadData(leads) {
    return leads.map(l => ({
      id: l.id,
      createdTime: l.created_time,
      fieldData: l.field_data || [],
      adId: l.ad_id,
      adSetId: l.adset_id,
      campaignId: l.campaign_id
    }));
  }

  /**
   * Calculate derived metrics
   */
  calculateMetrics(insights) {
    if (!insights) return {};

    const spend = parseFloat(insights.spend || 0);
    const leads = this.getLeadCount(insights.actions || []);
    const clicks = parseInt(insights.clicks || 0);

    return {
      spend,
      impressions: parseInt(insights.impressions || 0),
      clicks,
      ctr: parseFloat(insights.ctr || 0),
      cpc: parseFloat(insights.cpc || 0),
      cpm: parseFloat(insights.cpm || 0),
      leads,
      costPerLead: leads > 0 ? spend / leads : 0,
      roas: insights.action_values ? parseFloat(insights.action_values[0]?.value || 0) / spend : 0
    };
  }

  getLeadCount(actions) {
    if (!actions || !Array.isArray(actions)) return 0;
    const leadAction = actions.find(a => a.action_type === 'lead');
    return leadAction ? parseInt(leadAction.value || 0) : 0;
  }
}

export default new FacebookAdsIntegration();
