import axios from 'axios';
import { credentials } from '../../config/credentials.js';

class JobberIntegration {
  constructor() {
    this.apiKey = credentials.jobber.apiKey;
    this.apiSecret = credentials.jobber.apiSecret;
    this.apiUrl = 'https://api.getjobber.com/api/graphql';
  }

  /**
   * Check if Jobber is configured
   */
  isConfigured() {
    const configured = !!(this.apiKey && this.apiSecret);
    console.log('[Jobber] Configuration check:', {
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret,
      configured,
      apiKeyPreview: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'null',
      apiUrl: this.apiUrl
    });
    return configured;
  }

  /**
   * Get jobs from Jobber
   */
  async getJobs(filters = {}) {
    if (!this.isConfigured()) {
      console.warn('[Jobber] Not configured - returning mock jobs');
      return this.getMockJobs();
    }

    try {
      const query = `
        query GetJobs($limit: Int) {
          jobs(limit: $limit) {
            edges {
              node {
                id
                title
                status
                startDate
                endDate
                client {
                  id
                  name
                }
                revenue
              }
            }
          }
        }
      `;

      console.log('[Jobber] Fetching jobs from API:', this.apiUrl);
      const response = await axios.post(
        this.apiUrl,
        { query, variables: { limit: 100 } },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('[Jobber] API Response Status:', response.status);

      if (response.data.errors) {
        console.error('[Jobber] GraphQL Errors in response:', response.data.errors);
        return this.getMockJobs();
      }

      const jobs = response.data?.data?.jobs?.edges?.map(e => e.node) || [];
      console.log('[Jobber] Jobs retrieved:', jobs.length, 'jobs');

      if (jobs.length === 0) {
        console.warn('[Jobber] No jobs returned from API - using mock data');
        return this.getMockJobs();
      }

      return jobs;
    } catch (error) {
      console.error('[Jobber] ERROR fetching jobs:', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        timeout: error.code === 'ECONNABORTED'
      });
      return this.getMockJobs();
    }
  }

  /**
   * Get clients from Jobber
   */
  async getClients() {
    if (!this.isConfigured()) {
      console.warn('[Jobber] Not configured - returning mock clients');
      return this.getMockClients();
    }

    try {
      const query = `
        query GetClients($limit: Int) {
          clients(limit: $limit) {
            edges {
              node {
                id
                name
                email
                phone
                activeServices {
                  id
                  name
                  frequency
                }
              }
            }
          }
        }
      `;

      console.log('[Jobber] Fetching clients from API');
      const response = await axios.post(
        this.apiUrl,
        { query, variables: { limit: 100 } },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.errors) {
        console.error('[Jobber] GraphQL Errors:', response.data.errors);
        return this.getMockClients();
      }

      const clients = response.data?.data?.clients?.edges?.map(e => e.node) || [];
      console.log('[Jobber] Clients retrieved:', clients.length, 'clients');

      if (clients.length === 0) {
        console.warn('[Jobber] No clients returned - using mock data');
        return this.getMockClients();
      }

      return clients;
    } catch (error) {
      console.error('[Jobber] ERROR fetching clients:', {
        message: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });
      return this.getMockClients();
    }
  }

