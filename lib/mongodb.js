/**
 * lib/mongodb.js
 * MongoDB connection via Mongoose
 */
const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Fix lỗi DNS SRV lookup trên môi trường Windows / mạng chặn SRV
try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
    console.warn('[MongoDB] Không thể set custom DNS servers:', e.message);
}

const MONGODB_URI = process.env.MONGODB_URI;


if (!MONGODB_URI || MONGODB_URI.includes('<YOUR_MONGODB_PASSWORD>')) {
    console.warn('⚠️ [MongoDB] MONGODB_URI chưa được cấu hình đúng trong .env — hãy thay <YOUR_MONGODB_PASSWORD>');
}

let isConnected = false;

async function connectMongoDB() {
    if (isConnected) return;

    const uri  = process.env.MONGODB_URI;
    const user = process.env.MONGODB_USER;
    const pass = process.env.MONGODB_PASS;
    const db   = process.env.MONGODB_DB_NAME || 'aphim_super';

    try {
        const opts = {
            dbName: db,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 5000,
        };

        // Nếu có user/pass riêng → dùng option thay vì nhúng vào URI
        // (tránh lỗi URL encoding với ký tự đặc biệt như #, @, $)
        if (user && pass) {
            opts.auth = { username: user, password: pass };
            opts.authSource = 'admin';
        }

        await mongoose.connect(uri, opts);

        isConnected = true;
        console.log('✅ [MongoDB] Đã kết nối thành công tới Atlas cluster: aphim-super-cluster');
        console.log(`   DB: ${mongoose.connection.name} | Host: ${mongoose.connection.host}`);


        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ [MongoDB] Mất kết nối — đang thử lại...');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ [MongoDB] Đã kết nối lại thành công.');
            isConnected = true;
        });

    } catch (err) {
        console.error('❌ [MongoDB] Lỗi kết nối:', err.message);
        isConnected = false;
    }
}

module.exports = { connectMongoDB, mongoose };
