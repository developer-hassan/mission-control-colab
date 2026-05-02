# Jobber Integration Testing Guide

This guide walks you through testing the Jobber webhook integration end-to-end.

## Prerequisites

✅ **Required Setup (Already Completed)**
- Jobber API credentials configured in `.env` file
- Mission Control backend running on port 4173
- Dashboard accessible at `http://localhost:4173/`
- Jobber webhook route implemented (`/api/jobber/webhook`)

## Test Checklist

### 1. Verify API Endpoints Are Working

#### Check Jobber Connection Status
```bash
curl http://localhost:4173/api/jobber/status
```

Expected response:
```json
{
  "connected": true,
  "accountId": "your-account-id",
  "lastCheck": "2026-04-26T..."
}
```

#### Get Jobber Jobs
```bash
curl http://localhost:4173/api/jobber/jobs
```

Expected response:
```json
{
  "jobs": [...],
  "count": 5,
  "timestamp": "2026-04-26T..."
}
```

### 2. Test Webhook Endpoint (Locally)

#### Send a Test Webhook
```bash
curl -X POST http://localhost:4173/api/jobber/webhook \
  -H "Content-Type: application/json" \
  -H "X-Jobber-Signature: test-signature" \
  -d '{
    "event": {
      "type": "job.created",
      "data": {
        "id": "test-job-123",
        "title": "Test Job from Webhook",
        "status": "pending",
        "clientId": "client-456",
        "createdAt": "2026-04-26T10:00:00Z"
      }
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Webhook received and processed",
  "eventType": "job.created",
  "timestamp": "2026-04-26T..."
}
```

### 3. View Recent Webhook Events

#### Get Last 10 Webhook Events
```bash
curl http://localhost:4173/api/jobber/webhooks?limit=10
```

Expected response:
```json
{
  "total": 10,
  "returned": 10,
  "events": [
    {
      "eventType": "job.created",
      "timestamp": "2026-04-26T10:05:00Z",
      "data": {...},
      "processed": true
    },
    ...
  ]
}
```

### 4. Test Dashboard Webhook Polling

1. **Open Dashboard**
   - Navigate to `http://localhost:4173/`
   - Open browser DevTools (F12)
   - Go to Console tab

2. **Send a Test Webhook**
   - In another terminal, run the test webhook curl command above

3. **Check Console**
   - You should see: `[Webhook Update] job.created {...}`
   - This confirms the dashboard is polling for webhook events

4. **View in Real-time**
   - If on the "Operations & Scheduling" (Jobber) view
   - Data should refresh automatically when webhook is received
   - If not on that view, the refresh is scheduled but may not be visible

### 5. Configure Jobber Webhook in Developer Portal

#### Step 1: Log In
- Go to https://developer.getjobber.com
- Sign in with your Jobber account

#### Step 2: Navigate to Your App
- Find your "Mission Control" app in the developer dashboard
- Click on the app settings

#### Step 3: Add Webhook URL

For **Production** (Live):
```
https://scoopychatt.com/api/jobber/webhook
```

For **Development** (Testing):
- Use ngrok or similar to create a public URL for localhost
- Example: `https://your-ngrok-url.ngrok.io/api/jobber/webhook`

#### Step 4: Select Event Types

Select the events you want to track:
- ✅ `client.created` - New client created
- ✅ `client.updated` - Client information updated
- ✅ `job.created` - New job created
- ✅ `job.updated` - Job status changed
- ✅ `job.completed` - Job marked as complete
- ✅ `request.created` - New quote/service request
- ✅ `request.updated` - Quote/request updated

#### Step 5: Save Configuration
- Click "Save" or "Update"
- Note the webhook signing secret (if shown)
- Ensure it matches `JOBBER_API_SECRET` in `.env`

#### Step 6: Test the Webhook
- Use Jobber's "Send Test Event" feature
- Check Mission Control logs to verify receipt
- View webhook events at `/api/jobber/webhooks`

### 6. Verify Signature Verification

#### Test with Valid Signature
```bash
# Generate HMAC-SHA256 signature
SECRET="d22d40c17e5ddf5f73ec4e7580510710b3763443face80d0d8b3807553185309"
PAYLOAD='{"event":{"type":"job.created","data":{"id":"123"}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Send with signature
curl -X POST http://localhost:4173/api/jobber/webhook \
  -H "Content-Type: application/json" \
  -H "X-Jobber-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

Expected: `"success": true`

#### Test with Invalid Signature
```bash
curl -X POST http://localhost:4173/api/jobber/webhook \
  -H "Content-Type: application/json" \
  -H "X-Jobber-Signature: invalid-signature" \
  -d '{"event":{"type":"job.created","data":{"id":"123"}}}'
