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
        name: 'Super Admin',
        password: 'Asujam@67',
        roles: ['super_admin']
    },
    {
        email: 'admin@jklu.edu.in',
        name: 'General Admin',
        password: 'Asujam@67',
        roles: ['admin']
    },
    {
        email: 'chair@jklu.edu.in',
        name: 'Club Chair',
        password: 'Asujam@67',
        roles: ['club_chair']
    },
    {
        email: 'cochair@jklu.edu.in',
        name: 'Club Co-Chair',
        password: 'Asujam@67',
        roles: ['club_co_chair']
    },
    {
        email: 'secretary@jklu.edu.in',
        name: 'Secretary',
        password: 'Asujam@67',
        roles: ['club_secretary']
    },
    {
        email: 'gensec@jklu.edu.in',
        name: 'General Secretary',
        password: 'Asujam@67',
        roles: ['club_general_secretary']
    },
    {
        email: 'councilpresident@jklu.edu.in',
        name: 'Council President',
        password: 'Asujam@67',
        roles: ['council_president']
    },
    {
        email: 'headsa@jklu.edu.in',
        name: 'Head of Student Affairs',
        password: 'Asujam@67',
        roles: ['head_student_affairs']
    },
    {
        email: 'hostelvoice@jklu.edu.in',
        name: 'Hostel of Voice',
        password: 'Asujam@67',
        roles: ['voice_admin']
    },
    {
        email: 'learnadmin@jklu.edu.in',
        name: 'Learn Admin',
        password: 'Asujam@67',
        roles: ['learn_admin']
    },
    {
        email: 'coordinator@jklu.edu.in',
        name: 'Coordinator',
        password: 'Asujam@67',
        roles: ['coordinator']
    },
    {
        email: 'codingta@jklu.edu.in',
        name: 'Coding TA',
        password: 'Asujam@67',
        roles: ['coding_ta']
    }
];

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Clearing existing users from DB to start fresh...');
        await User.deleteMany({});
        console.log('Existing users cleared.');

        for (const userData of users) {
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
            console.log(`Created ${userData.email} with roles: [${userData.roles.join(', ')}]`);
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
