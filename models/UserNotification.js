/**
 * models/UserNotification.js
 * Lưu trữ thông báo người dùng đồng bộ Cloud (MongoDB Atlas)
 * Đảm bảo thông báo tồn tại vĩnh viễn trên mọi thiết bị và domain
 */
const { mongoose } = require('../lib/mongodb');

const NotificationItemSchema = new mongoose.Schema({
    id:        { type: String, required: true },
    title:     { type: String, default: '' },
    message:   { type: String, default: '' },
    detail:    { type: String, default: '' },
    type:      { type: String, default: 'system' }, // system, coin, vip, shop, movie, reward
    amount:    { type: Number, default: 0 },
    link:      { type: String, default: '/profile?tab=notifications' },
    read:      { type: Boolean, default: false },
    isRead:    { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const UserNotificationSchema = new mongoose.Schema({
    user_id:       { type: String, required: true, unique: true, index: true },
    notifications: { type: [NotificationItemSchema], default: [] },
    updated_at:    { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('UserNotification', UserNotificationSchema);
