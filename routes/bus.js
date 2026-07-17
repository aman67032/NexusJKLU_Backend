import express from 'express';
import { body, validationResult } from 'express-validator';
import Bus from '../models/Bus.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/bus/routes — list all routes
router.get('/routes', async (req, res) => {
    try {
        const routes = await Bus.find({}).sort({ routeNumber: 1 });
        res.json(routes);
    } catch (error) {
        console.error('Fetch bus routes error:', error);
        res.status(500).json({ error: 'Failed to fetch bus routes' });
    }
});

// GET /api/bus/routes/:id — single route details
router.get('/routes/:id', async (req, res) => {
    try {
        const route = await Bus.findById(req.params.id);
        if (!route) return res.status(404).json({ error: 'Bus route not found' });
        res.json(route);
    } catch (error) {
        console.error('Fetch route detail error:', error);
        res.status(500).json({ error: 'Failed to fetch route details' });
    }
});

// POST /api/bus/routes — create a new route (admin/super_admin only)
router.post('/routes', authenticate, requireRole('admin', 'super_admin'),
    [
        body('routeNumber').trim().notEmpty().withMessage('Route number is required'),
        body('routeName').trim().notEmpty().withMessage('Route name is required'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { routeNumber, routeName, stops, timings, driverName, driverPhone, busNumber, status, liveLocation, eta } = req.body;
            
            const existing = await Bus.findOne({ routeNumber });
            if (existing) return res.status(400).json({ error: 'Route number already exists' });

            const newRoute = new Bus({
                routeNumber,
                routeName,
                stops: stops || [],
                timings: timings || [],
                driverName,
                driverPhone,
                busNumber,
                status: status || 'scheduled',
                liveLocation: liveLocation || { lat: 26.8225, lng: 75.6454, lastUpdated: new Date() },
                eta: eta || '--'
            });

            await newRoute.save();
            res.status(201).json(newRoute);
        } catch (error) {
            console.error('Create bus route error:', error);
            res.status(500).json({ error: 'Failed to create bus route' });
        }
    }
);

// PUT /api/bus/routes/:id — update route (admin/super_admin only)
router.put('/routes/:id', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
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

// DELETE /api/bus/routes/:id — delete route (admin/super_admin only)
router.delete('/routes/:id', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
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
