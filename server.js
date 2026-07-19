import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
// express-mongo-sanitize removed: incompatible with Express 5 (req.query is read-only)
// Using a custom inline sanitizer instead

// Database connection logic
import connectDB from './config/database.js';

// Global error handling middleware
import errorHandler from './middleware/errorHandler.js';

// Route files
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';

// Initialize environment variables configuration from .env file
dotenv.config();

/* --- 1. Startup Environment Validation --- */

/**
 * Validates that all required environment variables are present before booting the server.
 * If any are missing, logs description details and exits the process immediately.
 */
const checkRequiredEnvVars = () => {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`[Fatal Startup Error] Missing required environment variable(s): ${missingVars.join(', ')}`);
    // Exit process with failure status code
    process.exit(1);
  }
};

// Execute startup validation checks
checkRequiredEnvVars();

// Establish connection to MongoDB Atlas database
connectDB();

const app = express();

/* --- 2. Security Middleware Configurations --- */

// Helmet middleware adds standard secure HTTP headers for security hardening (XSS, clickjacking prevention)
app.use(helmet());

// MongoDB Query Injection Protection: custom sanitizer compatible with Express 5
// express-mongo-sanitize v2.x tries to overwrite req.query which is read-only in Express 5
const sanitizeValue = (val) => {
  if (val && typeof val === 'object') {
    for (const key of Object.keys(val)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete val[key];
      } else {
        sanitizeValue(val[key]);
      }
    }
  }
  return val;
};
app.use((req, _res, next) => {
  if (req.body) sanitizeValue(req.body);
  if (req.params) sanitizeValue(req.params);
  next();
});

// Dynamic CORS Whitelist restriction for production deployment
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_ALT, // optional secondary frontend URL
].filter(Boolean); // Filter any empty/missing values

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, curl, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    // Allow exact whitelisted origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow all Vercel preview deployment URLs (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // Allow localhost in development
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

/* --- 3. Rate Limiter Middleware Configurations --- */

// General rate limiter: Capped at 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

// Stricter authentication rate limiter: Capped at 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many auth attempts. Please wait 15 minutes.',
  },
});

// Mount general rate limiters on all API routes
app.use('/api/', generalLimiter);

// Mount stricter rate limiters specifically on authentication endpoints
app.use('/api/auth/', authLimiter);

/* --- 4. Request Logging Configurations --- */

// Production log format combines request IP, user, method, status, byte length, referrer, and user-agent
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// Body parser: parses incoming request JSON. Restricts payload body size limit to 10kb
app.use(express.json({ limit: '10kb' }));

// URL Encoded parser: parses incoming form-urlencoded payloads
app.use(express.urlencoded({ extended: true }));

/* --- 5. Application Route Mapping --- */

// API Health Check Route - Used by monitoring systems or automated deployment checks
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
  });
});

// Primary Business Modules Routing
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);

// Global Error Handler catches all exceptions bubble-up from controllers. Must be registered LAST.
app.use(errorHandler);

/* --- 6. Server Initialization & Graceful Shutdown --- */

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

/**
 * Handle graceful shutdowns cleanly on signals (SIGINT, SIGTERM).
 * Closes the HTTP server, then disconnects active MongoDB connections before exiting.
 *
 * @param {string} signal - Trigger signal name
 */
const handleGracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Server shutting down gracefully.`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database connection close:', err);
      process.exit(1);
    }
  });
};

// Intercept SIGINT (e.g. Ctrl+C in terminal) and SIGTERM (e.g. Heroku/Railway shutdown triggers)
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections during runtime execution
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
