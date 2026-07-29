import express from 'express';
import { body, validationResult } from 'express-validator';
import Shuttle from '../models/Shuttle.js';
import ShuttleRequest from '../models/ShuttleRequest.js';
import User from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ================= STUDENT ROUTES =================

// GET /api/shuttle/schedules
router.get('/schedules', authenticate, async (req, res) => {
    try {
        const shuttles = await Shuttle.find({ isActive: true }).sort({ schedule: 1 });
        res.json(shuttles);
    } catch (error) {
        console.error('Fetch shuttles error:', error);
        res.status(500).json({ error: 'Failed to fetch shuttle schedules' });
    }
});

// GET /api/shuttle/schedules/:id
router.get('/schedules/:id', authenticate, async (req, res) => {
    try {
        const shuttle = await Shuttle.findById(req.params.id);
        if (!shuttle) return res.status(404).json({ error: 'Shuttle not found' });
        res.json(shuttle);
    } catch (error) {
        console.error('Fetch shuttle details error:', error);
        res.status(500).json({ error: 'Failed to fetch shuttle details' });
    }
});

// POST /api/shuttle/request
router.post('/request', authenticate, async (req, res) => {
    try {
        const { shuttleId, date } = req.body;
        
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const shuttle = await Shuttle.findById(shuttleId);
        if (!shuttle) return res.status(404).json({ error: 'Shuttle not found' });

        // Check if student already has request
        const existingReq = await ShuttleRequest.findOne({
            studentId: req.user.id,
            shuttleId,
            date: targetDate,
            status: { $in: ['pending', 'confirmed', 'waitlisted'] }
        });

        if (existingReq) {
            return res.status(400).json({ error: 'You already have a request for this shuttle on this date' });
        }

        let newStatus = 'waitlisted';
        let seatNumber = null;

        if (shuttle.currentBookings < shuttle.capacity) {
            newStatus = 'confirmed';
            shuttle.currentBookings += 1;
            seatNumber = shuttle.currentBookings; // Simple seat assignment
            await shuttle.save();
        }

        const shuttleReq = new ShuttleRequest({
            studentId: req.user.id,
            shuttleId,
            date: targetDate,
            status: newStatus,
            seatNumber,
            requestedAt: new Date(),
            confirmedAt: newStatus === 'confirmed' ? new Date() : null
        });

        await shuttleReq.save();

        // Extra shuttle logic
        if (newStatus === 'waitlisted') {
            const waitlistCount = await ShuttleRequest.countDocuments({
                shuttleId,
                date: targetDate,
                status: 'waitlisted'
            });

            if (waitlistCount >= 10) {
                // Auto create new shuttle
                const extraShuttle = new Shuttle({
                    shuttleNumber: `${shuttle.shuttleNumber}-EXTRA`,
                    routeName: shuttle.routeName,
                    schedule: shuttle.schedule,
                    routeType: shuttle.routeType,
                    stops: shuttle.stops,
                    capacity: shuttle.capacity || 32,
                    currentBookings: 0,
                    status: 'scheduled',
                    isExtraShuttle: true,
                    parentShuttleId: shuttle._id,
                    isActive: true
                });
                
                await extraShuttle.save();

                // Move waitlisted to extra shuttle
                const waitlistedReqs = await ShuttleRequest.find({
                    shuttleId,
                    date: targetDate,
                    status: 'waitlisted'
                }).sort({ requestedAt: 1 });

                let seatAssign = 1;
                for (const wReq of waitlistedReqs) {
                    wReq.shuttleId = extraShuttle._id;
                    wReq.status = 'confirmed';
                    wReq.seatNumber = seatAssign++;
                    wReq.confirmedAt = new Date();
                    await wReq.save();
                }

                extraShuttle.currentBookings = waitlistedReqs.length;
                await extraShuttle.save();
            }
        }

        res.status(201).json(shuttleReq);
    } catch (error) {
        console.error('Shuttle request error:', error);
        res.status(500).json({ error: 'Failed to process shuttle request' });
    }
});

