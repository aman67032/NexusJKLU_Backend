import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { securityHeaders, generalLimiter, sanitizeInputs } from './middleware/security.js';

// Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import learnCoursesRoutes from './routes/learn/courses.js';
import learnContestsRoutes from './routes/learn/contests.js';
import councilRoutes from './routes/council/index.js';
import voiceRoutes from './routes/voice/index.js';
import busRoutes from './routes/bus.js';
import shuttleRoutes from './routes/shuttle.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for Vercel / reverse proxy)
app.set('trust proxy', 1);

// --- 1. CORS Configuration ---
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (
            origin.startsWith('http://localhost') ||
            origin.endsWith('.vercel.app') ||
            origin === 'https://nexus-jklu.vercel.app'
        ) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all origins to prevent CORS errors on Vercel deployment
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
}));

// Preflight handler
app.options('*', cors());

// Explicit CORS headers middleware fallback
app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// --- 2. Security Headers & Rate Limiting ---
app.use(securityHeaders);
app.use(generalLimiter);

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
        modules: ['learn', 'council', 'voice', 'transport'],
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
app.use('/api/admin', adminRoutes);
app.use('/api/learn', learnCoursesRoutes);
app.use('/api/learn', learnContestsRoutes);
app.use('/api/council', councilRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/bus', busRoutes);
app.use('/api/shuttle', shuttleRoutes);


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

// Auto-connect DB middleware for serverless
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('DB middleware error:', err);
        next();
    }
});

// Connect to MongoDB and start server for local dev
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 NexusJKLU Backend running on port ${PORT}`);
            console.log(`🌐 API: http://localhost:${PORT}/api`);
            console.log(`📚 Learn: /api/learn/*`);
            console.log(`🏛  Council: /api/council/*`);
            console.log(`🗣  Voice: /api/voice/*`);
            console.log(`🚌 Transport: /api/bus/*, /api/shuttle/*`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};

if (!process.env.VERCEL) {
    startServer();
}

export default app;
