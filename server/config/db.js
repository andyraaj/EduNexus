const mongoose = require('mongoose');
const dns = require('dns');

// Fix: Use public DNS servers for SRV record resolution (required for mongodb+srv://)
// Local/ISP DNS servers often refuse SRV queries, causing ECONNREFUSED errors.
dns.setServers(['8.8.8.8', '1.1.1.1']);

mongoose.set('strictPopulate', false);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/EduNexus');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[DB] Connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

