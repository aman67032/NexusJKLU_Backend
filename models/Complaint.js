import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        unique: true,
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    isAnonymous: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['academic', 'infrastructure', 'hostel', 'food', 'transportation', 'administration', 'other'],
        default: 'other',
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    status: {
        type: String,
        default: 'open',
        enum: ['open', 'in_progress', 'resolved', 'closed', 'rejected'],
        index: true,
    },
    response: String,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: Date,
    attachments: [String],
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    adminSeen: { type: Boolean, default: false },
    adminReadAt: { type: Date }
}, {
    timestamps: true,
});

complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ category: 1, status: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
