import mongoose from 'mongoose';

const busStopSchema = new mongoose.Schema({
    name: { type: String, required: true },
    pickupTime: { type: String },
    order: { type: Number, required: true }
}, { _id: false });

const busSchema = new mongoose.Schema({
    routeNumber: { type: String, required: true, unique: true },  // 'Route 1'
    routeName: { type: String, required: true },  // 'VT Road-Patrakar Colony-Narayan Vihar'
    vehicleNumber: { type: String, required: true },  // 'RJ14PE0972'
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    firstPickupPoint: { type: String },
    stops: [busStopSchema],
    arrivalAtJKLU: { type: String },  // '8:15 AM'
    departureFromJKLU: { type: String, default: '5:00 PM' },
    currentLocation: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now }
    },
    status: { 
        type: String, 
        enum: ['active', 'scheduled', 'delayed', 'cancelled'], 
        default: 'scheduled' 
    },
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    capacity: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Bus', busSchema);
