import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Club from './models/Club.js';
import Council from './models/Council.js';

dotenv.config();

async function linkUsersToEntities() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get the seeded users
        const chair = await User.findOne({ email: 'chair@jklu.edu.in' });
        const coChair = await User.findOne({ email: 'cochair@jklu.edu.in' });
        const sec = await User.findOne({ email: 'secretary@jklu.edu.in' });
        const gensec = await User.findOne({ email: 'gensec@jklu.edu.in' });

        const c_president = await User.findOne({ email: 'councilpresident@jklu.edu.in' });
        const head_sa = await User.findOne({ email: 'headsa@jklu.edu.in' });

        // 2. Link Club Officers to 'Design Club' specifically
        const designClub = await Club.findOne({ slug: 'design-club' });
        if (designClub) {
            if (chair) designClub.chairId = chair._id;
            if (coChair) designClub.coChairId = coChair._id;
            if (sec) designClub.secretaryId = sec._id;
            if (gensec) designClub.generalSecretaryId = gensec._id;
            await designClub.save();
            console.log('Successfully bound Club officers to the Design Club.');
        } else {
            console.log('Design Club not found.');
        }

        // 3. Link Council Officers to 'Technical Council' specifically
        const techCouncil = await Council.findOne({ slug: 'technical-council' });
        if (techCouncil) {
            if (c_president) techCouncil.presidentId = c_president._id;
            if (head_sa) techCouncil.headStudentAffairsId = head_sa._id;
            // The Super Admin is generic, but let's bind it just in case some legacy check needs it
            const sysAdmin = await User.findOne({ email: 'admin@jklu.edu.in' });
            if (sysAdmin) techCouncil.adminId = sysAdmin._id;

            await techCouncil.save();
            console.log('Successfully bound Council officers to the Technical Council.');
        } else {
            console.log('Technical Council not found.');
        }

        console.log('Users mapped successfully! Disconnecting...');
        process.exit(0);
    } catch (error) {
        console.error('Failed to link users:', error);
        process.exit(1);
    }
}

linkUsersToEntities();
