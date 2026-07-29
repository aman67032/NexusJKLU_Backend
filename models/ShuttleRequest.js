import mongoose from 'mongoose';

const shuttleRequestSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', required: true },
    date: { type: Date, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'waitlisted', 'cancelled'],
        default: 'pending'
    },
    seatNumber: { type: Number },
    requestedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date }
}, { timestamps: true });

// Prevent duplicate requests for same shuttle on same date
shuttleRequestSchema.index({ studentId: 1, shuttleId: 1, date: 1 }, { unique: true });

export default mongoose.model('ShuttleRequest', shuttleRequestSchema);
