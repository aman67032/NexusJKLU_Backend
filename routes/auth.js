import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Bus from '../models/Bus.js';
import { authLimiter } from '../middleware/security.js';
import { authenticate } from '../middleware/auth.js';
import { generateOTP, sendOTPEmail } from '../services/emailService.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const TOKEN_EXPIRY = '24h';

// Helper to format user response
const formatUser = async (user) => {
    const formatted = {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        emailVerified: user.emailVerified,
        profile: user.profile,
        createdAt: user.createdAt,
        rollNumber: user.rollNumber,
        jkluEmail: user.jkluEmail,
        studentType: user.studentType,
        pickupPoint: user.pickupPoint,
        hostelName: user.hostelName,
        roomNumber: user.roomNumber,
        priorityMatrix: user.priorityMatrix,
        busRoute: user.busRoute
    };
    return formatted;
};

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

// POST /register
router.post('/register',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required')
            .custom(value => {
                if (!value.endsWith('@jklu.edu.in')) {
                    throw new Error('Email must be @jklu.edu.in');
                }
                return true;
            }),
        body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('rollNumber').notEmpty().withMessage('Roll number is required'),
        body('studentType').isIn(['dayscholar', 'hosteler']).withMessage('Student type must be dayscholar or hosteler')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, name, password, rollNumber, studentType, busRoute, pickupPoint, hostelName, roomNumber, priorityMatrix } = req.body;

            // Check existing user
            const existingUser = await User.findOne({ 
                $or: [
                    { email: email.toLowerCase() },
                    { rollNumber }
                ]
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email or Roll Number already registered' });
            }

            // Hash password
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash(password, salt);

            // Generate OTP
            const otpCode = generateOTP();

            // Create user
            const user = new User({
                email: email.toLowerCase(),
                jkluEmail: email.toLowerCase(),
                name,
                rollNumber,
                passwordHash,
                studentType,
                busRoute,
                pickupPoint,
                hostelName,
                roomNumber,
                priorityMatrix,
                roles: ['student'],
                emailVerified: false,
                emailOtp: otpCode,
                emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000)
            });

            await user.save();

            // Handle dayscholar bus assignment
            if (studentType === 'dayscholar' && busRoute) {
                await Bus.findByIdAndUpdate(busRoute, {
                    $addToSet: { enrolledStudents: user._id }
                });
            }

            // Send OTP
            await sendOTPEmail(user.email, otpCode);

            res.status(201).json({
                success: true,
                message: 'OTP sent to your JKLU email',
                userId: user._id
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
);

// POST /verify-otp
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
            const user = await User.findOne({ email: email.toLowerCase() }).populate('busRoute');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.emailOtp !== otp || !user.emailOtpExpiry || user.emailOtpExpiry < new Date()) {
                return res.status(400).json({ error: 'Invalid or expired OTP' });
            }

            user.emailVerified = true;
            user.emailOtp = undefined;
            user.emailOtpExpiry = undefined;
            await user.save();

            const token = generateToken(user);
            const userResponse = await formatUser(user);

            res.json({
                access_token: token,
                token_type: 'bearer',
                user: userResponse
            });

        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({ error: 'Failed to verify OTP' });
        }
    }
);

// POST /resend-otp
router.post('/resend-otp',
    authLimiter,
    [body('email').isEmail().normalizeEmail()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { email } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });

            if (!user) {
                return res.json({ success: true, message: 'If email exists, a new OTP has been sent' });
            }

            const otpCode = generateOTP();
            user.emailOtp = otpCode;
            user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            await sendOTPEmail(user.email, otpCode);

            res.json({ success: true, message: 'New OTP sent successfully' });
        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({ error: 'Failed to resend OTP' });
        }
    }
);

// POST /login
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

            const user = await User.findOne({ email: email.toLowerCase() }).populate('busRoute');
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            if (!user.emailVerified) {
                return res.status(403).json({ error: 'Please verify your email first' });
            }

            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = generateToken(user);
            const userResponse = await formatUser(user);

            res.json({
                access_token: token,
                token_type: 'bearer',
                user: userResponse
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
);

// GET /me
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('busRoute');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userResponse = await formatUser(user);
        res.json(userResponse);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// PUT /profile
router.put('/profile', authenticate, async (req, res) => {
    try {
        const updateData = req.body;
        // Don't allow updating sensitive fields
        delete updateData.passwordHash;
        delete updateData.emailOtp;
        delete updateData.emailOtpExpiry;
        delete updateData.resetOtp;
        delete updateData.resetOtpExpiry;
        delete updateData.emailVerified;
        delete updateData.roles;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        ).populate('busRoute');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userResponse = await formatUser(user);
        res.json(userResponse);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Keep reset password route logic
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
                return res.json({ message: 'If the email exists, an OTP has been sent.' });
            }

            const otpCode = generateOTP();
            user.resetOtp = otpCode;
            user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            await sendOTPEmail(user.email, otpCode);

            res.json({ message: 'OTP sent successfully' });

        } catch (error) {
            console.error('Send OTP error:', error);
            res.status(500).json({ error: 'Failed to send OTP' });
        }
    }
);

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

            const salt = await bcrypt.genSalt(12);
            user.passwordHash = await bcrypt.hash(newPassword, salt);
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

export default router;
