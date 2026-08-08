import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';

const app = express();

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (simple console output)
app.use((req, res, next) => {
  console.log(`[Request] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', routes);

// Health check endpoint (explicitly required)
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API is running',
  });
});

// Catch-all route to trigger NotFoundError
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.url} not found`));
});

// Centralized error handler
app.use(errorHandler);

export default app;
