import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', index: true },
    title: { type: String, required: true },
    description: String,
    issuedBy: String,
    issuedAt: { type: Date, default: Date.now },
    certificateId: { type: String, unique: true, required: true },
    type: {
        type: String,
        enum: ['participation', 'achievement', 'volunteer', 'organizer', 'winner'],
        default: 'participation',
    },
}, {
    timestamps: true,
});

const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;
