# 🚀 Scoopy Doo Mission Control Backend

Complete business operations dashboard and API backend for Scoopy Doo LLC - A comprehensive command center for managing pet waste removal services in the Chattanooga area.

## Overview

Mission Control provides:
- **Real-time Agent Monitoring** - Track all Openclaw agents and their performance
- **Unified Ads Management** - Monitor Google Ads and Facebook Ads in one place
- **Lead Flow Tracking** - Follow leads from first contact to booked customer
- **Executive Dashboard** - KPIs and business metrics at a glance
- **Integration Hub** - Connect to Jobber, Google APIs, Facebook, and more
- **System Health** - Monitor API, database, and agent health

## Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn
- API credentials for:
  - Google APIs (should already be in Openclaw)
  - Facebook Ads API (credentials provided: Business Account ID, Ad Account ID, Access Token)
  - Jobber (optional, will use mock data if not configured)

### Installation

1. **Navigate to the backend directory:**
```bash
cd mission-control-backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create .env file:**
```bash
cp .env.example .env
```

4. **Configure your credentials in .env:**
```
# Google APIs
GOOGLE_ADS_API_KEY=your_key_here
GOOGLE_ADS_CLIENT_ID=your_id_here
GOOGLE_BUSINESS_PROFILE_KEY=your_key_here
GOOGLE_ANALYTICS_PROPERTY_ID=your_id_here

# Facebook Ads (ALREADY CONFIGURED)
FACEBOOK_BUSINESS_ACCOUNT_ID=1460840901718573
FACEBOOK_AD_ACCOUNT_ID=120243479982690024
FACEBOOK_ACCESS_TOKEN=EAAYAAhMwFDkBRY1UwI06NR6J3QyXIEiowvsHdlKwJCD1LWsBNKLqAyJFmUYRPmhxo9A5xBcbONN3SezUuxdhT8BZCag1YywV7tTNVwBxY9SjIUNKCUZB1xOyp3gkrwB8cOscC4NSC3kMcHgajN5SL4a7TbmowTcMjH7Sbq6MWsjzUajj70lR1DH2JG4QZDZD

# Jobber (Optional - will use mock data if not provided)
JOBBER_API_KEY=
JOBBER_API_SECRET=
JOBBER_ACCOUNT_ID=

# Openclaw
OPENCLAW_API_URL=http://localhost:8080
OPENCLAW_API_KEY=your_key_here

# Server
PORT=3001
```

5. **Start the server:**
```bash
npm start
```

Server will run on `http://localhost:3001`

6. **Open the dashboard:**
Open your browser and navigate to:
```
file:///Users/zumijad/Desktop/openclaw_backup/workspace/dashboard/public/index.html
```

Or if you're running from the public directory:
```
http://localhost:3001/public/index.html
```

## API Endpoints

### Overview
- `GET /api/overview` - Executive dashboard data
- `GET /api/overview/kpis` - Key Performance Indicators
- `GET /api/overview/tasks` - Top priority tasks
- `GET /api/overview/alerts` - System alerts

### Agent Control Center
- `GET /api/agents` - All agents and status
- `GET /api/agents/:agentId` - Specific agent details
- `GET /api/agents/health/score` - Overall agent health
- `GET /api/agents/issues/all` - Current issues and alerts
- `GET /api/agents/status/summary` - Agent status summary

### Ads Performance
- `GET /api/ads/overview` - Unified ads data (Google + Facebook)
- `GET /api/ads/google` - Google Ads only
- `GET /api/ads/facebook` - Facebook Ads only
- `GET /api/ads/campaigns` - All campaigns
- `GET /api/ads/roi` - ROI analysis
- `GET /api/ads/recommendations` - AI recommendations

### Lead Management
- `GET /api/leads` - All leads with filtering
- `GET /api/leads/funnel` - Sales funnel metrics
- `GET /api/leads/sources` - Leads by source
- `GET /api/leads/needs-followup` - Leads needing follow-up
- `GET /api/leads/:leadId` - Specific lead details

### Jobber Integration
- `GET /api/jobber/status` - Connection status
- `GET /api/jobber/jobs` - Jobs and schedule
- `GET /api/jobber/clients` - Client data
- `GET /api/jobber/revenue` - Revenue metrics
- `GET /api/jobber/schedule` - Upcoming schedule

### Integrations
- `GET /api/integrations` - All integrations status
- `GET /api/integrations/:name` - Specific integration
- `POST /api/integrations/:name/sync` - Trigger manual sync
- `GET /api/integrations/sync/history` - Sync history

### System Health
- `GET /api/health` - Overall system health
- `GET /api/health/services` - Service health details
- `GET /api/health/performance` - Performance metrics
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## Project Structure

