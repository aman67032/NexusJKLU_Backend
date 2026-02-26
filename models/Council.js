import mongoose from 'mongoose';

const councilSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: String,
    image: String,
    president: String,
    vicePresident: String,
    faculty: String,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    presidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    headStudentAffairsId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    executiveStudentAffairsId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});

const Council = mongoose.model('Council', councilSchema);
export default Council;
