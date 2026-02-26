import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const users = [
    {
        email: 'amanpratapsingh@jklu.edu.in',
        name: 'Amanpratap Singh',
        password: 'Asujam@67',
        roles: ['student']
    },
    {
        email: 'sysadmincta@jklu.edu.in',
        name: 'System Admin',
        password: 'Asujam@67',
        roles: ['admin', 'council_admin', 'voice_admin', 'learn_admin']
    },
    {
        email: 'chair@jklu.edu.in',
        name: 'Club Chair',
        password: 'Asujam@67',
        roles: ['council_admin']
    },
    {
        email: 'cochair@jklu.edu.in',
        name: 'Club Co-Chair',
        password: 'Asujam@67',
        roles: ['council_admin']
    },
    {
        email: 'secretary@jklu.edu.in',
        name: 'Secretary',
        password: 'Asujam@67',
        roles: ['council_admin']
    },
    {
        email: 'gensec@jklu.edu.in',
        name: 'General Secretary',
        password: 'Asujam@67',
        roles: ['council_admin']
    },
    {
        email: 'hostelvoice@jklu.edu.in',
        name: 'Hostel of Voice',
        password: 'Asujam@67',
        roles: ['voice_admin']
    }
];

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const userData of users) {
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                console.log(`User ${userData.email} already exists. Updating credentials...`);
                const salt = await bcrypt.genSalt(12);
                existingUser.passwordHash = await bcrypt.hash(userData.password, salt);
                existingUser.roles = userData.roles;
                existingUser.name = userData.name;
                existingUser.emailVerified = true;
                await existingUser.save();
                console.log(`Updated ${userData.email}`);
            } else {
                const salt = await bcrypt.genSalt(12);
                const passwordHash = await bcrypt.hash(userData.password, salt);

                const newUser = new User({
                    email: userData.email,
                    name: userData.name,
                    passwordHash,
                    roles: userData.roles,
                    emailVerified: true
                });
                await newUser.save();
                console.log(`Created ${userData.email}`);
            }
        }
        console.log('\n--- ALL USERS SEEDED SUCCESSFULLY ---');
        console.log('Please save these credentials to share with the respective owners.\n');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seedUsers();
