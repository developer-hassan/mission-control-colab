import express from 'express';
import crypto from 'crypto';
import jobber from '../integrations/jobber.js';

const router = express.Router();

// Jobber webhook configuration
const JOBBER_API_SECRET = process.env.JOBBER_API_SECRET || '';
const WEBHOOK_EVENTS = [];

/**
 * Verify Jobber webhook signature
 * Jobber uses HMAC-SHA256 for webhook signature verification
 */
function verifyJobberSignature(rawBody, signature) {
  if (!JOBBER_API_SECRET) {
    console.warn('JOBBER_API_SECRET not configured, skipping signature verification');
    return true;
  }

  try {
    const hash = crypto
      .createHmac('sha256', JOBBER_API_SECRET)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * GET /api/jobber/status
 * Check Jobber connection status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await jobber.validateConnection();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobber/jobs
 * Get jobs from Jobber
 */
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await jobber.getJobs();
    res.json({ jobs, count: jobs.length, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobber/clients
 * Get clients from Jobber
 */
router.get('/clients', async (req, res) => {
  try {
    const clients = await jobber.getClients();
    res.json({ clients, count: clients.length, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobber/revenue
 * Get revenue data from Jobber
 */
router.get('/revenue', async (req, res) => {
  try {
    const revenue = await jobber.getRevenue();
    console.log('[DEBUG] Revenue data:', revenue);
    res.json({ revenue, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[DEBUG] Revenue fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobber/debug
 * Debug endpoint to see raw Jobber API response
 */
router.get('/debug', async (req, res) => {
  try {
    console.log('[DEBUG] Fetching debug data...');

    const jobs = await jobber.getJobs();
    const clients = await jobber.getClients();
    const revenue = await jobber.getRevenue();

    res.json({
      jobs: {
        count: jobs ? jobs.length : 0,
        sample: jobs ? jobs.slice(0, 2) : null
      },
      clients: {
        count: clients ? clients.length : 0,
        sample: clients ? clients.slice(0, 2) : null
      },
      revenue: revenue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * GET /api/jobber/schedule
 * Get schedule from Jobber
 */
router.get('/schedule', async (req, res) => {
  try {
    const start = req.query.start || new Date().toISOString();
    const end = req.query.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const schedule = await jobber.getSchedule(start, end);
    res.json({ schedule, count: schedule.length, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/jobber/webhook
 * Receives webhook events from Jobber
 * This endpoint is called by Jobber when events occur in their system
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Get the raw body and signature
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-jobber-signature'] || req.headers['x-signature'];

    // Verify webhook signature
    if (signature && !verifyJobberSignature(rawBody, signature)) {
      console.warn('Invalid Jobber webhook signature received');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the webhook data
    const webhookData = typeof req.body === 'string' ? JSON.parse(rawBody) : req.body;
    const eventType = webhookData.event?.type || webhookData.type;

    console.log(`[Jobber Webhook] Received: ${eventType}`, {
      timestamp: new Date().toISOString(),
      dataKeys: Object.keys(webhookData)
    });

    // Store webhook event
    WEBHOOK_EVENTS.push({
      eventType,
      timestamp: new Date().toISOString(),
      data: webhookData,
      processed: false
    });

    // Keep only last 100 events in memory
    if (WEBHOOK_EVENTS.length > 100) {
      WEBHOOK_EVENTS.shift();
    }

    // Process webhook based on event type
    if (eventType === 'client.created' || eventType === 'client.updated') {
      console.log('Processing client event:', webhookData.data?.id);
    } else if (eventType === 'job.created' || eventType === 'job.updated' || eventType === 'job.completed') {
      console.log('Processing job event:', webhookData.data?.id);
    } else if (eventType === 'request.created' || eventType === 'request.updated') {
      console.log('Processing request/quote event:', webhookData.data?.id);
    }

    // Mark event as processed
    const lastEvent = WEBHOOK_EVENTS[WEBHOOK_EVENTS.length - 1];
    if (lastEvent) {
      lastEvent.processed = true;
    }

    // Respond with success
    res.status(200).json({
      success: true,
      message: 'Webhook received and processed',
      eventType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Jobber Webhook] Error processing webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

/**
 * GET /api/jobber/webhooks
 * Get recent webhook events (for debugging)
 */
router.get('/webhooks', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const recent = WEBHOOK_EVENTS.slice(-limit);

  res.json({
    total: WEBHOOK_EVENTS.length,
    returned: recent.length,
    events: recent
  });
});

/**
 * GET /api/jobber/dashboard
 * Get comprehensive Jobber dashboard data for operations overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [clients, jobs, revenue, schedule] = await Promise.all([
      jobber.getClients(),
      jobber.getJobs(),
      jobber.getRevenue(),
      jobber.getSchedule(
        new Date().toISOString(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      )
    ]);

    // Calculate dashboard metrics
    const dashboardData = calculateDashboardMetrics(clients, jobs, revenue, schedule);

    res.json(dashboardData);
  } catch (error) {
    console.error('Error getting Jobber dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * Calculate comprehensive dashboard metrics from Jobber data
 */
function calculateDashboardMetrics(clients, jobs, revenue, schedule) {
  // Customer Metrics
  const totalCustomers = clients ? clients.length : 0;
  const activeCustomers = clients ? clients.filter(c => c.activeServices && c.activeServices.length > 0).length : 0;

  // Service Frequency Breakdown
  const serviceFrequency = {
    weekly: 0,
    biweekly: 0,
    monthly: 0,
    quarterly: 0,
    oneTime: 0
  };

  if (clients) {
    clients.forEach(client => {
      if (client.activeServices && client.activeServices.length > 0) {
        client.activeServices.forEach(service => {
          const freq = service.frequency?.toLowerCase() || 'oneTime';
          if (serviceFrequency[freq] !== undefined) {
            serviceFrequency[freq]++;
          }
        });
      }
    });
  }

  // Job Status Breakdown
  const jobStatusBreakdown = {
    scheduled: 0,
    inProgress: 0,
    complete: 0,
    cancelled: 0
  };

  if (jobs) {
    jobs.forEach(job => {
      const status = job.status?.toUpperCase() || 'SCHEDULED';
      if (status === 'SCHEDULED') jobStatusBreakdown.scheduled++;
      else if (status === 'IN_PROGRESS') jobStatusBreakdown.inProgress++;
      else if (status === 'COMPLETE') jobStatusBreakdown.complete++;
      else if (status === 'CANCELLED') jobStatusBreakdown.cancelled++;
    });
  }

  // This Week's Jobs (Routes)
  const thisWeekJobs = schedule ? schedule.filter(job => {
    const jobDate = new Date(job.startDate);
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return jobDate <= weekFromNow;
  }) : [];

  // Routes by day of week
  const routesByDay = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0
  };

  thisWeekJobs.forEach(job => {
    const date = new Date(job.startDate);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    if (routesByDay[dayName] !== undefined) {
      routesByDay[dayName]++;
    }
  });

  // Revenue Analytics
  const totalRevenue = revenue?.totalRevenue || 0;
  const avgJobValue = revenue?.averageJobValue || 0;
  const recurringRevenue = revenue?.recurringRevenue || 0;
  const jobCount = revenue?.jobCount || 0;

  // Weekly projection (based on active recurring customers)
  const weeklyRevenue = activeCustomers > 0 ? (recurringRevenue / 4) : 0;

  // Recent completed jobs
  const recentJobs = jobs ?
    jobs.filter(j => j.status?.toUpperCase() === 'COMPLETE')
        .sort((a, b) => new Date(b.completedAt || b.startDate) - new Date(a.completedAt || a.startDate))
        .slice(0, 5) : [];

  return {
    timestamp: new Date().toISOString(),
    customers: {
      total: totalCustomers,
      active: activeCustomers,
      inactive: totalCustomers - activeCustomers,
      percentage: totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : 0
    },
    services: serviceFrequency,
    revenue: {
      thisMonth: totalRevenue.toFixed(2),
      weekly: weeklyRevenue.toFixed(2),
      avgJobValue: avgJobValue.toFixed(2),
      totalJobsCompleted: jobCount
    },
    jobs: {
      scheduled: jobStatusBreakdown.scheduled,
      inProgress: jobStatusBreakdown.inProgress,
      completed: jobStatusBreakdown.complete,
      cancelled: jobStatusBreakdown.cancelled,
      thisWeek: thisWeekJobs.length
    },
    schedule: {
      thisWeek: thisWeekJobs.length,
      routesByDay: routesByDay,
      upcomingJobs: thisWeekJobs.slice(0, 10)
    },
    recentJobs: recentJobs.map(job => ({
      id: job.id,
      title: job.title,
      clientName: job.client?.name || 'Unknown',
      status: job.status,
      date: job.completedAt || job.startDate,
      revenue: job.revenue || 0
    }))
  };
}

export default router;
