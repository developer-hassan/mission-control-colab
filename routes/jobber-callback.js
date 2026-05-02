// Jobber Webhook Callback Handler
// This route receives and processes webhooks from Jobber's webhook system
// Location: https://scoopychatt.com/api/jobber/callback

import crypto from 'crypto';
import express from 'express';

const router = express.Router();

// Jobber API credentials
const JOBBER_API_SECRET = process.env.JOBBER_API_SECRET || 'd22d40c17e5ddf5f73ec4e7580510710b3763443face80d0d8b3807553185309';
const MISSION_CONTROL_API_KEY = process.env.MISSION_CONTROL_API_KEY || 'mission-control-secret-key';

/**
 * Verify Jobber webhook signature
 * Jobber sends an X-Jobber-Signature header with HMAC-SHA256
 */
function verifyJobberSignature(payload, signature) {
  const hash = crypto
    .createHmac('sha256', JOBBER_API_SECRET)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

/**
 * POST /api/jobber/callback
 * Receives webhook events from Jobber
 */
router.post('/callback', (req, res) => {
  try {
    // Get the raw body as string (important for signature verification)
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-jobber-signature'];

    // Verify the webhook signature
    if (!signature || !verifyJobberSignature(rawBody, signature)) {
      console.warn('Invalid Jobber webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const webhookData = req.body;
    const eventType = webhookData.event?.type || webhookData.type;

    console.log(`Received Jobber webhook: ${eventType}`, {
      timestamp: new Date().toISOString(),
      eventType,
      dataKeys: Object.keys(webhookData)
    });

    // Process different event types
    switch (eventType) {
      case 'client.created':
      case 'client.updated':
        handleClientEvent(webhookData);
        break;

      case 'job.created':
      case 'job.updated':
      case 'job.completed':
        handleJobEvent(webhookData);
        break;

      case 'request.created':
      case 'request.updated':
        handleRequestEvent(webhookData);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      eventType
    });

  } catch (error) {
    console.error('Error processing Jobber webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle client-related events
 */
function handleClientEvent(data) {
  const event = data.event || data;
  const client = event.data || data.data;

  console.log('Processing client event:', {
    id: client?.id,
    name: client?.firstName + ' ' + client?.lastName,
    email: client?.email,
    phone: client?.phone
  });

  // Send to Mission Control API
  forwardToMissionControl('client', event.type, client);
}

/**
 * Handle job-related events
 */
function handleJobEvent(data) {
  const event = data.event || data;
  const job = event.data || data.data;

  console.log('Processing job event:', {
    id: job?.id,
    title: job?.title,
    status: job?.status,
    client: job?.clientId
  });

  // Send to Mission Control API
  forwardToMissionControl('job', event.type, job);
}

/**
 * Handle request/quote-related events
 */
function handleRequestEvent(data) {
  const event = data.event || data;
  const request = event.data || data.data;

  console.log('Processing request event:', {
    id: request?.id,
    type: request?.type,
    status: request?.status,
    client: request?.clientId,
    value: request?.totalPrice
  });

  // Send to Mission Control API
  forwardToMissionControl('request', event.type, request);
}

/**
 * Forward webhook data to Mission Control API
 */
async function forwardToMissionControl(entityType, eventType, data) {
  try {
    const missionControlUrl = process.env.MISSION_CONTROL_URL || 'http://localhost:4173';
    const endpoint = `${missionControlUrl}/api/webhooks/jobber`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MISSION_CONTROL_API_KEY
      },
      body: JSON.stringify({
        source: 'jobber',
        entityType,
        eventType,
        timestamp: new Date().toISOString(),
        data
      })
    });

    if (!response.ok) {
      console.error(`Failed to forward to Mission Control: ${response.status}`, {
        entityType,
        eventType
      });
    }
  } catch (error) {
    console.error('Error forwarding to Mission Control:', error);
    // Don't throw - webhook processing should still be considered successful
  }
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'jobber-webhook' });
});

export default router;
