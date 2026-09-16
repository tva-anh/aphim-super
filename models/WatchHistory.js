/**
 * models/WatchHistory.js
 * Lịch sử xem phim + tiến trình + danh sách yêu thích
 */
const { mongoose } = require('../lib/mongodb');

const HistoryItemSchema = new mongoose.Schema({
    slug:             { type: String, required: true },
    name:             { type: String, default: '' },
    thumb_url:        { type: String, default: '' },
    episode:          { type: String, default: '' },
    episode_name:     { type: String, default: '' },
    server_name:      { type: String, default: '' },
    watched_at:       { type: Date, default: Date.now },
    progress_seconds: { type: Number, default: 0 },
    duration_seconds: { type: Number, default: 0 },
    progress_percent: { type: Number, default: 0 }
}, { _id: false });

const WatchHistorySchema = new mongoose.Schema({
    user_id:  { type: String, required: true, unique: true, index: true },
    history:  { type: [HistoryItemSchema], default: [] },  // max 200 items
    favorites:{ type: [String], default: [] },             // array of slugs
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('WatchHistory', WatchHistorySchema);
