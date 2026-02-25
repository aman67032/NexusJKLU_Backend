import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authLimiter } from '../middleware/security.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const TOKEN_EXPIRY = '24h';

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            name: user.name,
            roles: user.roles,
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

// POST /api/auth/register
router.post('/register',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, name, password } = req.body;

            // Check existing user
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Hash password
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash(password, salt);

            // Create user
            const user = new User({
                email: email.toLowerCase(),
                name,
                passwordHash,
                roles: ['student'],
            });

            await user.save();

            // Generate token
            const token = generateToken(user);

            res.status(201).json({
                access_token: token,
                token_type: 'bearer',
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles,
                    emailVerified: user.emailVerified,
                    profile: user.profile,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
);

// POST /api/auth/login
router.post('/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check password
            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Generate token
            const token = generateToken(user);

            res.json({
                access_token: token,
                token_type: 'bearer',
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles,
                    emailVerified: user.emailVerified,
                    profile: user.profile,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
);

// GET /api/auth/me — Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash -resetOtp -resetOtpExpiry');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            roles: user.roles,
            emailVerified: user.emailVerified,
            idVerified: user.idVerified,
            profile: user.profile,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// PUT /api/auth/profile — Update profile
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { name, profile } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (profile) updateData.profile = profile;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true, select: '-passwordHash -resetOtp -resetOtpExpiry' }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            roles: user.roles,
            emailVerified: user.emailVerified,
            profile: user.profile,
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
