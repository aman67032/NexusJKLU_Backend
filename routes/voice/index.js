import express from 'express';
import { body, validationResult } from 'express-validator';
import Complaint from '../../models/Complaint.js';
import User from '../../models/User.js';
import { authenticate, requireRole, optionalAuth } from '../../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ===== COMPLAINTS =====

// GET /api/voice/complaints — list complaints (public: only resolved, auth: own)
router.get('/complaints', optionalAuth, async (req, res) => {
    try {
        const { status, category, page = 1, limit = 20, mine } = req.query;
        const filter = {};

        if (mine === 'true' && req.user) {
            filter.userId = req.user.id;
        } else if (!req.user || !req.user.roles?.some(r => ['admin', 'voice_admin'].includes(r))) {
            // Public view — only show resolved/open non-anonymous or user's own
            filter.$or = [
                { status: 'resolved' },
                { status: 'open', isAnonymous: false },
            ];
        }

        if (status) filter.status = status;
        if (category) filter.category = category;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [complaints, total] = await Promise.all([
            Complaint.find(filter)
                .populate('userId', 'name email')
                .populate('respondedBy', 'name')
                .select(filter.isAnonymous ? '-userId' : '')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Complaint.countDocuments(filter),
        ]);

        // Hide identity for anonymous complaints
        const sanitized = complaints.map(c => {
            const obj = c.toObject();
            if (obj.isAnonymous) {
                obj.userId = null;
            }
            return obj;
        });

        res.json({
            items: sanitized,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// GET /api/voice/complaints/:id
router.get('/complaints/:id', optionalAuth, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('respondedBy', 'name');
        if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

        const obj = complaint.toObject();
        if (obj.isAnonymous && (!req.user || !req.user.roles?.some(r => ['admin', 'voice_admin'].includes(r)))) {
            obj.userId = null;
        }
        res.json(obj);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch complaint' });
    }
});

// POST /api/voice/complaints — submit complaint
router.post('/complaints', authenticate,
    [
        body('title').trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
        body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
        body('category').isIn(['academic', 'infrastructure', 'hostel', 'food', 'transportation', 'administration', 'other']),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { title, description, category, priority, isAnonymous } = req.body;

            const complaint = new Complaint({
                ticketId: `TKT-${uuidv4().slice(0, 8).toUpperCase()}`,
                userId: req.user.id,
                isAnonymous: isAnonymous || false,
                title,
                description,
                category,
                priority: priority || 'medium',
                status: 'open',
            });

            await complaint.save();
            res.status(201).json(complaint);
        } catch (error) {
            console.error('Create complaint error:', error);
            res.status(500).json({ error: 'Failed to submit complaint' });
        }
    }
);

// POST /api/voice/complaints/:id/upvote
router.post('/complaints/:id/upvote', authenticate, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

        const alreadyUpvoted = complaint.upvotedBy.some(
            id => id.toString() === req.user.id
        );

        if (alreadyUpvoted) {
            // Remove upvote
            complaint.upvotedBy = complaint.upvotedBy.filter(id => id.toString() !== req.user.id);
            complaint.upvotes = Math.max(0, complaint.upvotes - 1);
        } else {
            complaint.upvotedBy.push(req.user.id);
            complaint.upvotes += 1;
        }

        await complaint.save();
        res.json({ upvotes: complaint.upvotes, upvoted: !alreadyUpvoted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upvote' });
    }
});

// ===== ADMIN =====

// GET /api/voice/admin/complaints — all complaints for admin
router.get('/admin/complaints', authenticate, requireRole('admin', 'voice_admin'), async (req, res) => {
    try {
        const { status, category, priority, page = 1, limit = 20, search } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { ticketId: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [complaints, total] = await Promise.all([
            Complaint.find(filter)
                .populate('userId', 'name email')
                .populate('respondedBy', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Complaint.countDocuments(filter),
        ]);

        res.json({
            items: complaints,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// PUT /api/voice/admin/complaints/:id — respond/update complaint
router.put('/admin/complaints/:id', authenticate, requireRole('admin', 'voice_admin'), async (req, res) => {
    try {
        const { status, response } = req.body;
        const updateData = {};

        if (status) updateData.status = status;
        if (response) {
            updateData.response = response;
            updateData.respondedBy = req.user.id;
            updateData.respondedAt = new Date();
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        ).populate('userId', 'name email').populate('respondedBy', 'name');

        if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

// GET /api/voice/admin/stats
router.get('/admin/stats', authenticate, requireRole('admin', 'voice_admin'), async (req, res) => {
    try {
        const [total, open, inProgress, resolved, closed] = await Promise.all([
            Complaint.countDocuments(),
            Complaint.countDocuments({ status: 'open' }),
            Complaint.countDocuments({ status: 'in_progress' }),
            Complaint.countDocuments({ status: 'resolved' }),
            Complaint.countDocuments({ status: 'closed' }),
        ]);

        // Category breakdown
        const categoryStats = await Complaint.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        res.json({ total, open, inProgress, resolved, closed, categoryStats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
