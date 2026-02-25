import mongoose from 'mongoose';

const contestQuestionSchema = new mongoose.Schema({
    order: { type: Number, default: 1 },
    title: { type: String, required: true },
    question: { type: String, required: true },
    codeSnippets: {
        type: Map,
        of: String,
        required: true,
    },
    explanation: { type: String, required: true },
    mediaLink: String,
}, {
    timestamps: true,
});

const contestSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true,
    },
    date: {
        type: String,
        required: true,
        unique: true,
    },
    title: String,
    description: String,
    questions: [contestQuestionSchema],
}, {
    timestamps: true,
});

const Contest = mongoose.model('Contest', contestSchema);
export default Contest;
