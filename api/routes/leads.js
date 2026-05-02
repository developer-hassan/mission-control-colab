import express from 'express';

const router = express.Router();

/**
 * GET /api/leads
 * Get all leads with filtering
 */
router.get('/', (req, res) => {
  const { status = 'all', source = 'all', limit = 50 } = req.query;

  const mockLeads = [
    { id: '1', name: 'John Smith', source: 'Website Form', status: 'contacted', value: 45, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { id: '2', name: 'Sarah Johnson', source: 'Google Ads', status: 'quoted', value: 0, quoteValue: 150, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { id: '3', name: 'Mike Davis', source: 'Phone Call', status: 'needs_followup', value: 0, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { id: '4', name: 'Emily Brown', source: 'Facebook Ads', status: 'won', value: 250, createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    { id: '5', name: 'David Wilson', source: 'Referral', status: 'lost', lostReason: 'Budget Constraints', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
  ];

  let leads = mockLeads;

  if (status !== 'all') {
    leads = leads.filter(l => l.status === status);
  }

  if (source !== 'all') {
    leads = leads.filter(l => l.source === source);
  }

  res.json({
    leads: leads.slice(0, parseInt(limit)),
    total: leads.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/leads/funnel
 * Get lead funnel metrics
 */
router.get('/funnel', (req, res) => {
  const funnel = {
    stages: [
      { stage: 'New Leads', count: 47, percentage: 100 },
      { stage: 'Contacted', count: 38, percentage: 80.9 },
      { stage: 'Quoted', count: 28, percentage: 59.6 },
      { stage: 'Booked', count: 12, percentage: 25.5 },
      { stage: 'Active Customer', count: 12, percentage: 25.5 }
    ],
    conversionRates: {
      newToContacted: 80.9,
      contactedToQuoted: 73.7,
      quotedToBooked: 42.9,
      bookedToActive: 100
    }
  };

  res.json({
    funnel,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/leads/sources
 * Get leads by source
 */
router.get('/sources', (req, res) => {
  const sources = [
    { source: 'Website Form', count: 23, percentage: 29.1, conversionRate: 34.8 },
    { source: 'Google Ads', count: 18, percentage: 22.8, conversionRate: 44.4 },
    { source: 'Facebook Ads', count: 15, percentage: 19.0, conversionRate: 40.0 },
    { source: 'Phone Call', count: 12, percentage: 15.2, conversionRate: 58.3 },
    { source: 'Referral', count: 11, percentage: 13.9, conversionRate: 63.6 }
  ];

  res.json({
    sources,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/leads/needs-followup
 * Get leads needing follow-up
 */
router.get('/needs-followup', (req, res) => {
  const needsFollowup = [
    { id: '3', name: 'Mike Davis', status: 'needs_followup', hoursSinceLead: 24, priority: 'high' },
    { id: '7', name: 'Lisa Martinez', status: 'quoted', hoursSinceQuote: 72, priority: 'high' },
    { id: '9', name: 'Tom Anderson', status: 'contacted', daysSinceContact: 5, priority: 'medium' }
  ];

  res.json({
    leads: needsFollowup,
    count: needsFollowup.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/leads/:leadId
 * Get specific lead details
 */
router.get('/:leadId', (req, res) => {
  const leadDetail = {
    id: req.params.leadId,
    name: 'John Smith',
    email: 'john@example.com',
    phone: '(423) 555-0123',
    source: 'Website Form',
    status: 'quoted',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    address: '123 Main St, Chattanooga, TN',
    serviceArea: 'Chattanooga',
    estimatedValue: 450,
    quote: {
      id: 'q123',
      amount: 450,
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    history: [
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), action: 'Lead created from website form' },
      { date: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000), action: 'Contacted via phone' },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), action: 'Quote sent via email' }
    ]
  };

  res.json({
    lead: leadDetail,
    timestamp: new Date().toISOString()
  });
});

export default router;
