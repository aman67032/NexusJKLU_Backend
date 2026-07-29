import mongoose from 'mongoose';

const shuttleStopSchema = new mongoose.Schema({
    name: { type: String, required: true },
    time: { type: String, required: true },
    type: { type: String, enum: ['departure', 'arrival', 'stop'], default: 'stop' }
}, { _id: false });

const shuttleSchema = new mongoose.Schema({
    shuttleNumber: { type: String, required: true },
    routeName: { type: String, required: true },
    schedule: { type: String, enum: ['working_days', 'weekends_holidays'], required: true },
    routeType: { type: String },  // 'Route 1' or 'Route 2'
    stops: [shuttleStopSchema],
    capacity: { type: Number, default: 32 },
    currentBookings: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['active', 'scheduled', 'full', 'cancelled'],
        default: 'scheduled'
    },
    currentLocation: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now }
    },
    isExtraShuttle: { type: Boolean, default: false },
    parentShuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', default: null },
    contactPerson: { type: String, default: 'Mr. Mukesh' },
    contactPhone: { type: String, default: '+91 9782008380' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Shuttle', shuttleSchema);