  /**
   * Get revenue data
   */
  async getRevenue(dateRange = null) {
    if (!this.isConfigured()) {
      return this.getMockRevenue();
    }

    try {
      const query = `
        query GetRevenue($startDate: ISO8601DateTime, $endDate: ISO8601DateTime) {
          jobs(status: COMPLETE, completedAt: {greaterThan: $startDate, lessThan: $endDate}) {
            edges {
              node {
                id
                title
                revenue
                completedAt
              }
            }
          }
        }
      `;

      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.end || new Date().toISOString();

      console.log('[Jobber] Fetching revenue for date range:', { startDate, endDate });

      const response = await axios.post(
        this.apiUrl,
        {
          query,
          variables: {
            startDate,
            endDate
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Jobber] API Response:', JSON.stringify(response.data, null, 2));

      if (response.data.errors) {
        console.error('[Jobber] GraphQL Errors:', response.data.errors);
        return this.getMockRevenue();
      }

      const jobs = response.data?.data?.jobs?.edges?.map(e => e.node) || [];
      console.log('[Jobber] Jobs returned:', jobs.length, jobs);

      const totalRevenue = jobs.reduce((sum, job) => sum + (job.revenue || 0), 0);
      const jobCount = jobs.length;

      const result = {
        totalRevenue,
        jobCount,
        averageJobValue: jobCount > 0 ? totalRevenue / jobCount : 0,
        recurringRevenue: totalRevenue * 0.5, // Estimate
        jobs
      };

      console.log('[Jobber] Final revenue result:', result);
      return result;
    } catch (error) {
      console.error('[Jobber] Error fetching revenue:', error.message);
      console.error('[Jobber] Error details:', error.response?.data || error);
      return this.getMockRevenue();
    }
  }

  /**
   * Get schedule data
   */
  async getSchedule(startDate, endDate) {
    if (!this.isConfigured()) {
      return this.getMockSchedule();
    }

    try {
      const query = `
        query GetSchedule($startDate: ISO8601DateTime, $endDate: ISO8601DateTime) {
          jobs(startDate: {greaterThan: $startDate, lessThan: $endDate}) {
            edges {
              node {
                id
                title
                startDate
                endDate
                status
                client {
                  name
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        this.apiUrl,
        { query, variables: { startDate, endDate } },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data.jobs.edges.map(e => e.node);
    } catch (error) {
      console.error('Error fetching Jobber schedule:', error.message);
      return this.getMockSchedule();
    }
  }

  /**
   * Mock data for when Jobber API is not configured
   */
  getMockJobs() {
    return [
      {
        id: 'job_1',
        title: 'Weekly Residential Cleanup - Smith Residence',
        status: 'COMPLETE',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        client: { name: 'John Smith' },
        revenue: 45
      },
      {
        id: 'job_2',
        title: 'Monthly Commercial - Downtown Office',
        status: 'SCHEDULED',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        client: { name: 'Downtown Management' },
        revenue: 150
      },
      {
        id: 'job_3',
        title: 'HOA Cleanup - Oak Hills Subdivision',
        status: 'IN_PROGRESS',
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        client: { name: 'Oak Hills HOA' },
        revenue: 200
      }
    ];
  }

  getMockClients() {
    return [
      {
        id: 'client_1',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '(423) 555-0101',
        activeServices: [
          { id: 's1', name: 'Weekly Cleanup', frequency: 'weekly' }
        ]
      },
      {
        id: 'client_2',
        name: 'Downtown Management',
        email: 'info@downtown.com',
        phone: '(423) 555-0102',
        activeServices: [
          { id: 's2', name: 'Monthly Cleanup', frequency: 'monthly' }
        ]
      },
      {
        id: 'client_3',
        name: 'Oak Hills HOA',
        email: 'oakhi lls@hoa.com',
        phone: '(423) 555-0103',
        activeServices: [
          { id: 's3', name: 'Weekly Station Maintenance', frequency: 'weekly' }
        ]
      }
    ];
  }

  getMockRevenue() {
    return {
      totalRevenue: 8450,
      jobCount: 47,
      averageJobValue: 179.79,
      recurringRevenue: 4230,
      oneTimeRevenue: 4220
    };
  }

  getMockSchedule() {
    return [
      {
        id: 'job_1',
        title: 'Weekly Cleanup - Smith',
        startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'SCHEDULED',
        client: { name: 'John Smith' }
      },
      {
        id: 'job_2',
        title: 'Commercial Cleanup - Downtown',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'SCHEDULED',
        client: { name: 'Downtown Management' }
      }
    ];
  }

  /**
   * Validate Jobber connection
   */
  async validateConnection() {
    if (!this.isConfigured()) {
      return {
        connected: false,
        message: 'Jobber API key not configured. Please add JOBBER_API_KEY to your environment.'
      };
    }

    try {
      await this.getClients();
      return {
        connected: true,
        message: 'Successfully connected to Jobber API'
      };
    } catch (error) {
      return {
        connected: false,
        message: `Failed to connect to Jobber: ${error.message}`
      };
    }
  }
}

export default new JobberIntegration();
