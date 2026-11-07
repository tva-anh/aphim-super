/**
 * models/SiteSetting.js
 * Lưu trữ cấu hình hệ thống vĩnh viễn trên MongoDB Atlas (Google Trends 24h, Banners, v.v.)
 * Không bao giờ bị mất khi git pull, restart server hay deploy VPS.
 */
const { mongoose } = require('../lib/mongodb');

const SiteSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.models.SiteSetting || mongoose.model('SiteSetting', SiteSettingSchema);