```

Expected: `401 Unauthorized` with `{"error":"Invalid signature"}`

### 7. Troubleshooting

#### Webhook Not Being Received

**Check 1: Server Status**
```bash
curl http://localhost:4173/api/health
```

Should return: `{"status":"ok"}`

**Check 2: Port Accessibility**
```bash
# Make sure port 4173 is listening
lsof -i :4173
```

**Check 3: Firewall**
- Ensure port 4173 is open
- Check if you're behind a firewall that blocks outgoing connections

**Check 4: Jobber Webhook URL**
- Verify exact URL in Jobber: `https://scoopychatt.com/api/jobber/webhook`
- No trailing slashes
- Must be HTTPS (not HTTP)

**Check 5: API Secret**
```bash
# Verify secret in .env
grep JOBBER_API_SECRET .env
```

Should match the secret in Jobber Developer Portal

#### Signature Verification Failing

**Check:**
1. `JOBBER_API_SECRET` matches Jobber's secret
2. Secret is being passed correctly to the verification function
3. Raw body is being used (not parsed JSON)

#### Dashboard Not Updating

1. Open DevTools Console (F12)
2. Look for: `[Webhook Update]` messages
3. Check if webhook events exist: `curl http://localhost:4173/api/jobber/webhooks`
4. Verify dashboard is polling (check Network tab for repeated `/api/jobber/webhooks` requests)

### 8. Integration Checklist

- [ ] Jobber API credentials in `.env`
- [ ] Mission Control backend running
- [ ] Webhook endpoint accessible at `POST /api/jobber/webhook`
- [ ] Local testing passes (test webhook received)
- [ ] Jobber app registered in Developer Portal
- [ ] Webhook URL configured in Jobber
- [ ] Event types selected
- [ ] Dashboard polling verified
- [ ] Real Jobber webhook received
- [ ] Dashboard updates in real-time

### 9. Next Steps

After webhook integration is working:

1. **Enhance Data Processing**
   - Store webhook events in database instead of memory
   - Calculate metrics from webhook data
   - Create alerts based on webhook events

2. **Improve Dashboard**
   - Add "Last Updated" timestamp
   - Show webhook event feed
   - Add notifications for key events

3. **Add More Integrations**
   - Stripe payments webhook
   - Twilio SMS notifications
   - Slack alerts

## Testing Scenarios

### Scenario 1: New Job Created
1. In Jobber, create a new job
2. Check dashboard - "Total Jobs" count increases
3. Check recent webhooks: `curl http://localhost:4173/api/jobber/webhooks`
4. Verify `job.created` event appears

### Scenario 2: Job Completed
1. In Jobber, mark a job as completed
2. Check dashboard - metrics update
3. Check recent webhooks for `job.completed` event

### Scenario 3: New Client Added
1. In Jobber, create a new client
2. Check dashboard - client count updates
3. Check for `client.created` webhook event

## Useful Commands

```bash
# Monitor logs in real-time
# (Terminal running your server will show logs)

# Check recent events
curl http://localhost:4173/api/jobber/webhooks

# Test with curl
curl -X POST http://localhost:4173/api/jobber/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"type":"test","data":{}}}'

# Monitor network requests in browser
# 1. Open DevTools (F12)
# 2. Go to Network tab
# 3. Filter for "jobber"
# 4. See all Jobber API requests and webhook receipts
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid signature" | Secret mismatch | Verify `JOBBER_API_SECRET` in .env |
| Webhook not received | Wrong URL | Check Jobber webhook URL exactly matches |
| 404 Not Found | Route not registered | Verify jobber.js route is imported in server.js |
| CORS error | Cross-origin issue | Confirm CORS is enabled: `app.use(cors())` |
| No real-time updates | Polling disabled | Check startWebhookPolling() is called in app.js |

## Performance Considerations

- Webhook events stored in memory (max 100 recent events)
- Polling interval: 10 seconds (configurable)
- Dashboard updates only affected views (not all views)
- No database queries on webhook receipt (fast processing)

## Security Notes

✅ **Implemented:**
- HMAC-SHA256 signature verification
- API secret validation
- Raw body preservation for signature verification
- HTTPS-only URLs (production)

⚠️ **To Implement:**
- Database storage of webhook events
- API key authentication for webhook endpoints
- Rate limiting per IP
- Webhook event encryption
- Audit logging

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify all credentials and URLs
3. Test with curl before testing in dashboard
4. Check browser DevTools console for client-side errors
5. Consult Jobber API documentation: https://developer.getjobber.com
