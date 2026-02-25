import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    roles: {
        type: [String],
        default: ['student'],
        enum: ['student', 'admin', 'council_admin', 'voice_admin', 'learn_admin', 'coordinator', 'coding_ta'],
    },
    profile: {
        age: Number,
        year: String,
        university: { type: String, default: 'JKLU' },
        department: String,
        rollNo: String,
        studentId: String,
        phone: String,
    },
    emailVerified: { type: Boolean, default: false },
    idVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    adminFeedback: mongoose.Schema.Types.Mixed,
    resetOtp: String,
    resetOtpExpiry: Date,
}, {
    timestamps: true,
});


userSchema.index({ roles: 1 });

const User = mongoose.model('User', userSchema);
export default User;
