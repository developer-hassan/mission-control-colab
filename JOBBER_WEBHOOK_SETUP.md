# Jobber Webhook Integration Setup

This guide explains how to set up the Jobber webhook callback for Mission Control.

## Overview

The webhook integration allows Jobber to send real-time notifications when events occur (client created, job updated, etc.) to your Mission Control dashboard.

## Configuration

### 1. Environment Variables

First, make sure your `.env` file has the Jobber credentials configured:

```bash
JOBBER_API_KEY=798770aa-46d0-4651-8b7f-dcf2cc269e9f
JOBBER_API_SECRET=d22d40c17e5ddf5f73ec4e7580510710b3763443face80d0d8b3807553185309
JOBBER_ACCOUNT_ID=your-account-id  # Optional, derived from API Key
```

### 2. Webhook Endpoint

Your webhook endpoint is now available at:

```
https://scoopychatt.com/api/jobber/webhook
```

Or from localhost during development:

```
http://localhost:4173/api/jobber/webhook
```

### 3. Setting Up the Webhook in Jobber

1. **Log in to Jobber Developer Portal**
   - Go to https://developer.getjobber.com
   - Navigate to your app's settings

2. **Configure Webhook URL**
   - Find the Webhooks section
   - Add a new webhook URL: `https://scoopychatt.com/api/jobber/webhook`

3. **Select Event Types** (choose the ones you want to track)
   - `client.created` - When a new client is created
   - `client.updated` - When a client is updated
   - `job.created` - When a new job is created
   - `job.updated` - When a job is updated
   - `job.completed` - When a job is completed
   - `request.created` - When a quote/request is created
   - `request.updated` - When a quote/request is updated

4. **Verify Signature (Optional but Recommended)**
   - Jobber will send an `X-Jobber-Signature` header with each webhook
   - The signature is HMAC-SHA256 using your API Secret
   - Mission Control automatically verifies signatures

5. **Save and Test**
   - Save the webhook configuration
   - Use Jobber's test feature to send a test event
   - Check your Mission Control logs to verify receipt

## Webhook Processing

### How It Works

1. **Webhook Receipt**: When Jobber sends a webhook, it includes:
   - Event type (e.g., `job.created`)
   - Entity data (job details, client info, etc.)
   - Signature for verification

2. **Verification**: Mission Control verifies the signature using HMAC-SHA256

3. **Processing**: Events are stored in memory and can be retrieved via:
   ```
   GET /api/jobber/webhooks?limit=20
   ```

4. **Real-time Updates**: The dashboard can poll this endpoint to get real-time updates

### API Endpoints

#### Receive Webhook (Called by Jobber)
```
POST /api/jobber/webhook

Headers:
  X-Jobber-Signature: <HMAC-SHA256 signature>

Body:
{
  "event": {
    "type": "job.created",
    "data": {
      "id": "job-id",
      "title": "Job Title",
      "status": "pending",
      "clientId": "client-id",
      ...
    }
  }
}
```

#### Get Recent Webhooks (For Debugging)
```
GET /api/jobber/webhooks?limit=20

Response:
{
  "total": 50,
  "returned": 20,
  "events": [
    {
      "eventType": "job.created",
      "timestamp": "2026-04-26T...",
      "data": {...},
      "processed": true
    },
    ...
  ]
}
```

#### Get Jobber Status
```
GET /api/jobber/status

Response:
{
  "connected": true,
  "accountId": "...",
  "lastCheck": "2026-04-26T..."
}
```

#### Get Jobber Jobs
```
GET /api/jobber/jobs

Response:
{
  "jobs": [...],
  "count": 5,
  "timestamp": "2026-04-26T..."
}
```

## Troubleshooting

### Webhooks Not Being Received

1. **Check the URL**: Verify the webhook URL is exactly `https://scoopychatt.com/api/jobber/webhook`

2. **Test Connectivity**: 
   ```bash
   curl -X POST https://scoopychatt.com/api/jobber/webhook \
     -H "Content-Type: application/json" \
     -d '{"event":{"type":"test","data":{}}}'
   ```

3. **Check Logs**: Look at the server logs for any errors

4. **Verify Port**: Make sure port 4173 is accessible and the app is running

5. **HTTPS Only**: Jobber only sends webhooks to HTTPS URLs (not HTTP)

### Signature Verification Failures

- Ensure `JOBBER_API_SECRET` environment variable is set correctly
- The secret must match exactly with what's in Jobber Developer Portal

### Rate Limiting

The API includes rate limiting:
- Default: 100 requests per 60 seconds per IP
- Can be configured via `RATE_LIMIT_*` environment variables

## Integration with Dashboard

The Mission Control dashboard can:

1. **Poll for Updates**
   ```javascript
   // Fetch recent webhook events every 10 seconds
   setInterval(async () => {
     const response = await fetch('/api/jobber/webhooks?limit=20');
     const data = await response.json();
     updateDashboard(data.events);
   }, 10000);
   ```

2. **Display Real-time Data**
   - Show recent job updates
   - Display client activity
   - Show quote status changes

3. **Trigger Actions**
   - Refresh job list when job.updated webhook received
   - Update client list when client.created webhook received
   - Recalculate metrics when job.completed webhook received

## Next Steps

1. ✅ Jobber webhook route is configured
2. 🔄 Webhook endpoint is live at `https://scoopychatt.com/api/jobber/webhook`
3. ⏳ Update Mission Control dashboard to consume webhook events
4. 📊 Add real-time charts showing webhook activity

## Additional Resources

- [Jobber API Documentation](https://developer.getjobber.com)
- [Jobber Webhook Reference](https://developer.getjobber.com/docs/webhooks)
- [Mission Control Dashboard](https://scoopychatt.com)
