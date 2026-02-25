import express from 'express';
import { body, validationResult } from 'express-validator';
import Contest from '../../models/Contest.js';
import Announcement from '../../models/Announcement.js';
import { authenticate, requireRole, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

// ===== CONTESTS =====

// GET /api/learn/contests — list all contests
router.get('/contests', async (req, res) => {
    try {
        const { courseId } = req.query;
        const filter = {};
        if (courseId) filter.courseId = courseId;

        const contests = await Contest.find(filter)
            .populate('courseId', 'code name')
            .sort({ createdAt: -1 });
        res.json(contests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contests' });
    }
});

// GET /api/learn/contests/:id
router.get('/contests/:id', async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id)
            .populate('courseId', 'code name');
        if (!contest) return res.status(404).json({ error: 'Contest not found' });
        res.json(contest);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contest' });
    }
});

// POST /api/learn/contests (admin/coding_ta)
router.post('/contests', authenticate, requireRole('admin', 'learn_admin', 'coding_ta'),
    [
        body('courseId').notEmpty(),
        body('date').trim().notEmpty(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { courseId, date, title, description, questions } = req.body;

            const existing = await Contest.findOne({ date });
            if (existing) return res.status(400).json({ error: 'Contest with this date already exists' });

            const contest = new Contest({
                courseId,
                date,
                title,
                description,
                questions: questions || [],
            });

            await contest.save();
            res.status(201).json(contest);
        } catch (error) {
            console.error('Create contest error:', error);
            res.status(500).json({ error: 'Failed to create contest' });
        }
    }
);

// PUT /api/learn/contests/:id
router.put('/contests/:id', authenticate, requireRole('admin', 'learn_admin', 'coding_ta'), async (req, res) => {
    try {
        const { date, title, description, questions } = req.body;
        const updateData = {};
        if (date) updateData.date = date;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (questions) updateData.questions = questions;

        const contest = await Contest.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        if (!contest) return res.status(404).json({ error: 'Contest not found' });
        res.json(contest);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update contest' });
    }
});

// DELETE /api/learn/contests/:id
router.delete('/contests/:id', authenticate, requireRole('admin', 'learn_admin', 'coding_ta'), async (req, res) => {
    try {
        const contest = await Contest.findByIdAndDelete(req.params.id);
        if (!contest) return res.status(404).json({ error: 'Contest not found' });
        res.json({ message: 'Contest deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete contest' });
    }
});

// POST /api/learn/contests/:id/questions — Add question to contest
router.post('/contests/:id/questions', authenticate, requireRole('admin', 'learn_admin', 'coding_ta'), async (req, res) => {
    try {
        const { title, question, codeSnippets, explanation, mediaLink, order } = req.body;
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ error: 'Contest not found' });

        contest.questions.push({ title, question, codeSnippets, explanation, mediaLink, order });
        await contest.save();
        res.status(201).json(contest);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add question' });
    }
});

// ===== ANNOUNCEMENTS =====

// GET /api/learn/announcements
router.get('/announcements', async (req, res) => {
    try {
        const { courseId } = req.query;
        const filter = {};
        if (courseId) filter.courseId = courseId;

        const announcements = await Announcement.find(filter)
            .populate('courseId', 'code name')
            .sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// POST /api/learn/announcements
router.post('/announcements', authenticate, requireRole('admin', 'learn_admin', 'coding_ta'),
    [
        body('title').trim().notEmpty(),
        body('content').trim().notEmpty(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { title, content, courseId, attachmentUrl } = req.body;
            const announcement = new Announcement({ title, content, courseId, attachmentUrl });
            await announcement.save();
            res.status(201).json(announcement);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create announcement' });
        }
    }
);

// DELETE /api/learn/announcements/:id
router.delete('/announcements/:id', authenticate, requireRole('admin', 'learn_admin', 'coding_ta'), async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

export default router;
