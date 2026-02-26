import express from 'express';
import { body, validationResult } from 'express-validator';
import Council from '../../models/Council.js';
import Club from '../../models/Club.js';
import Event from '../../models/Event.js';
import Certificate from '../../models/Certificate.js';
import Coordinator from '../../models/Coordinator.js';
import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/permissions.js';
import * as perms from '../../middleware/permissions.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ===== COUNCILS =====

// GET /api/council/councils
router.get('/councils', async (req, res) => {
    try {
        const councils = await Council.find({ isActive: true }).sort({ name: 1 });
        res.json(councils);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch councils' });
    }
});

// GET /api/council/councils/:slug
router.get('/councils/:slug', async (req, res) => {
    try {
        const council = await Council.findOne({ slug: req.params.slug });
        if (!council) return res.status(404).json({ error: 'Council not found' });
        res.json(council);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch council' });
    }
});

// POST /api/council/councils (admin)
router.post('/councils', authenticate, authorize(perms.canManageCouncils),
    [body('name').trim().notEmpty(), body('slug').trim().notEmpty()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const council = new Council(req.body);
            await council.save();
            res.status(201).json(council);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create council' });
        }
    }
);

// PUT /api/council/councils/:id
router.put('/councils/:id', authenticate, authorize(perms.canManageCouncils), async (req, res) => {
    try {
        const council = await Council.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!council) return res.status(404).json({ error: 'Council not found' });
        res.json(council);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update council' });
    }
});

// ===== CLUBS =====

// GET /api/council/clubs
router.get('/clubs', async (req, res) => {
    try {
        const { councilId, category } = req.query;
        const filter = { isActive: true };
        if (councilId) filter.councilId = councilId;
        if (category) filter.category = category;

        const clubs = await Club.find(filter)
            .populate('councilId', 'name slug')
            .sort({ name: 1 });
        res.json(clubs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch clubs' });
    }
});

// GET /api/council/clubs/:slug
router.get('/clubs/:slug', async (req, res) => {
    try {
        const club = await Club.findOne({ slug: req.params.slug })
            .populate('councilId', 'name slug');
        if (!club) return res.status(404).json({ error: 'Club not found' });
        res.json(club);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch club' });
    }
});

// POST /api/council/clubs (admin)
router.post('/clubs', authenticate, authorize(perms.canManageClubs),
    [body('name').trim().notEmpty(), body('slug').trim().notEmpty()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const club = new Club(req.body);
            await club.save();
            res.status(201).json(club);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create club' });
        }
    }
);

// PUT /api/council/clubs/:id
router.put('/clubs/:id', authenticate, authorize(perms.canManageClubs), async (req, res) => {
    try {
        const club = await Club.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!club) return res.status(404).json({ error: 'Club not found' });
        res.json(club);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update club' });
    }
});

// ===== EVENTS =====

