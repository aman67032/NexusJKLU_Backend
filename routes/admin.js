import express from 'express';
import User from '../models/User.js';
import Paper from '../models/Paper.js';
import Event from '../models/Event.js';
import Complaint from '../models/Complaint.js';
import Council from '../models/Council.js';
import Club from '../models/Club.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { authorize, canAssignRoles } from '../middleware/permissions.js';

const router = express.Router();

// Middleware to ensure user is at least an admin of some sort
// We keep the old requireAnyAdmin for simple basic 'is this an admin' checks 
// where specific module permissions aren't needed.
const requireAnyAdmin = requireRole('admin', 'super_admin', 'council_admin', 'learn_admin', 'voice_admin');

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
router.get('/users', authenticate, authorize(canAssignRoles), async (req, res) => {
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
router.put('/users/:id/role', authenticate, authorize(canAssignRoles), async (req, res) => {
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

// ==========================================
// ORGANIZATIONS MANAGEMENT (COUNCILS & CLUBS)
// ==========================================

// --- Councils CRUD ---

// Get all councils
router.get('/councils', authenticate, requireAnyAdmin, async (req, res) => {
    try {
        const councils = await Council.find()
            .populate('presidentId', 'name email roles')
            .populate('adminId', 'name email roles')
            .populate('headStudentAffairsId', 'name email roles')
            .populate('executiveStudentAffairsId', 'name email roles')
            .sort({ name: 1 })
            .lean();
        res.json(councils);
    } catch (error) {
        console.error('Fetch councils error:', error);
        res.status(500).json({ error: 'Failed to fetch councils' });
    }
});

// Create council
router.post('/councils', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const newCouncil = new Council(req.body);
        await newCouncil.save();
        res.status(201).json(newCouncil);
    } catch (error) {
        console.error('Create council error:', error);
        res.status(500).json({ error: 'Failed to create council' });
    }
});

// Update council
router.put('/councils/:id', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        // Find existing to see if we need to auto-assign roles
        const council = await Council.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!council) return res.status(404).json({ error: 'Council not found' });

        // Auto-assign roles mapping if IDs are provided
        const roleMappings = [
            { id: req.body.presidentId, role: 'council_president' },
            { id: req.body.adminId, role: 'council_admin' },
            { id: req.body.headStudentAffairsId, role: 'head_student_affairs' },
            { id: req.body.executiveStudentAffairsId, role: 'executive_student_affairs' }
        ];

        for (const mapping of roleMappings) {
            if (mapping.id) {
                await User.findByIdAndUpdate(mapping.id, { $addToSet: { roles: mapping.role } });
            }
        }

        res.json(council);
    } catch (error) {
        console.error('Update council error:', error);
        res.status(500).json({ error: 'Failed to update council' });
    }
});

// Delete council
router.delete('/councils/:id', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const council = await Council.findByIdAndDelete(req.params.id);
        if (!council) return res.status(404).json({ error: 'Council not found' });
        res.json({ message: 'Council deleted successfully' });
    } catch (error) {
        console.error('Delete council error:', error);
        res.status(500).json({ error: 'Failed to delete council' });
    }
});

// --- Clubs CRUD ---

// Get all clubs
router.get('/clubs', authenticate, requireAnyAdmin, async (req, res) => {
    try {
        const clubs = await Club.find()
            .populate('councilId', 'name')
            .populate('chairId', 'name email roles')
            .populate('coChairId', 'name email roles')
            .populate('secretaryId', 'name email roles')
            .populate('generalSecretaryId', 'name email roles')
            .sort({ name: 1 })
            .lean();
        res.json(clubs);
    } catch (error) {
        console.error('Fetch clubs error:', error);
        res.status(500).json({ error: 'Failed to fetch clubs' });
    }
});

// Create club
router.post('/clubs', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const newClub = new Club(req.body);
        await newClub.save();
        res.status(201).json(newClub);
    } catch (error) {
        console.error('Create club error:', error);
        res.status(500).json({ error: 'Failed to create club' });
    }
});

// Update club
router.put('/clubs/:id', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const club = await Club.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // Auto-assign roles mapping if IDs are provided
        const roleMappings = [
            { id: req.body.chairId, role: 'club_chair' },
            { id: req.body.coChairId, role: 'club_co_chair' },
            { id: req.body.secretaryId, role: 'club_secretary' },
            { id: req.body.generalSecretaryId, role: 'club_general_secretary' }
        ];

        for (const mapping of roleMappings) {
            if (mapping.id) {
                await User.findByIdAndUpdate(mapping.id, { $addToSet: { roles: mapping.role } });
            }
        }

        res.json(club);
    } catch (error) {
        console.error('Update club error:', error);
        res.status(500).json({ error: 'Failed to update club' });
    }
});

// Delete club
router.delete('/clubs/:id', authenticate, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const club = await Club.findByIdAndDelete(req.params.id);
        if (!club) return res.status(404).json({ error: 'Club not found' });
        res.json({ message: 'Club deleted successfully' });
    } catch (error) {
        console.error('Delete club error:', error);
        res.status(500).json({ error: 'Failed to delete club' });
    }
});

export default router;
