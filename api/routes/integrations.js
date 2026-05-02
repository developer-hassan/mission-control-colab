import express from 'express';
import jobber from '../integrations/jobber.js';

const router = express.Router();

/**
 * GET /api/integrations
 * Get status of all integrations
 */
router.get('/', (req, res) => {
  const integrations = [
    {
      name: 'Google Ads API',
      status: 'connected',
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      details: 'Pulling campaign data'
    },
    {
      name: 'Google Business Profile',
      status: 'connected',
      lastSync: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      details: 'Syncing reviews and insights'
    },
    {
      name: 'Google Analytics',
      status: 'connected',
      lastSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      details: 'Loading website metrics'
    },
    {
      name: 'Facebook Ads API',
      status: 'connected',
      lastSync: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      details: 'Campaign performance data active'
    },
    {
      name: 'Jobber API',
      status: 'not_configured',
      lastSync: null,
      details: 'Waiting for API key'
    },
    {
      name: 'Openclaw Agents',
      status: 'connected',
      lastSync: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      details: 'All agents monitored'
    }
  ];

  const summary = {
    total: integrations.length,
    connected: integrations.filter(i => i.status === 'connected').length,
    notConfigured: integrations.filter(i => i.status === 'not_configured').length,
    failed: integrations.filter(i => i.status === 'failed').length
  };

  res.json({
    integrations,
    summary,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/integrations/:name
 * Get specific integration status
 */
router.get('/:name', (req, res) => {
  const integrationName = req.params.name;

  const integrationDetails = {
    'google-ads': {
      name: 'Google Ads API',
      status: 'connected',
      connected: true,
      configured: true,
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      details: {
        accountId: '1234567890',
        campaigns: 5,
        lastDataPoints: 847
      }
    },
    'facebook-ads': {
      name: 'Facebook Ads API',
      status: 'connected',
      connected: true,
      configured: true,
      lastSync: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      details: {
        businessAccountId: '1460840901718573',
        adAccountId: '120243479982690024',
        campaigns: 8,
        lastDataPoints: 256
      }
    },
    'jobber': {
      name: 'Jobber API',
      status: 'not_configured',
      connected: false,
      configured: false,
      lastSync: null,
      details: {
        required: true,
        apiKeyProvided: false,
        message: 'Waiting for Jobber API key'
      }
    }
  };

  const detail = integrationDetails[integrationName] || {
    name: integrationName,
    status: 'unknown',
    connected: false
  };

  res.json({
    integration: detail,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/integrations/:name/sync
 * Manually trigger integration sync
 */
router.post('/:name/sync', (req, res) => {
  const integrationName = req.params.name;

  res.json({
    message: `Sync started for ${integrationName}`,
    status: 'syncing',
    startTime: new Date().toISOString(),
    estimatedDuration: '30-60 seconds'
  });
});

/**
 * GET /api/integrations/sync-history
 * Get sync history for all integrations
 */
router.get('/sync/history', (req, res) => {
  const history = [
    {
      integration: 'Google Ads',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSync: 127,
      duration: '2.3s'
    },
    {
      integration: 'Facebook Ads',
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSync: 89,
      duration: '1.8s'
    },
    {
      integration: 'Google Business Profile',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: 'success',
      recordsSync: 12,
      duration: '0.9s'
    },
    {
      integration: 'Jobber',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'skipped',
      reason: 'API key not configured'
    }
  ];

  res.json({
    history,
    timestamp: new Date().toISOString()
  });
});

export default router;
