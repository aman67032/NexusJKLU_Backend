import mongoose from 'mongoose';

const busAttendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    date: { type: Date, required: true },
    status: {
        type: String,
        enum: ['present', 'absent'],
        default: 'present'
    },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date, default: Date.now },
    boardingPoint: { type: String }
}, { timestamps: true });

busAttendanceSchema.index({ studentId: 1, busId: 1, date: 1 }, { unique: true });

export default mongoose.model('BusAttendance', busAttendanceSchema);
