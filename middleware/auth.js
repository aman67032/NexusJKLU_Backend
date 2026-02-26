import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

import User from '../models/User.js';
import Club from '../models/Club.js';
import Council from '../models/Council.js';

// Verify JWT token middleware
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify user still exists
        const user = await User.findById(decoded.id || decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Convert Mongoose doc to lean object for req.user
        const userObj = {
            id: user._id,
            email: user.email,
            name: user.name,
            roles: user.roles,
        };

        // Fetch associated entity (Club or Council) dynamically based on roles
        if (user.roles.some(r => ['club_chair', 'club_co_chair', 'club_secretary', 'club_general_secretary'].includes(r))) {
            const managedClub = await Club.findOne({
                $or: [
                    { chairId: user._id },
                    { coChairId: user._id },
                    { secretaryId: user._id },
                    { generalSecretaryId: user._id }
                ]
            }).lean();
            if (managedClub) {
                userObj.managed_club = managedClub;
            }
        }

        if (user.roles.some(r => ['council_admin', 'council_president', 'head_student_affairs', 'executive_student_affairs'].includes(r))) {
            const managedCouncil = await Council.findOne({
                $or: [
                    { adminId: user._id },
                    { presidentId: user._id },
                    { headStudentAffairsId: user._id },
                    { executiveStudentAffairsId: user._id }
                ]
            }).lean();
            if (managedCouncil) {
                userObj.managed_council = managedCouncil;
            }
        }

        req.user = userObj;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Require specific roles
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRoles = req.user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));

        if (!hasRole && !userRoles.includes('admin')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

// Optional auth — doesn't reject if no token, just sets req.user if present
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch {
        req.user = null;
    }

    next();
};
