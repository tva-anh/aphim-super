/**
 * models/AdminLog.js
 * Ghi log mọi action quan trọng của admin
 */
const { mongoose } = require('../lib/mongodb');

const AdminLogSchema = new mongoose.Schema({
    admin_id:    { type: String, required: true },
    admin_name:  { type: String, default: '' },
    action:      { type: String, required: true }, // 'grant_vip' | 'adjust_xu' | 'hide_movie' | 'block_user' | 'confirm_payment' | 'update_settings'
    target_type: { type: String, default: '' },    // 'user' | 'movie' | 'transaction' | 'setting' | 'banner'
    target_id:   { type: String, default: '' },
    target_name: { type: String, default: '' },
    before:      { type: mongoose.Schema.Types.Mixed, default: {} },
    after:       { type: mongoose.Schema.Types.Mixed, default: {} },
    note:        { type: String, default: '' },
    ip:          { type: String, default: '' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Index để query nhanh theo admin hoặc theo thời gian
AdminLogSchema.index({ admin_id: 1, created_at: -1 });
AdminLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('AdminLog', AdminLogSchema);
