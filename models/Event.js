import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: String,
    longDescription: String,
    image: String,
    date: { type: Date, required: true, index: true },
    endDate: Date,
    time: String,
    venue: String,
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', index: true },
    councilId: { type: mongoose.Schema.Types.ObjectId, ref: 'Council', index: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: {
        type: String,
        enum: ['workshop', 'hackathon', 'seminar', 'cultural', 'sports', 'social', 'competition', 'other'],
        default: 'other',
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        index: true,
    },
    maxParticipants: Number,
    registeredParticipants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        registeredAt: { type: Date, default: Date.now },
    }],
    tags: [String],
    isPublic: { type: Boolean, default: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
}, {
    timestamps: true,
});

eventSchema.index({ date: -1, status: 1 });
eventSchema.index({ clubId: 1, date: -1 });

const Event = mongoose.model('Event', eventSchema);
export default Event;
