import mongoose from 'mongoose';

const busRouteSchema = new mongoose.Schema({
    routeNumber: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    routeName: {
        type: String,
        required: true,
        trim: true
    },
    stops: {
        type: [String],
        default: []
    },
    timings: {
        type: [String], // e.g. ["08:30 AM", "01:30 PM", "05:30 PM"]
        default: []
    },
    driverName: {
        type: String,
        trim: true
    },
    driverPhone: {
        type: String,
        trim: true
    },
    busNumber: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'delayed', 'cancelled'],
        default: 'scheduled'
    },
    liveLocation: {
        lat: { type: Number, default: 26.8225 }, // Default coordinate near JKLU
        lng: { type: Number, default: 75.6454 },
        lastUpdated: { type: Date, default: Date.now }
    },
    eta: {
        type: String,
        default: '--'
    }
}, {
    timestamps: true
});

const Bus = mongoose.model('Bus', busRouteSchema);

export default Bus;
