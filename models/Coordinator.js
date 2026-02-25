import mongoose from 'mongoose';

const coordinatorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    councilId: { type: mongoose.Schema.Types.ObjectId, ref: 'Council', index: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', index: true },
    role: { type: String, default: 'coordinator' },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});

const Coordinator = mongoose.model('Coordinator', coordinatorSchema);
export default Coordinator;
