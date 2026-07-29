import express from 'express';
import { body, validationResult } from 'express-validator';
import Bus from '../models/Bus.js';
import BusAttendance from '../models/BusAttendance.js';
import User from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/bus/routes
router.get('/routes', authenticate, async (req, res) => {
    try {
        const routesWithCount = await Bus.find({ isActive: true }).sort({ routeNumber: 1 });
        const response = routesWithCount.map(r => {
            const obj = r.toObject();
            obj.enrolledCount = obj.enrolledStudents ? obj.enrolledStudents.length : 0;
            delete obj.enrolledStudents;
            return obj;
        });

        res.json(response);
    } catch (error) {
        console.error('Fetch bus routes error:', error);
        res.status(500).json({ error: 'Failed to fetch bus routes' });
    }
});

// GET /api/bus/routes/:id
router.get('/routes/:id', authenticate, async (req, res) => {
    try {
        const route = await Bus.findById(req.params.id);
        if (!route) return res.status(404).json({ error: 'Bus route not found' });
        res.json(route);
    } catch (error) {
        console.error('Fetch route detail error:', error);
        res.status(500).json({ error: 'Failed to fetch route details' });
    }
});

// GET /api/bus/my-route
router.get('/my-route', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('busRoute');
        if (!user || !user.busRoute) {
            return res.status(404).json({ error: 'No bus route assigned to user' });
        }
        res.json(user.busRoute);
    } catch (error) {
        console.error('Fetch my route error:', error);
        res.status(500).json({ error: 'Failed to fetch my route' });
    }
});

// GET /api/bus/routes/:id/location
router.get('/routes/:id/location', authenticate, async (req, res) => {
    try {
        const route = await Bus.findById(req.params.id).select('currentLocation status');
        if (!route) return res.status(404).json({ error: 'Bus route not found' });
        res.json(route.currentLocation || {});
    } catch (error) {
        console.error('Fetch location error:', error);
        res.status(500).json({ error: 'Failed to fetch location' });
    }
});

// GET /api/bus/attendance/my
router.get('/attendance/my', authenticate, async (req, res) => {
    try {
        const attendance = await BusAttendance.find({ studentId: req.user.id })
            .sort({ date: -1 })
            .limit(30)
            .populate('busId', 'routeNumber routeName');
        res.json(attendance);
    } catch (error) {
        console.error('Fetch my attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});

// ================= ADMIN ROUTES =================

// PUT /api/bus/routes/:id/location
router.put('/routes/:id/location', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (lat == null || lng == null) {
            return res.status(400).json({ error: 'lat and lng are required' });
        }

        const route = await Bus.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    currentLocation: { lat, lng, updatedAt: new Date() } 
                } 
            },
            { new: true }
        );

        if (!route) return res.status(404).json({ error: 'Bus route not found' });
        res.json(route.currentLocation);
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// POST /api/bus/attendance/mark
router.post('/attendance/mark', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const { studentId, busId, date, status, boardingPoint } = req.body;
        
        // Normalize date to start of day for accurate upsert mapping
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const attendance = await BusAttendance.findOneAndUpdate(
            { studentId, busId, date: targetDate },
            { 
                status, 
                boardingPoint, 
                markedBy: req.user.id,
                markedAt: new Date() 
            },
            { new: true, upsert: true }
        );

        res.json(attendance);
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

// GET /api/bus/attendance/:busId/:date
router.get('/attendance/:busId/:date', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const targetDate = new Date(req.params.date);
        targetDate.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await BusAttendance.find({
            busId: req.params.busId,
            date: { $gte: targetDate, $lte: endOfDay }
        }).populate('studentId', 'name email rollNumber');

        res.json(attendance);
    } catch (error) {
        console.error('Fetch attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// PUT /api/bus/routes/:id
router.put('/routes/:id', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const route = await Bus.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        if (!route) return res.status(404).json({ error: 'Bus route not found' });
        res.json(route);
    } catch (error) {
        console.error('Update bus route error:', error);
        res.status(500).json({ error: 'Failed to update bus route' });
    }
});

// GET /api/bus/routes/:id/students
router.get('/routes/:id/students', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const route = await Bus.findById(req.params.id).populate('enrolledStudents', 'name email rollNumber pickupPoint');
        if (!route) return res.status(404).json({ error: 'Bus route not found' });
        res.json(route.enrolledStudents);
    } catch (error) {
        console.error('Fetch route students error:', error);
        res.status(500).json({ error: 'Failed to fetch enrolled students' });
    }
});

// POST /api/bus/routes
router.post('/routes', authenticate, requireRole('admin', 'transport_coordinator'),
    [
        body('routeNumber').trim().notEmpty().withMessage('Route number is required'),
        body('routeName').trim().notEmpty().withMessage('Route name is required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            
            const existing = await Bus.findOne({ routeNumber: req.body.routeNumber });
            if (existing) return res.status(400).json({ error: 'Route number already exists' });

            const newRoute = new Bus(req.body);
            await newRoute.save();
            res.status(201).json(newRoute);
        } catch (error) {
            console.error('Create bus route error:', error);
            res.status(500).json({ error: 'Failed to create bus route' });
        }
    }
);

// DELETE /api/bus/routes/:id
router.delete('/routes/:id', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const route = await Bus.findByIdAndDelete(req.params.id);
        if (!route) return res.status(404).json({ error: 'Bus route not found' });
        res.json({ message: 'Bus route deleted successfully' });
    } catch (error) {
        console.error('Delete bus route error:', error);
        res.status(500).json({ error: 'Failed to delete bus route' });
    }
});

export default router;
