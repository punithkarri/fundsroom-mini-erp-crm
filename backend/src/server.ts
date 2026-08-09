import dotenv from 'dotenv';
// Load environment variables before importing app
dotenv.config();

import app from './app';
import prisma from './config/db';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Listen on PORT immediately so Render health checks succeed
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  try {
    // Verify database connection asynchronously
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected successfully!');
  } catch (error) {
    console.error('Failed to connect to database on startup:', error);
    // We do not exit the process, allowing the server to remain active and health check to respond.
  }
};

startServer();
