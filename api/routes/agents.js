import express from 'express';
import openclawAgents from '../integrations/openclaw-agents.js';

const router = express.Router();

/**
 * GET /api/agents
 * Get all agents and their status
 */
router.get('/', async (req, res) => {
  try {
    const agents = await openclawAgents.getAgents();

    const stats = {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      paused: agents.filter(a => a.status === 'paused').length,
      failed: agents.filter(a => a.status === 'failed').length,
      planned: agents.filter(a => a.status === 'planned').length
    };

    const healthScore = await openclawAgents.getAgentHealthScore();

    res.json({
      agents,
      stats,
      healthScore,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:agentId
 * Get specific agent details
 */
router.get('/:agentId', async (req, res) => {
  try {
    const agent = await openclawAgents.getAgent(req.params.agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const metrics = await openclawAgents.getAgentMetrics(req.params.agentId);

    res.json({
      agent,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/issues/all
 * Get all agent issues and alerts
 */
router.get('/issues/all', async (req, res) => {
  try {
    const issues = await openclawAgents.getAgentIssues();

    res.json({
      issues,
      count: issues.length,
      criticalCount: issues.filter(i => i.severity === 'critical').length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agent issues:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/health/score
 * Get overall agent health score
 */
router.get('/health/score', async (req, res) => {
  try {
    const healthScore = await openclawAgents.getAgentHealthScore();
    const agents = await openclawAgents.getAgents();

    const details = {
      overall: healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'caution' : 'critical',
      activeAgents: agents.filter(a => a.status === 'active').length,
      failedAgents: agents.filter(a => a.status === 'failed').length,
      averageSuccessRate: (agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length).toFixed(1),
      totalQueuedTasks: agents.reduce((sum, a) => sum + a.currentQueue, 0),
      totalEscalations: agents.reduce((sum, a) => sum + a.escalationsNeeded, 0)
    };

    res.json({
      healthScore: details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching health score:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:agentId/metrics
 * Get detailed metrics for an agent
 */
router.get('/:agentId/metrics', async (req, res) => {
  try {
    const metrics = await openclawAgents.getAgentMetrics(req.params.agentId);

    if (!metrics) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/status/summary
 * Get summary of agent statuses
 */
router.get('/status/summary', async (req, res) => {
  try {
    const agents = await openclawAgents.getAgents();

    const summary = {
      byStatus: {
        active: agents.filter(a => a.status === 'active'),
        paused: agents.filter(a => a.status === 'paused'),
        failed: agents.filter(a => a.status === 'failed'),
        planned: agents.filter(a => a.status === 'planned')
      },
      performanceRanking: agents
        .sort((a, b) => b.successRate - a.successRate)
        .map(a => ({
          id: a.id,
          name: a.name,
          successRate: a.successRate,
          tasksCompleted: a.tasksCompleted
        })),
      topIssues: agents
        .filter(a => a.status === 'failed' || a.successRate < 85 || a.currentQueue > 20)
        .map(a => ({
          agentId: a.id,
          agentName: a.name,
          issue: a.status === 'failed' ? 'FAILED' : a.successRate < 85 ? 'LOW_SUCCESS' : 'QUEUE_BUILDUP'
        }))
    };

    res.json({
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agent status summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
