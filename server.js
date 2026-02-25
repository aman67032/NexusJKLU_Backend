import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { securityHeaders, generalLimiter, sanitizeInputs } from './middleware/security.js';

// Routes
import authRoutes from './routes/auth.js';
import learnCoursesRoutes from './routes/learn/courses.js';
import learnContestsRoutes from './routes/learn/contests.js';
import councilRoutes from './routes/council/index.js';
import voiceRoutes from './routes/voice/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for Vercel / reverse proxy)
app.set('trust proxy', 1);

// Security
app.use(securityHeaders);
app.use(generalLimiter);

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS policy violation'), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInputs);

// Health check
app.get('/', (req, res) => {
    res.json({
        message: '🚀 NexusJKLU API is running',
        version: '1.0.0',
        modules: ['learn', 'council', 'voice'],
        health: '/health',
    });
});

app.get('/health', async (req, res) => {
    try {
        const mongoose = (await import('mongoose')).default;
        const dbState = mongoose.connection.readyState;
        const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

        res.json({
            status: dbState === 1 ? 'OK' : 'DEGRADED',
            timestamp: new Date().toISOString(),
            database: states[dbState] || 'unknown',
            uptime: process.uptime(),
        });
    } catch (error) {
        res.status(503).json({ status: 'ERROR', error: error.message });
    }
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/learn', learnCoursesRoutes);
app.use('/api/learn', learnContestsRoutes);
app.use('/api/council', councilRoutes);
app.use('/api/voice', voiceRoutes);

// Error handling
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error('Error:', err.stack);
    } else {
        console.error('Error:', err.message);
    }

    if (err.message?.includes('CORS')) {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'An error occurred'
            : err.message || 'Something went wrong',
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 NexusJKLU Backend running on port ${PORT}`);
            console.log(`🌐 API: http://localhost:${PORT}/api`);
            console.log(`📚 Learn: /api/learn/*`);
            console.log(`🏛  Council: /api/council/*`);
            console.log(`🗣  Voice: /api/voice/*`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
