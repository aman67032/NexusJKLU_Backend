import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    attachmentUrl: String,
}, {
    timestamps: true,
});

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
