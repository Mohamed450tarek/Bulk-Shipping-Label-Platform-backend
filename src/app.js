const express = require('express');
const cors = require('cors');
const path = require('path');

const { errorHandler, notFoundHandler } = require('./shared/middleware/errorhandler');
const { requestLogger } = require('./shared/middleware/requestlogger');
const logger = require('./shared/logger.js');

// Import module routers
const batchRoutes = require('./Batchmodule/Batch.routes.js');
const addressRoutes = require('./AddressModule/Address.routes.js');
const shippingRoutes = require('./ShippingModule/Shipping.routes.js');
//const authRoutes = require('./auth service/authroute');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount module routers
app.use('/api/batch', batchRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/shipping', shippingRoutes);
//app.use('/api/auth', authRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;