// GET /api/council/events
router.get('/events', async (req, res) => {
    try {
        const { clubId, councilId, status, category, upcoming, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (clubId) filter.clubId = clubId;
        if (councilId) filter.councilId = councilId;
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (upcoming === 'true') filter.date = { $gte: new Date() };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [events, total] = await Promise.all([
            Event.find(filter)
                .populate('clubId', 'name slug')
                .populate('councilId', 'name slug')
                .populate('organizerId', 'name email')
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Event.countDocuments(filter),
        ]);

        res.json({ items: events, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// GET /api/council/events/:id
router.get('/events/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('clubId', 'name slug image')
            .populate('councilId', 'name slug')
            .populate('organizerId', 'name email');
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// POST /api/council/events
router.post('/events', authenticate, authorize(perms.canCreateEvents),
    [body('title').trim().notEmpty(), body('date').notEmpty()],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const event = new Event({
                ...req.body,
                organizerId: req.user.id,
                status: req.user.roles.includes('admin') ? 'approved' : 'pending',
            });
            await event.save();
            res.status(201).json(event);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create event' });
        }
    }
);

// PUT /api/council/events/:id
router.put('/events/:id', authenticate, authorize(perms.canCreateEvents), async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// PUT /api/council/events/:id/approve
router.put('/events/:id/approve', authenticate, authorize(perms.canApproveEvents), async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() } },
            { new: true }
        );
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve event' });
    }
});

// POST /api/council/events/:id/register — register for event
router.post('/events/:id/register', authenticate, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const alreadyRegistered = event.registeredParticipants.some(
            p => p.userId.toString() === req.user.id
        );
        if (alreadyRegistered) return res.status(400).json({ error: 'Already registered' });

        if (event.maxParticipants && event.registeredParticipants.length >= event.maxParticipants) {
            return res.status(400).json({ error: 'Event is full' });
        }

        event.registeredParticipants.push({ userId: req.user.id });
        await event.save();
        res.json({ message: 'Registered successfully', participants: event.registeredParticipants.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to register' });
    }
});

// DELETE /api/council/events/:id
router.delete('/events/:id', authenticate, authorize(perms.canApproveEvents), async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// ===== CERTIFICATES =====

// GET /api/council/certificates — user's certificates
router.get('/certificates', authenticate, async (req, res) => {
    try {
        const certificates = await Certificate.find({ userId: req.user.id })
            .populate('eventId', 'title date')
            .sort({ issuedAt: -1 });
        res.json(certificates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
});

// POST /api/council/certificates (admin)
router.post('/certificates', authenticate, authorize(perms.canGenerateCertificates), async (req, res) => {
    try {
        const { userId, eventId, title, description, issuedBy, type } = req.body;
        const certificate = new Certificate({
            userId,
            eventId,
            title,
            description,
            issuedBy,
            type,
            certificateId: `CERT-${uuidv4().slice(0, 8).toUpperCase()}`,
        });
        await certificate.save();
        res.status(201).json(certificate);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create certificate' });
    }
});

// GET /api/council/certificates/verify/:certificateId
router.get('/certificates/verify/:certificateId', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ certificateId: req.params.certificateId })
            .populate('userId', 'name email')
            .populate('eventId', 'title date');
        if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
        res.json(certificate);
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify certificate' });
    }
});

// ===== COORDINATORS =====

// GET /api/council/coordinators
router.get('/coordinators', async (req, res) => {
    try {
        const { councilId, clubId } = req.query;
        const filter = { isActive: true };
        if (councilId) filter.councilId = councilId;
        if (clubId) filter.clubId = clubId;

        const coordinators = await Coordinator.find(filter)
            .populate('userId', 'name email profile')
            .populate('councilId', 'name slug')
            .populate('clubId', 'name slug');
        res.json(coordinators);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coordinators' });
    }
});

// POST /api/council/coordinators (admin)
router.post('/coordinators', authenticate, authorize(perms.canManageClubs), async (req, res) => {
    try {
        const coordinator = new Coordinator(req.body);
        await coordinator.save();

        // Add coordinator role to user
        await User.findByIdAndUpdate(req.body.userId, { $addToSet: { roles: 'coordinator' } });

        res.status(201).json(coordinator);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create coordinator' });
    }
});

// ===== NOTIFICATIONS =====

// GET /api/council/notifications
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [{ userId: req.user.id }, { userId: null }],
            module: { $in: ['council', 'system'] },
        }).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PUT /api/council/notifications/:id/read
router.put('/notifications/:id/read', authenticate, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { $set: { read: true } },
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notification' });
    }
});

// ===== ANALYTICS =====

// GET /api/council/analytics
router.get('/analytics', authenticate, authorize(perms.canViewAnalytics), async (req, res) => {
    try {
        const [totalEvents, totalClubs, totalCouncils, upcomingEvents, pendingEvents] = await Promise.all([
            Event.countDocuments(),
            Club.countDocuments({ isActive: true }),
            Council.countDocuments({ isActive: true }),
            Event.countDocuments({ date: { $gte: new Date() }, status: 'approved' }),
            Event.countDocuments({ status: 'pending' }),
        ]);

        res.json({ totalEvents, totalClubs, totalCouncils, upcomingEvents, pendingEvents });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

export default router;
