import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: String,
    longDescription: String,
    image: String,
    coverImage: String,
    councilId: { type: mongoose.Schema.Types.ObjectId, ref: 'Council', index: true },
    category: {
        type: String,
        enum: ['technology', 'cultural', 'sports', 'literary', 'social', 'media', 'other'],
        default: 'other',
    },
    president: String,
    vicePresident: String,
    faculty: String,
    members: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, default: 'member' },
        joinedAt: { type: Date, default: Date.now },
    }],
    socialLinks: {
        instagram: String,
        linkedin: String,
        website: String,
    },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});

const Club = mongoose.model('Club', clubSchema);
export default Club;
