import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    description: String,
    paperType: {
        type: String,
        required: true,
        enum: ['quiz', 'midterm', 'endterm', 'assignment', 'project', 'other'],
        index: true,
    },
    year: { type: Number, index: true },
    semester: { type: String, index: true },
    department: String,
    fileName: { type: String, required: true },
    filePath: String,
    fileSize: Number,
    fileData: Buffer,
    publicLinkId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'approved', 'rejected'],
        index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String,
    adminFeedback: mongoose.Schema.Types.Mixed,
}, {
    timestamps: true,
});

paperSchema.index({ status: 1, createdAt: -1 });
paperSchema.index({ courseId: 1, status: 1 });
paperSchema.index({ paperType: 1, year: 1 });

const Paper = mongoose.model('Paper', paperSchema);
export default Paper;
