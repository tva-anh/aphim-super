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

const ShortDramaItemSchema = new mongoose.Schema({
    id:               { type: String, required: true },
    title:            { type: String, default: '' },
    cover:            { type: String, default: '' },
    epNo:             { type: Number, default: 1 },
    totalEpisodes:    { type: Number, default: 1 },
    currentTime:      { type: Number, default: 0 },
    duration:         { type: Number, default: 0 },
    watched_at:       { type: Date, default: Date.now },
    timestamp:        { type: Number, default: Date.now }
}, { _id: false });

const ShortDramaPlaylistSchema = new mongoose.Schema({
    id:          { type: String, default: () => 'pl_' + Date.now() },
    name:        { type: String, default: 'Danh sách phát mới' },
    description: { type: String, default: '' },
    dramas:      { type: [ShortDramaItemSchema], default: [] },
    created_at:  { type: Date, default: Date.now }
}, { _id: false });

const WatchHistorySchema = new mongoose.Schema({
    user_id:  { type: String, required: true, unique: true, index: true },
    history:  { type: [HistoryItemSchema], default: [] },  // max 200 items (phim thường)
    favorites:{ type: [String], default: [] },             // array of slugs (phim thường)
    short_drama_history:   { type: [ShortDramaItemSchema], default: [] },     // max 200 phim ngắn đã xem
    short_drama_favorites: { type: [ShortDramaItemSchema], default: [] },     // phim ngắn yêu thích
    short_drama_playlists: { type: [ShortDramaPlaylistSchema], default: [] }, // danh sách phát phim ngắn
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('WatchHistory', WatchHistorySchema);
