/**
 * models/SecurityLog.js
 * Ghi log các sự kiện bảo mật (đăng nhập thành công/thất bại, đổi mật khẩu, đăng ký)
 */
const { mongoose } = require('../lib/mongodb');

const SecurityLogSchema = new mongoose.Schema({
    user_id:     { type: String, default: '' },      // ID của user (nếu có, VD đăng nhập thành công)
    email:       { type: String, required: true },   // Email liên quan đến sự kiện (rất quan trọng khi login_failed)
    action:      { type: String, required: true },   // 'login_success', 'login_failed', 'register', 'password_reset', 'logout', 'profile_updated'
    ip_address:  { type: String, default: '' },
    user_agent:  { type: String, default: '' },
    status:      { type: String, default: 'success' }, // 'success' | 'failed'
    note:        { type: String, default: '' }       // Chi tiết bổ sung (ví dụ: lý do thất bại)
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Đánh index để truy vấn nhanh theo email hoặc IP để cảnh báo brute-force, hoặc theo thời gian
SecurityLogSchema.index({ email: 1, created_at: -1 });
SecurityLogSchema.index({ ip_address: 1, created_at: -1 });
SecurityLogSchema.index({ action: 1, created_at: -1 });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
