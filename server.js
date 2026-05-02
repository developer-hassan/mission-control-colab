import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
import agentRoutes from './api/routes/agents.js';
import adsRoutes from './api/routes/ads.js';
import leadRoutes from './api/routes/leads.js';
import overviewRoutes from './api/routes/overview.js';
import jobberRoutes from './api/routes/jobber.js';
import integrationsRoutes from './api/routes/integrations.js';
import healthRoutes from './api/routes/health.js';

// Mount routes
app.use('/api/agents', agentRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/jobber', jobberRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Scoopy Doo Mission Control API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      agents: '/api/agents',
      ads: '/api/ads',
      leads: '/api/leads',
      overview: '/api/overview',
      jobber: '/api/jobber',
      integrations: '/api/integrations',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     SCOOPY DOO LLC - MISSION CONTROL BACKEND API          ║
║                                                            ║
║  🚀 Server running on http://localhost:${PORT}             ║
║  📊 Dashboard: http://localhost:${PORT}/../../../public/index.html   ║
║                                                            ║
║  Ready to manage business operations!                      ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
