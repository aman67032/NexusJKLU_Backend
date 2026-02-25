import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authLimiter } from '../middleware/security.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const TOKEN_EXPIRY = '24h';

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to match your env config
    auth: {
        user: process.env.SMTP_USER || process.env.GMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.GMAIL_PASS,
    },
});

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

// POST /api/auth/send-otp
router.post('/send-otp',
    authLimiter,
    [body('email').isEmail().normalizeEmail()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { email } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });

            if (!user) {
                // Prevent email enumeration
                return res.json({ message: 'If the email exists, an OTP has been sent.' });
            }

            // Generate 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

            // Set expiry to 10 minutes from now
            user.resetOtp = otpCode;
            user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            // Send Email
            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER,
                to: user.email,
                subject: 'NexusJKLU - Password Reset OTP',
                html: `
                    <div style="font-family: Arial, sans-serif; max-w-md; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                        <h2 style="color: #3b82f6;">NexusJKLU Password Reset</h2>
                        <p>You requested a password reset. Your One-Time Password (OTP) is:</p>
                        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                            <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111827;">${otpCode}</span>
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
                        <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
                    </div>
                `,
            };

            if (process.env.SMTP_USER || process.env.GMAIL_USER) {
                await transporter.sendMail(mailOptions);
            } else {
                console.log(`[DEV MODE] OTP for ${user.email} is: ${otpCode}`);
            }

            res.json({ message: 'OTP sent successfully' });

        } catch (error) {
            console.error('Send OTP error:', error);
            res.status(500).json({ error: 'Failed to send OTP' });
        }
    }
);

// POST /api/auth/verify-otp (Optional pre-check before reset, or auto-login for legacy flow)
router.post('/verify-otp',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('otp').isString().isLength({ min: 6, max: 6 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { email, otp } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });

            if (!user || user.resetOtp !== otp || !user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
                return res.status(400).json({ error: 'Invalid or expired OTP' });
            }

            // Legacy flow issued a token immediately upon OTP verification
            // Generating token
            const token = generateToken(user);

            // Mark email as verified if it wasn't already
            if (!user.emailVerified) {
                user.emailVerified = true;
                await user.save();
            }

            res.json({
                message: 'OTP verified successfully',
                access_token: token,
                token_type: 'bearer',
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles,
                }
            });

        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({ error: 'Failed to verify OTP' });
        }
    }
);

// POST /api/auth/reset-password
router.post('/reset-password',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('otp').isString().isLength({ min: 6, max: 6 }),
        body('newPassword').isString().isLength({ min: 6 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { email, otp, newPassword } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });

            if (!user || user.resetOtp !== otp || !user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
                return res.status(400).json({ error: 'Invalid or expired OTP' });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(12);
            user.passwordHash = await bcrypt.hash(newPassword, salt);

            // Clear OTP
            user.resetOtp = undefined;
            user.resetOtpExpiry = undefined;
            user.emailVerified = true;

            await user.save();

            res.json({ message: 'Password reset successfully' });

        } catch (error) {
            console.error('Reset Password error:', error);
            res.status(500).json({ error: 'Failed to reset password' });
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
