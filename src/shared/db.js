 const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    //const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bulk-shipping';
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/bulk-shipping';
    
    await mongoose.connect(uri);
    
    logger.info('MongoDB connected successfully', { 
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    throw error;
  }
};

module.exports = { connectDB, mongoose };