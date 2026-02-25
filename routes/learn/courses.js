import express from 'express';
import { body, query, validationResult } from 'express-validator';
import Course from '../../models/Course.js';
import Paper from '../../models/Paper.js';
import { authenticate, requireRole, optionalAuth } from '../../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ===== COURSES =====

// GET /api/learn/courses
router.get('/courses', async (req, res) => {
    try {
        const courses = await Course.find().sort({ name: 1 });
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// POST /api/learn/courses (admin)
router.post('/courses', authenticate, requireRole('admin', 'learn_admin'),
    [
        body('code').trim().notEmpty(),
        body('name').trim().notEmpty(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { code, name, description } = req.body;

            const existing = await Course.findOne({ code: code.toUpperCase() });
            if (existing) return res.status(400).json({ error: 'Course code already exists' });

            const course = new Course({ code: code.toUpperCase(), name, description });
            await course.save();
            res.status(201).json(course);
        } catch (error) {
            console.error('Create course error:', error);
            res.status(500).json({ error: 'Failed to create course' });
        }
    }
);

// PUT /api/learn/courses/:id (admin)
router.put('/courses/:id', authenticate, requireRole('admin', 'learn_admin'), async (req, res) => {
    try {
        const { code, name, description } = req.body;
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { $set: { ...(code && { code }), ...(name && { name }), ...(description !== undefined && { description }) } },
            { new: true }
        );
        if (!course) return res.status(404).json({ error: 'Course not found' });
        res.json(course);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update course' });
    }
});

// DELETE /api/learn/courses/:id (admin)
router.delete('/courses/:id', authenticate, requireRole('admin', 'learn_admin'), async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });
        // Also delete associated papers
        await Paper.deleteMany({ courseId: req.params.id });
        res.json({ message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

// ===== PAPERS =====

// GET /api/learn/papers — list papers with filters
router.get('/papers', optionalAuth, async (req, res) => {
    try {
        const { courseId, paperType, year, semester, status, page = 1, limit = 20, search } = req.query;
        const filter = {};

        // Non-admin users only see approved papers
        if (!req.user || !req.user.roles?.some(r => ['admin', 'learn_admin'].includes(r))) {
            filter.status = 'approved';
        } else if (status) {
            filter.status = status;
        }

        if (courseId) filter.courseId = courseId;
        if (paperType) filter.paperType = paperType;
        if (year) filter.year = parseInt(year);
        if (semester) filter.semester = semester;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [papers, total] = await Promise.all([
            Paper.find(filter)
                .populate('courseId', 'code name')
                .populate('uploadedBy', 'name email')
                .select('-fileData')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Paper.countDocuments(filter),
        ]);

        res.json({
            items: papers,
            total,
            page: parseInt(page),
            size: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error('Get papers error:', error);
        res.status(500).json({ error: 'Failed to fetch papers' });
    }
});

// POST /api/learn/papers — upload paper
router.post('/papers', authenticate, async (req, res) => {
    try {
        const { courseId, title, description, paperType, year, semester, department, fileName, fileSize } = req.body;

        const paper = new Paper({
            courseId,
            uploadedBy: req.user.id,
            title,
            description,
            paperType,
            year,
            semester,
            department,
            fileName,
            fileSize,
            publicLinkId: uuidv4(),
            status: 'pending',
        });

        await paper.save();
        res.status(201).json(paper);
    } catch (error) {
        console.error('Upload paper error:', error);
        res.status(500).json({ error: 'Failed to upload paper' });
    }
});

// PUT /api/learn/papers/:id/review — admin review
router.put('/papers/:id/review', authenticate, requireRole('admin', 'learn_admin'), async (req, res) => {
    try {
        const { status, rejectionReason, adminFeedback } = req.body;
        const paper = await Paper.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status,
                    rejectionReason,
                    adminFeedback,
                    reviewedBy: req.user.id,
                    reviewedAt: new Date(),
                },
            },
            { new: true }
        );
        if (!paper) return res.status(404).json({ error: 'Paper not found' });
        res.json(paper);
    } catch (error) {
        res.status(500).json({ error: 'Failed to review paper' });
    }
});

// GET /api/learn/papers/:id
router.get('/papers/:id', optionalAuth, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id)
            .populate('courseId', 'code name')
            .populate('uploadedBy', 'name email')
            .select('-fileData');
        if (!paper) return res.status(404).json({ error: 'Paper not found' });
        res.json(paper);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch paper' });
    }
});

// GET /api/learn/papers/:id/download
router.get('/papers/:id/download', optionalAuth, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);
        if (!paper || !paper.fileData) return res.status(404).json({ error: 'File not found' });

        // Non-admin can only download approved papers
        if (paper.status !== 'approved' && (!req.user || !req.user.roles?.some(r => ['admin', 'learn_admin'].includes(r)))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.set('Content-Type', paper.contentType || 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${paper.fileName}"`);
        res.send(paper.fileData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to download paper' });
    }
});

// DELETE /api/learn/papers/:id
router.delete('/papers/:id', authenticate, requireRole('admin', 'learn_admin'), async (req, res) => {
    try {
        const paper = await Paper.findByIdAndDelete(req.params.id);
        if (!paper) return res.status(404).json({ error: 'Paper not found' });
        res.json({ message: 'Paper deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete paper' });
    }
});

// GET /api/learn/stats — dashboard stats
router.get('/stats', authenticate, requireRole('admin', 'learn_admin'), async (req, res) => {
    try {
        const [totalPapers, pending, approved, rejected, totalCourses] = await Promise.all([
            Paper.countDocuments(),
            Paper.countDocuments({ status: 'pending' }),
            Paper.countDocuments({ status: 'approved' }),
            Paper.countDocuments({ status: 'rejected' }),
            Course.countDocuments(),
        ]);

        res.json({ totalPapers, pending, approved, rejected, totalCourses });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
