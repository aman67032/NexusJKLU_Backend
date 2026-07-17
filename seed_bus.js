import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bus from './models/Bus.js';

dotenv.config();

const busRoutes = [
    {
        routeNumber: "B101",
        routeName: "JKLU ➔ Mansarovar Metro",
        stops: ["JKLU Campus", "Mahapura Patia", "Bhankrota", "Heerapura", "Mansarovar Metro"],
        timings: ["08:30 AM", "12:15 PM", "05:30 PM", "07:00 PM"],
        driverName: "Ramesh Singh",
        driverPhone: "+91 9876543210",
        busNumber: "RJ-14-PB-1234",
        status: "active",
        liveLocation: {
            lat: 26.8390,
            lng: 75.6880,
            lastUpdated: new Date()
        },
        eta: "8 mins"
    },
    {
        routeNumber: "B102",
        routeName: "Mansarovar Metro ➔ JKLU",
        stops: ["Mansarovar Metro", "Heerapura", "Bhankrota", "Mahapura Patia", "JKLU Campus"],
        timings: ["07:30 AM", "09:30 AM", "01:30 PM", "06:30 PM"],
        driverName: "Suresh Sharma",
        driverPhone: "+91 9988776655",
        busNumber: "RJ-14-PB-5678",
        status: "scheduled",
        liveLocation: {
            lat: 26.8225,
            lng: 75.6454,
            lastUpdated: new Date()
        },
        eta: "--"
    },
    {
        routeNumber: "B201",
        routeName: "JKLU ➔ Sindhi Camp (Weekend)",
        stops: ["JKLU Campus", "Bhankrota", "200 Feet Bypass", "Ajmer Pulia", "Sindhi Camp"],
        timings: ["09:00 AM", "02:00 PM", "06:00 PM"],
        driverName: "Satnam Singh",
        driverPhone: "+91 8877665544",
        busNumber: "RJ-14-PB-9999",
        status: "scheduled",
        liveLocation: {
            lat: 26.8225,
            lng: 75.6454,
            lastUpdated: new Date()
        },
        eta: "--"
    }
];

async function seedBusRoutes() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI is not set in env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('Clearing existing bus routes...');
        await Bus.deleteMany({});
        console.log('Bus routes cleared.');

        for (const route of busRoutes) {
            const newRoute = new Bus(route);
            await newRoute.save();
            console.log(`Created route ${route.routeNumber}: ${route.routeName}`);
        }
        
        console.log('\n--- ALL BUS SHUTTLES SEEDED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding bus routes failed:', error);
        process.exit(1);
    }
}

seedBusRoutes();
