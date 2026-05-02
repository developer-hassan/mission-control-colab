// Mission Control Dashboard App
const API_BASE = `http://${window.location.hostname}:4173/api`;

class DashboardApp {
  constructor() {
    this.currentView = 'overview';
    this.refreshInterval = 60000; // 60 seconds
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupClock();
    this.loadView('overview');
    this.startAutoRefresh();
    this.startWebhookPolling();
  }

  /**
   * Poll for Jobber webhook events
   * Updates dashboard in real-time when Jobber events occur
   */
  startWebhookPolling() {
    const pollInterval = 10000; // Poll every 10 seconds

    const pollWebhooks = async () => {
      try {
        const response = await this.fetch('/jobber/webhooks?limit=10');
        if (response && response.events && response.events.length > 0) {
          const recentEvent = response.events[response.events.length - 1];
          console.log('[Webhook Update]', recentEvent.eventType, recentEvent);

          // Refresh relevant data based on event type
          if (recentEvent.eventType.includes('job.')) {
            // Job event - refresh jobber view if active
            if (this.currentView === 'jobber') {
              await this.loadJobber();
            }
          } else if (recentEvent.eventType.includes('client.')) {
            // Client event - may affect leads
            if (this.currentView === 'leads') {
              await this.loadLeads();
            }
          } else if (recentEvent.eventType.includes('request.')) {
            // Request/quote event
            if (this.currentView === 'leads') {
              await this.loadLeads();
            }
          }
        }
      } catch (error) {
        // Silently fail - webhook polling is optional
        console.debug('Webhook polling error:', error.message);
      }
    };

    // Start polling
    setInterval(pollWebhooks, pollInterval);

    // Also run once immediately
    pollWebhooks();
  }

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.loadView(view);
      });
    });
  }

  setupClock() {
    const updateClock = () => {
      const now = new Date();
      document.getElementById('current-time').textContent = now.toLocaleTimeString();
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  async loadView(viewName) {
    this.currentView = viewName;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Hide all sections
    document.querySelectorAll('.view-section').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });

    // Show and load selected section
    const section = document.getElementById(viewName);
    if (section) {
      section.style.display = 'block';
      section.classList.add('active');
    }

    // Load data for view
    switch (viewName) {
      case 'overview':
        await this.loadOverview();
        break;
      case 'agents':
        await this.loadAgents();
        break;
      case 'ads':
        await this.loadAds();
        break;
      case 'leads':
        await this.loadLeads();
        break;
      case 'jobber':
        await this.loadJobber();
        break;
      case 'integrations':
        await this.loadIntegrations();
        break;
      case 'health':
        await this.loadHealth();
        break;
    }
  }

  // API fetch helper
  async fetch(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }

  // CHART RENDERING
  createGaugeChart(canvasId, value, maxValue, label, color = '#FF9E30') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [value, maxValue - value],
          backgroundColor: [color, 'rgba(255, 158, 48, 0.1)'],
          borderColor: ['#1a1f2e', '#1a1f2e'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      },
      plugins: [{
        id: 'textCenter',
        beforeDatasetsDraw(chart) {
          const { width, height, ctx: canvasCtx } = chart;
          canvasCtx.restore();
          canvasCtx.font = 'bold 20px sans-serif';
          canvasCtx.textBaseline = 'middle';
          canvasCtx.fillStyle = '#FF9E30';
          const text = Math.round(value) + '%';
          const textX = Math.round((width - canvasCtx.measureText(text).width) / 2);
          const textY = height / 2;
          canvasCtx.fillText(text, textX, textY);
          canvasCtx.save();
        }
      }]
    });
  }

  createPieChart(canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#1a1f2e',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#b0b8c1', padding: 15, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${percentage}%`;
              }
            }
          }
        }
      }
    });
  }

  // OVERVIEW VIEW
  async loadOverview() {
    const loadingEl = document.getElementById('overview-loading');
    const contentEl = document.getElementById('overview-content');
    const alertsEl = document.getElementById('alerts-section');
    const tasksEl = document.getElementById('tasks-section');

    try {
      // Fetch overview data
      const data = await this.fetch('/overview');

      if (!data || !data.overview) {
        loadingEl.textContent = 'Error: Could not load overview data';
        return;
      }

      const overview = data.overview;

      // Update metric cards
      document.getElementById('total-revenue').textContent = `$${(overview.summary?.totalSpend || 0).toFixed(2)}`;
      document.getElementById('avg-job-value').textContent = `$${((overview.summary?.totalSpend || 0) / Math.max(overview.summary?.totalConversions || 1, 1)).toFixed(2)}`;

      // Create gauge charts (Profit Margin & Completion Rate)
      const profitMargin = 65; // Mock data - would come from API
      const completionRate = 92; // Mock data - would come from API

      setTimeout(() => {
        this.createGaugeChart('profitGauge', profitMargin, 100, 'Profit Margin %');
        this.createGaugeChart('completionGauge', completionRate, 100, 'Completion Rate %');

        // Create pie charts
        this.createPieChart('revenueChart',
          ['Weekly Service', 'Bi-weekly Service', 'One-time Service', 'Add-ons'],
          [45, 28, 18, 9],
          ['#FF9E30', '#FF7E1F', '#E85C0D', '#C44800']
        );

        this.createPieChart('customerChart',
          ['Residential', 'Commercial', 'Multi-unit'],
          [55, 35, 10],
          ['#FF9E30', '#FFB366', '#FFD699']
        );

        this.createPieChart('leadsChart',
          ['Google Ads', 'Facebook Ads', 'Referral', 'Organic'],
          [38, 27, 20, 15],
          ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A']
        );
      }, 100);

      // Render alerts
      const alertsData = await this.fetch('/overview/alerts');
      if (alertsData && alertsData.alerts) {
        const alertsHTML = alertsData.alerts.length > 0
          ? alertsData.alerts.map(alert => `
              <div class="alert alert-${alert.severity}">
                <strong>${alert.type}</strong>: ${alert.message}
              </div>
            `).join('')
          : '<p style="color: #b0b8c1;">No active alerts</p>';
        alertsEl.innerHTML = alertsHTML;
      }

      // Render tasks
      const tasksData = await this.fetch('/overview/tasks');
      if (tasksData && tasksData.tasks && tasksData.tasks.length > 0) {
        const tasksHTML = tasksData.tasks.map(task => `
          <div class="task-item">
            <div class="task-priority">P${task.priority}</div>
            <div class="task-content">
              <div class="task-title">${task.title}</div>
              <div class="task-impact">${task.impact}</div>
              <div class="task-deadline">${task.deadline}</div>
            </div>
          </div>
        `).join('');
        tasksEl.innerHTML = tasksHTML;
      }

      // Update system status
      const healthScore = overview.automations?.healthScore || 85;
      const score = typeof healthScore === 'object' ? healthScore.score : healthScore;
      this.updateSystemStatus(score);

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (error) {
      console.error('Error in loadOverview:', error);
      loadingEl.textContent = 'Error loading overview: ' + error.message;
    }
  }

  // AGENTS VIEW
  async loadAgents() {
    const loadingEl = document.getElementById('agents-loading');
    const contentEl = document.getElementById('agents-content');
    const summaryEl = document.getElementById('agents-summary');
    const gridEl = document.getElementById('agents-grid');
    const issuesEl = document.getElementById('agent-issues');

    const [agents, issues] = await Promise.all([
      this.fetch('/agents'),
      this.fetch('/agents/issues/all')
    ]);

    if (!agents) {
      loadingEl.textContent = 'Error loading agents';
      return;
    }

    // Render summary
    const summaryHTML = `
      <div class="stat-card">
        <div class="stat-value">${agents.stats.active}</div>
        <div class="stat-label">Active Agents</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${agents.stats.failed}</div>
        <div class="stat-label">Failed Agents</div>
      </div>
      <div class="stat-card health-score">
        <div class="stat-value">${agents.healthScore.toFixed(0)}</div>
        <div class="stat-label">Health Score</div>
      </div>
    `;
    summaryEl.innerHTML = summaryHTML;

    // Render agents grid
    const agentsHTML = agents.agents.map(agent => `
      <div class="agent-card status-${agent.status}">
        <div class="agent-header">
          <h4>${agent.name}</h4>
          <span class="status-badge status-${agent.status}">${agent.status}</span>
        </div>
        <div class="agent-purpose">${agent.purpose}</div>
        <div class="agent-metrics">
          <div class="metric">
            <span class="metric-label">Success Rate</span>
            <span class="metric-value">${agent.successRate}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Queue</span>
            <span class="metric-value">${agent.currentQueue}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Completed</span>
            <span class="metric-value">${agent.tasksCompleted}</span>
          </div>
        </div>
        <div class="agent-timing">
          <small>Last run: ${new Date(agent.lastRun).toLocaleTimeString()}</small>
        </div>
      </div>
    `).join('');
    gridEl.innerHTML = agentsHTML;

    // Render issues
    const issuesHTML = issues && issues.issues.length > 0
      ? issues.issues.map(issue => `
          <div class="issue-item severity-${issue.severity}">
            <div class="issue-header">
              <strong>${issue.agentName}</strong>
              <span class="severity-badge">${issue.severity}</span>
            </div>
            <div class="issue-message">${issue.message}</div>
          </div>
        `).join('')
      : '<p>No issues detected</p>';
    issuesEl.innerHTML = issuesHTML;

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  }

  // ADS VIEW
  async loadAds() {
    const loadingEl = document.getElementById('ads-loading');
    const contentEl = document.getElementById('ads-content');
    const summaryEl = document.getElementById('ads-summary');
    const platformsEl = document.getElementById('ads-platforms');
    const recoEl = document.getElementById('ads-recommendations');

    const [overview, recs] = await Promise.all([
      this.fetch('/ads/overview'),
      this.fetch('/ads/recommendations')
    ]);

    if (!overview) {
      loadingEl.textContent = 'Error loading ads data';
      return;
    }

    // Render summary
    const { summary } = overview.overview;
    const summaryHTML = `
      <div class="stat-card">
        <div class="stat-value">$${summary.totalSpend.toFixed(2)}</div>
        <div class="stat-label">Total Spend</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.totalClicks}</div>
        <div class="stat-label">Clicks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">$${summary.costPerLead.toFixed(2)}</div>
        <div class="stat-label">Cost per Lead</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.averageCtr.toFixed(2)}%</div>
        <div class="stat-label">Avg CTR</div>
      </div>
    `;
    summaryEl.innerHTML = summaryHTML;

    // Render by platform
    const { byPlatform } = overview.overview;
    const platformsHTML = `
      <div class="platform-card">
        <h4>Google Ads</h4>
        <p>Spend: $${byPlatform.googleAds.totalSpend || 0}</p>
        <p>Leads: ${byPlatform.googleAds.totalConversions || 0}</p>
      </div>
      <div class="platform-card">
        <h4>Facebook Ads</h4>
        <p>Spend: $${byPlatform.facebookAds.spend || 0}</p>
        <p>Leads: ${byPlatform.facebookAds.leads || 0}</p>
      </div>
    `;
    platformsEl.innerHTML = platformsHTML;

    // Render recommendations
    const recoHTML = recs && recs.recommendations
      ? recs.recommendations.map(rec => `
          <div class="recommendation">
            <strong>${rec.type}</strong>
            <p>${rec.message}</p>
            <div class="reco-action">${rec.action}</div>
          </div>
        `).join('')
      : '<p>No recommendations</p>';
    recoEl.innerHTML = recoHTML;

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  }

  // LEADS VIEW
  async loadLeads() {
    const loadingEl = document.getElementById('leads-loading');
    const contentEl = document.getElementById('leads-content');

    try {
      const [funnel, sources, leads] = await Promise.all([
        this.fetch('/leads/funnel'),
        this.fetch('/leads/sources'),
        this.fetch('/leads?limit=20')
      ]);

      if (!funnel) {
        loadingEl.textContent = 'Error loading leads';
        return;
      }

      // Update metric cards
      const funnelStages = funnel.funnel?.stages || [];
      const totalLeads = funnelStages.reduce((sum, s) => sum + (s.count || 0), 0) || 0;
      const converted = funnelStages.find(s => s.stage === 'Jobs')?.count || 0;
      const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0;

      document.getElementById('total-leads').textContent = totalLeads;
      document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
      document.getElementById('response-time').textContent = '2.5h'; // Mock data
      document.getElementById('close-rate').textContent = '68%'; // Mock data

      // Create funnel chart
      setTimeout(() => {
        this.createFunnelChart('funnelChart', funnelStages);

        // Create lead sources pie chart
        if (sources && sources.sources) {
          const sourceLabels = sources.sources.map(s => s.source);
          const sourceCounts = sources.sources.map(s => s.count);
          const sourceColors = ['#3B82F6', '#1D4ED8', '#1E40AF', '#10B981', '#FF9E30'];
          this.createPieChart('leadSourcesChart', sourceLabels, sourceCounts, sourceColors);
        }

        // Create lead status pie chart
        const statusBreakdown = {
          'New': 12,
          'Quoted': 8,
          'Negotiating': 5,
          'Lost': 3,
          'Jobs': converted
        };
        this.createPieChart('leadStatusChart',
          Object.keys(statusBreakdown),
          Object.values(statusBreakdown),
          ['#FF9E30', '#FFB366', '#FFCC99', '#EF4444', '#10B981']
        );
      }, 100);

      // Render leads table
      const tbody = document.getElementById('leads-tbody');
      if (leads && leads.leads && leads.leads.length > 0) {
        const tableHTML = leads.leads.map(lead => `
          <tr>
            <td><strong>${lead.name}</strong></td>
            <td>${lead.source}</td>
            <td><span class="status-badge status-${lead.status}">${lead.status}</span></td>
            <td>${lead.daysOpen || 0}</td>
            <td>${lead.followupDue ? '⏰ ' + lead.followupDue : '✓'}</td>
          </tr>
        `).join('');
        tbody.innerHTML = tableHTML;
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #b0b8c1;">No leads found</td></tr>';
      }

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (error) {
      console.error('Error loading leads:', error);
      loadingEl.textContent = 'Error loading leads: ' + error.message;
    }
  }

  createFunnelChart(canvasId, stages) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !stages || stages.length === 0) return;

    const labels = stages.map(s => s.stage);
    const data = stages.map(s => s.count || 0);
    const colors = ['#3B82F6', '#1D4ED8', '#10B981', '#F59E0B', '#EF4444'];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Leads',
          data,
          backgroundColor: colors.slice(0, data.length),
          borderColor: '#1a1f2e',
          borderWidth: 2
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.parsed.x} leads`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 158, 48, 0.1)' },
            ticks: { color: '#b0b8c1' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#b0b8c1' }
          }
        }
      }
    });
  }

  // JOBBER VIEW - Comprehensive Operations Dashboard
  async loadJobber() {
    const loadingEl = document.getElementById('jobber-loading');
    const contentEl = document.getElementById('jobber-content');
    const statusEl = document.getElementById('jobber-status');
    const dataEl = document.getElementById('jobber-data');

    const [status, dashboard] = await Promise.all([
      this.fetch('/jobber/status'),
      this.fetch('/jobber/dashboard')
    ]);

    if (!status || !dashboard) {
      loadingEl.textContent = 'Error loading Jobber data';
      return;
    }

    // Render connection status
    const statusHTML = `
      <div class="status-card">
        <h4>${status.message}</h4>
        <p>Status: <strong>${status.connected ? '✅ CONNECTED' : '❌ NOT CONFIGURED'}</strong></p>
      </div>
    `;
    statusEl.innerHTML = statusHTML;

    // Render comprehensive dashboard
    const html = `
      <!-- Customer Metrics Row -->
      <div class="metrics-row">
        <div class="metric-card large">
          <h3>Total Customers</h3>
          <div class="metric-value">${dashboard.customers.total}</div>
          <div class="metric-subtitle">${dashboard.customers.active} Active (${dashboard.customers.percentage}%)</div>
        </div>
        <div class="metric-card large">
          <h3>Weekly Routes</h3>
          <div class="metric-value">${dashboard.schedule.thisWeek}</div>
          <div class="metric-subtitle">Jobs Scheduled</div>
        </div>
        <div class="metric-card large">
          <h3>This Month Revenue</h3>
          <div class="metric-value">$${dashboard.revenue.thisMonth}</div>
          <div class="metric-subtitle">Weekly Avg: $${dashboard.revenue.weekly}</div>
        </div>
        <div class="metric-card large">
          <h3>Avg Job Value</h3>
          <div class="metric-value">$${dashboard.revenue.avgJobValue}</div>
          <div class="metric-subtitle">${dashboard.revenue.totalJobsCompleted} jobs completed</div>
        </div>
      </div>

      <!-- Service Frequency Breakdown -->
      <div class="section-card">
        <h3>📋 Active Services by Frequency</h3>
        <div class="services-grid">
          <div class="service-stat">
            <div class="service-count">${dashboard.services.weekly}</div>
            <div class="service-label">Weekly Routes</div>
          </div>
          <div class="service-stat">
            <div class="service-count">${dashboard.services.biweekly}</div>
            <div class="service-label">Bi-Weekly</div>
          </div>
          <div class="service-stat">
            <div class="service-count">${dashboard.services.monthly}</div>
            <div class="service-label">Monthly</div>
          </div>
          <div class="service-stat">
            <div class="service-count">${dashboard.services.quarterly}</div>
            <div class="service-label">Quarterly</div>
          </div>
          <div class="service-stat">
            <div class="service-count">${dashboard.services.oneTime}</div>
            <div class="service-label">One-Time</div>
          </div>
        </div>
      </div>

      <!-- Job Status Overview -->
      <div class="section-card">
        <h3>📊 Job Status Overview</h3>
        <div class="status-grid">
          <div class="status-box scheduled">
            <div class="status-number">${dashboard.jobs.scheduled}</div>
            <div class="status-label">Scheduled</div>
          </div>
          <div class="status-box in-progress">
            <div class="status-number">${dashboard.jobs.inProgress}</div>
            <div class="status-label">In Progress</div>
          </div>
          <div class="status-box completed">
            <div class="status-number">${dashboard.jobs.completed}</div>
            <div class="status-label">Completed</div>
          </div>
          <div class="status-box cancelled">
            <div class="status-number">${dashboard.jobs.cancelled}</div>
            <div class="status-label">Cancelled</div>
          </div>
        </div>
      </div>

      <!-- Routes by Day of Week -->
      <div class="section-card">
        <h3>📅 Weekly Schedule - Routes by Day</h3>
        <div class="weekly-schedule">
          ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => `
            <div class="day-column">
              <div class="day-name">${day.substring(0, 3)}</div>
              <div class="day-count">${dashboard.schedule.routesByDay[day]}</div>
              <div class="day-label">routes</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Upcoming Jobs This Week -->
      <div class="section-card">
        <h3>🗓️ Upcoming Routes This Week</h3>
        ${dashboard.schedule.upcomingJobs.length > 0 ? `
          <table class="jobs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Route / Job</th>
                <th>Client</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dashboard.schedule.upcomingJobs.map(job => `
                <tr>
                  <td>${new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td>${job.title || 'Unnamed Route'}</td>
                  <td>${job.client?.name || 'Unknown'}</td>
                  <td><span class="status-badge ${job.status?.toLowerCase().replace('_', '-')}">${job.status || 'Pending'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="padding: 10px; color: #999;">No upcoming routes scheduled this week</p>'}
      </div>

      <!-- Recent Completed Jobs -->
      <div class="section-card">
        <h3>✅ Recently Completed Routes</h3>
        ${dashboard.recentJobs.length > 0 ? `
          <table class="jobs-table">
            <thead>
              <tr>
                <th>Route / Job</th>
                <th>Client</th>
                <th>Date Completed</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${dashboard.recentJobs.map(job => `
                <tr>
                  <td>${job.title || 'Unnamed Route'}</td>
                  <td>${job.clientName}</td>
                  <td>${new Date(job.date).toLocaleDateString('en-US')}</td>
                  <td>$${job.revenue.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="padding: 10px; color: #999;">No completed routes</p>'}
      </div>
    `;

    dataEl.innerHTML = html;

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  }

  // INTEGRATIONS VIEW
  async loadIntegrations() {
    const loadingEl = document.getElementById('integrations-loading');
    const contentEl = document.getElementById('integrations-content');
    const gridEl = document.getElementById('integrations-grid');

    const integrations = await this.fetch('/integrations');

    if (!integrations) {
      loadingEl.textContent = 'Error loading integrations';
      return;
    }

    const html = integrations.integrations.map(int => `
      <div class="integration-card status-${int.status}">
        <h4>${int.name}</h4>
        <p class="integration-status">${int.status.replace('_', ' ').toUpperCase()}</p>
        <p class="integration-details">${int.details}</p>
        <p class="integration-sync" style="font-size: 0.85em; color: #999;">
          ${int.lastSync ? `Last sync: ${new Date(int.lastSync).toLocaleTimeString()}` : 'Never synced'}
        </p>
      </div>
    `).join('');
    gridEl.innerHTML = html;

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  }

  // HEALTH VIEW
  async loadHealth() {
    const loadingEl = document.getElementById('health-loading');
    const contentEl = document.getElementById('health-content');
    const scoreEl = document.getElementById('health-score');
    const servicesEl = document.getElementById('services-grid');

    const [health, services] = await Promise.all([
      this.fetch('/health'),
      this.fetch('/health/services')
    ]);

    if (!health) {
      loadingEl.textContent = 'Error loading health data';
      return;
    }

    // Render health score
    const { health: healthData } = health;
    const scoreColor = healthData.status === 'healthy' ? '#10b981' : healthData.status === 'degraded' ? '#f59e0b' : '#ef4444';
    const scoreHTML = `
      <div class="health-card" style="border-color: ${scoreColor}">
        <div class="health-score-value" style="color: ${scoreColor}">${healthData.score.toFixed(0)}</div>
        <div class="health-score-label">${healthData.status.toUpperCase()}</div>
        <p>Uptime: ${healthData.uptime}</p>
        <p>Response time: ${healthData.responseTime}</p>
      </div>
    `;
    scoreEl.innerHTML = scoreHTML;

    // Render services
    if (services && services.services) {
      const servicesHTML = Object.entries(services.services).map(([name, service]) => `
        <div class="service-card status-${service.status}">
          <h5>${name}</h5>
          <p><strong>${service.status.replace('_', ' ').toUpperCase()}</strong></p>
          <p>Uptime: ${service.uptime || 'N/A'}</p>
        </div>
      `).join('');
      servicesEl.innerHTML = servicesHTML;
    }

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  }

  updateSystemStatus(healthScore) {
    const statusEl = document.getElementById('system-status');
    const status = healthScore >= 80 ? 'HEALTHY' : healthScore >= 60 ? 'CAUTION' : 'CRITICAL';
    const color = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';
    statusEl.textContent = status;
    statusEl.style.borderColor = color;
    statusEl.style.color = color;
  }

  getIndicatorColor(indicator) {
    const colors = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
    return colors[indicator] || colors.yellow;
  }

  startAutoRefresh() {
    setInterval(() => {
      if (this.currentView === 'overview') this.loadOverview();
      if (this.currentView === 'agents') this.loadAgents();
      if (this.currentView === 'ads') this.loadAds();
    }, this.refreshInterval);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DashboardApp();
});