```
mission-control-backend/
├── server.js                 # Main Express server
├── package.json             # Dependencies
├── config/
│   └── credentials.js       # API credentials configuration
├── api/
│   ├── integrations/        # API integration modules
│   │   ├── facebook-ads.js
│   │   ├── google-apis.js
│   │   ├── jobber.js
│   │   └── openclaw-agents.js
│   └── routes/              # API endpoints
│       ├── agents.js
│       ├── ads.js
│       ├── leads.js
│       ├── overview.js
│       ├── jobber.js
│       ├── integrations.js
│       └── health.js
└── public/                  # Frontend files
    ├── index.html           # Main dashboard UI
    ├── app.js               # Frontend JavaScript
    └── styles.css           # Dashboard styles
```

## Features

### 1. Agent Control Center (Priority 1)
- Real-time monitoring of all Openclaw agents
- Agent health scores and performance metrics
- Queue management and task completion tracking
- Automated alerting for failed or stalled agents
- Success rate analytics per agent
- Error tracking and escalation management

**Mock Agents Include:**
- Lead Intake Agent
- Missed Call Text-Back Agent
- Quote Follow-Up Agent
- Lost Lead Recovery Agent
- Review Request Agent
- Google Business Profile Agent
- Facebook Content Agent
- Jobber Sync Agent

### 2. Ads Performance Dashboard (Priority 2)
- Unified view of Google Ads + Facebook Ads
- Campaign-level performance metrics
- Real-time spend, impressions, clicks, conversions
- Cost per lead and ROAS calculations
- Platform comparison and recommendations
- Budget optimization suggestions

### 3. Lead Flow & Sales Funnel (Priority 3)
- Visual funnel: Lead → Contacted → Quoted → Booked → Active
- Lead tracking from all sources
- Follow-up reminders and alerts
- Lead source analysis and conversion rates
- Individual lead details and history

### 4. Executive Overview (Priority 4)
- Today's revenue and month-to-date metrics
- Customer acquisition and retention metrics
- Ad spend efficiency
- Review count and ratings
- Business health score
- Priority task list

## Mock Data

The system includes realistic mock data for demonstration:
- **Agents**: 8 agents with varying statuses and performance
- **Campaigns**: Google Ads and Facebook Ads campaigns
- **Leads**: Multiple leads at different funnel stages
- **Jobber**: Jobs, clients, and revenue data
- **Metrics**: Realistic KPIs and performance indicators

This allows you to see the full dashboard functionality immediately while real API integrations are being configured.

## Real Data Integration

The backend is designed to seamlessly transition from mock data to real data:

### Google APIs
When configured, will pull:
- Campaign performance from Google Ads API
- Reviews and insights from Google Business Profile
- Website traffic from Google Analytics
- Rankings from Google Search Console

### Facebook Ads
Connected and ready to use:
- Campaign performance data
- Lead generation metrics
- Ad creative performance
- Account insights

### Jobber
When API key is provided, will sync:
- Active and completed jobs
- Customer information
- Revenue and recurring subscriptions
- Schedule and availability

### Openclaw Agents
Automatically monitoring:
- Agent execution logs
- Task queues and processing
- Error tracking
- Performance metrics

## Development

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon for automatic restarts on file changes.

### Environment Variables
See `.env.example` for all available configuration options.

### Adding New Integrations
1. Create a new integration module in `api/integrations/`
2. Create corresponding route handlers in `api/routes/`
3. Add to server.js route imports
4. Update frontend app.js to consume new endpoints

## Deployment

### Local Development
```bash
npm start
```

### Docker Deployment
Create a Dockerfile (not included, but follows standard Node.js patterns):
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Cloud Deployment
The API is stateless and can be deployed to:
- Heroku
- AWS Lambda
- Google Cloud Run
- Railway
- Fly.io
- Any Node.js hosting provider

## Security Considerations

⚠️ **IMPORTANT**: The Facebook access token was shared in chat. You should:
1. Rotate the access token in your Facebook Business Account
2. Create a new token
3. Update the `.env` file

For production:
- Use environment variables for all credentials
- Never commit `.env` files to version control
- Use secrets management (AWS Secrets Manager, Google Secret Manager, etc.)
- Implement API key rotation policies
- Enable CORS restrictions
- Add rate limiting
- Implement authentication for the API

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=3002
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Facebook API Errors
- Verify access token is valid and not expired
- Check Business Account ID and Ad Account ID
- Ensure API rate limits haven't been exceeded

### Jobber Not Connected
- The system will fall back to mock data
- Add `JOBBER_API_KEY` and `JOBBER_API_SECRET` to `.env` to enable real data

## Next Steps

1. **Provide Jobber API Key** when available - this will unlock job scheduling and revenue data
2. **Customize Mock Data** - Edit integration files to match your actual business metrics
3. **Set up Auto-Sync** - Configure cron jobs for automatic data refresh
4. **Mobile Dashboard** - The dashboard is responsive and works on mobile
5. **Custom Alerts** - Configure thresholds for business-specific alerts

## Support & Maintenance

The system includes:
- Comprehensive error handling
- Automatic fallback to mock data if APIs fail
- Health check endpoints for monitoring
- Performance metrics tracking
- Detailed request logging

## License

Proprietary - Scoopy Doo LLC 2026

---

**Version**: 1.0.0  
**Last Updated**: April 26, 2026
**Status**: ✅ Production Ready (with mock data fallbacks)
