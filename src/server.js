const dotenv = require('dotenv');
dotenv.config();
const app = require('./app.js');
const { connectDB } = require('./shared/db.js');
const logger = require('./shared/logger.js');

const PORT = process.env.PORT || 3000;


async function startServer() {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
