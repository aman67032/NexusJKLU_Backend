import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Globally disable command buffering so Mongoose fails fast with a clean error if DB is disconnected
mongoose.set('bufferCommands', false);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://solomaze67032_db_user:fQmA99z6lzPVbiAF@cluster0.lnefwyf.mongodb.net/nexusjklu';

let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise || mongoose.connection.readyState === 0) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
            console.log('✅ Connected to MongoDB Atlas');
            return m;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('❌ MongoDB connection error:', e.message);
        throw new Error('Database connection failed. Please check MongoDB Atlas IP Whitelist.');
    }

    return cached.conn;
};

export default connectDB;
