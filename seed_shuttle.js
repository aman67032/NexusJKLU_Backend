import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shuttle from './models/Shuttle.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://solomaze67032_db_user:fQmA99z6lzPVbiAF@cluster0.lnefwyf.mongodb.net/nexusjklu';

const workingDaysSchedules = [
    // Working Days - Route 1
    {
        shuttleNumber: 'SH-WD-R1-1',
        routeName: 'JKLU → Mansarovar Metro (Afternoon)',
        schedule: 'working_days',
        routeType: 'Route 1',
        stops: [
            { name: 'JKLU Campus Main Gate', time: '1:30 PM', type: 'departure' },
            { name: 'Elements Mall, Ajmer Road', time: '1:50 PM', type: 'stop' },
            { name: 'Mansarovar Metro Station', time: '2:00 PM', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    },
    {
        shuttleNumber: 'SH-WD-R1-2',
        routeName: 'Mansarovar Metro → JKLU (Afternoon Return)',
        schedule: 'working_days',
        routeType: 'Route 1',
        stops: [
            { name: 'Mansarovar Metro Station', time: '3:45 PM', type: 'departure' },
            { name: 'Elements Mall, Ajmer Road', time: '3:55 PM', type: 'stop' },
            { name: 'JKLU Campus Main Gate', time: '4:15 PM', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    },
    {
        shuttleNumber: 'SH-WD-R1-3',
        routeName: 'Mansarovar Metro → JKLU (Evening)',
        schedule: 'working_days',
        routeType: 'Route 1',
        stops: [
            { name: 'Mansarovar Metro Station', time: '7:30 PM', type: 'departure' },
            { name: 'JKLU Campus Main Gate', time: '8:00 PM', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    },
    {
        shuttleNumber: 'SH-WD-R1-4',
        routeName: 'JKLU → Mansarovar Metro (Night)',
        schedule: 'working_days',
        routeType: 'Route 1',
        stops: [
            { name: 'JKLU Campus Main Gate', time: '8:15 PM', type: 'departure' },
            { name: 'Elements Mall, Ajmer Road', time: '8:40 PM', type: 'stop' },
            { name: 'Mansarovar Metro Station', time: '8:50 PM', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    },
    // Working Days - Route 2
    {
        shuttleNumber: 'SH-WD-R2-1',
        routeName: 'JKLU → Mansarovar Metro (Late Morning)',
        schedule: 'working_days',
        routeType: 'Route 2',
        stops: [
            { name: 'JKLU Campus Main Gate', time: '11:30 AM', type: 'departure' },
            { name: 'Elements Mall, Ajmer Road', time: '11:50 AM', type: 'stop' },
            { name: 'Mansarovar Metro Station', time: '12:00 Noon', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    },
    {
        shuttleNumber: 'SH-WD-R2-2',
        routeName: 'Mansarovar Metro → JKLU (Afternoon)',
        schedule: 'working_days',
        routeType: 'Route 2',
        stops: [
            { name: 'Mansarovar Metro Station', time: '3:00 PM', type: 'departure' },
            { name: 'Elements Mall, Ajmer Road', time: '3:10 PM', type: 'stop' },
            { name: 'JKLU Campus Main Gate', time: '3:30 PM', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    },
    {
        shuttleNumber: 'SH-WD-R2-3',
        routeName: 'JKLU → GT Mall WTP (Extended Evening)',
        schedule: 'working_days',
        routeType: 'Route 2',
        stops: [
            { name: 'JKLU Campus Main Gate', time: '3:50 PM', type: 'departure' },
            { name: 'Elements Mall', time: '4:10 PM', type: 'stop' },
            { name: 'Mansarovar Metro Station', time: '4:15 PM', type: 'stop' },
            { name: 'Ganga Jamuna Petrol Pump', time: '4:20 PM', type: 'stop' },
            { name: 'Gujar ki Thadi', time: '4:25 PM', type: 'stop' },
            { name: 'Ridhi Sidhi Churaha', time: '4:30 PM', type: 'stop' },
            { name: 'Triveni Nagar Churaha', time: '4:35 PM', type: 'stop' },
            { name: 'Gopalpura Mode', time: '4:45 PM', type: 'stop' },
            { name: 'GT Mall, WTP', time: '5:00 PM', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    },
    {
        shuttleNumber: 'SH-WD-R2-4',
        routeName: 'GT Mall WTP → JKLU (Night Return)',
        schedule: 'working_days',
        routeType: 'Route 2',
        stops: [
            { name: 'GT Mall, WTP', time: '8:00 PM', type: 'departure' },
            { name: 'Mansarovar Metro Station', time: '8:40 PM', type: 'stop' },
            { name: 'JKLU Campus Main Gate', time: '9:00 PM', type: 'arrival' }
        ],
        capacity: 32,
        contactPerson: 'Mr. Mukesh',
        contactPhone: '+91 9782008380'
    }
];

const weekendsSchedules = workingDaysSchedules.map(schedule => ({
    ...schedule,
    shuttleNumber: schedule.shuttleNumber.replace('WD', 'WE'),
    schedule: 'weekends_holidays'
}));

const shuttleSchedules = [...workingDaysSchedules, ...weekendsSchedules];

const seedShuttles = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        await Shuttle.deleteMany({});
        console.log('Cleared existing Shuttle collection');

        const insertedShuttles = await Shuttle.insertMany(shuttleSchedules);
        console.log(`Successfully inserted ${insertedShuttles.length} shuttle schedules.`);

        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding Shuttle data:', error);
        process.exit(1);
    }
};

seedShuttles();
