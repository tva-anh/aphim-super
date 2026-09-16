/**
 * models/MovieOverride.js
 * Thay thế BLOCKED_SLUGS array trong RAM — lưu vĩnh viễn vào MongoDB
 */
const { mongoose } = require('../lib/mongodb');

const MovieOverrideSchema = new mongoose.Schema({
    slug:          { type: String, required: true, unique: true, index: true },
    is_hidden:     { type: Boolean, default: false },
    hide_reason:   { type: String, default: '' },
    hidden_by:     { type: String, default: '' },   // admin user_id
    hidden_at:     { type: Date, default: null },
    is_featured:   { type: Boolean, default: false },
    featured_order:{ type: Number, default: 0 },
    custom_name:   { type: String, default: null },
    custom_thumb:  { type: String, default: null }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('MovieOverride', MovieOverrideSchema);