// GET /api/shuttle/my-requests
router.get('/my-requests', authenticate, async (req, res) => {
    try {
        const requests = await ShuttleRequest.find({ studentId: req.user.id })
            .sort({ date: -1 })
            .populate('shuttleId');
        res.json(requests);
    } catch (error) {
        console.error('Fetch my requests error:', error);
        res.status(500).json({ error: 'Failed to fetch your requests' });
    }
});

// DELETE /api/shuttle/request/:id
router.delete('/request/:id', authenticate, async (req, res) => {
    try {
        const request = await ShuttleRequest.findOne({ _id: req.params.id, studentId: req.user.id });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        if (request.status === 'confirmed') {
            const shuttle = await Shuttle.findById(request.shuttleId);
            if (shuttle && shuttle.currentBookings > 0) {
                shuttle.currentBookings -= 1;
                await shuttle.save();
            }
        }

        request.status = 'cancelled';
        await request.save();

        res.json({ message: 'Request cancelled successfully', request });
    } catch (error) {
        console.error('Cancel request error:', error);
        res.status(500).json({ error: 'Failed to cancel request' });
    }
});

// GET /api/shuttle/schedules/:id/location
router.get('/schedules/:id/location', authenticate, async (req, res) => {
    try {
        const shuttle = await Shuttle.findById(req.params.id).select('currentLocation');
        if (!shuttle) return res.status(404).json({ error: 'Shuttle not found' });
        res.json(shuttle.currentLocation || {});
    } catch (error) {
        console.error('Fetch shuttle location error:', error);
        res.status(500).json({ error: 'Failed to fetch location' });
    }
});

// ================= ADMIN ROUTES =================

// GET /api/shuttle/admin/requests
router.get('/admin/requests', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const { date, status, shuttleId } = req.query;
        const filter = {};
        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);
            filter.date = { $gte: d, $lt: nextD };
        }
        if (status) filter.status = status;
        if (shuttleId) filter.shuttleId = shuttleId;

        const requests = await ShuttleRequest.find(filter)
            .populate('studentId', 'name email rollNumber')
            .populate('shuttleId', 'shuttleNumber routeName schedule routeType');
            
        res.json(requests);
    } catch (error) {
        console.error('Admin fetch requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// POST /api/shuttle/admin/schedules
router.post('/admin/schedules', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const newShuttle = new Shuttle(req.body);
        await newShuttle.save();
        res.status(201).json(newShuttle);
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});

// PUT /api/shuttle/admin/schedules/:id
router.put('/admin/schedules/:id', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const shuttle = await Shuttle.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        if (!shuttle) return res.status(404).json({ error: 'Shuttle not found' });
        res.json(shuttle);
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});

// DELETE /api/shuttle/admin/schedules/:id
router.delete('/admin/schedules/:id', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const shuttle = await Shuttle.findByIdAndDelete(req.params.id);
        if (!shuttle) return res.status(404).json({ error: 'Shuttle not found' });
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

// PUT /api/shuttle/admin/schedules/:id/location
router.put('/admin/schedules/:id/location', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const shuttle = await Shuttle.findByIdAndUpdate(
            req.params.id,
            { $set: { currentLocation: { lat, lng, updatedAt: new Date() } } },
            { new: true }
        );
        if (!shuttle) return res.status(404).json({ error: 'Shuttle not found' });
        res.json(shuttle.currentLocation);
    } catch (error) {
        console.error('Update shuttle location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// GET /api/shuttle/admin/stats
router.get('/admin/stats', authenticate, requireRole('admin', 'transport_coordinator'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalShuttles = await Shuttle.countDocuments({ isActive: true });
        const extraShuttles = await Shuttle.countDocuments({ isExtraShuttle: true, isActive: true });
        const totalRequestsToday = await ShuttleRequest.countDocuments({ date: today });
        const confirmedToday = await ShuttleRequest.countDocuments({ date: today, status: 'confirmed' });

        res.json({
            totalShuttles,
            extraShuttles,
            totalRequestsToday,
            confirmedToday
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
