import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['event', 'announcement', 'complaint', 'certificate', 'system', 'general'],
        default: 'general',
    },
    module: {
        type: String,
        enum: ['council', 'voice', 'learn', 'system'],
        default: 'system',
    },
    read: { type: Boolean, default: false },
    link: String,
}, {
    timestamps: true,
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
