import express from 'express';
import User from '../models/User.js';
import Paper from '../models/Paper.js';
import Event from '../models/Event.js';
import Complaint from '../models/Complaint.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Middleware to ensure user is at least an admin of some sort
const requireAnyAdmin = authorizeRoles('admin', 'council_admin', 'learn_admin', 'voice_admin');

// GET /api/admin/stats
// Returns global statistics for the overview dashboard
router.get('/stats', authenticate, requireAnyAdmin, async (req, res) => {
    try {
        const stats = {
            users: await User.countDocuments(),
            pendingPapers: await Paper.countDocuments({ status: 'pending' }),
            pendingEvents: await Event.countDocuments({ status: 'pending' }),
            openComplaints: await Complaint.countDocuments({ status: 'open' }),
            inProgressComplaints: await Complaint.countDocuments({ status: 'in_progress' }),
        };

        res.json(stats);
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// GET /api/admin/users
// Returns a list of users, searchable and paginated
router.get('/users', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ]
            };
        }

        const users = await User.find(query)
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalUsers: count
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PUT /api/admin/users/:id/role
// Update a user's roles
router.put('/users/:id/role', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const { roles } = req.body;

        if (!roles || !Array.isArray(roles)) {
            return res.status(400).json({ error: 'Roles must be an array' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent self-demotion from super admin via api to avoid lockout
        if (req.user.id === user.id.toString() && !roles.includes('admin') && user.roles.includes('admin')) {
            return res.status(400).json({ error: 'Cannot remove your own admin role.' });
        }

        user.roles = roles;
        await user.save();

        res.json({ message: 'Roles updated successfully', roles: user.roles });
    } catch (error) {
        console.error('Admin role update error:', error);
        res.status(500).json({ error: 'Failed to update user roles' });
    }
});

export default router;
