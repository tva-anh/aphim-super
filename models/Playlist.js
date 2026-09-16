/**
 * models/Playlist.js
 * Danh sách phim tự tạo của user
 */
const { mongoose } = require('../lib/mongodb');

const PlaylistItemSchema = new mongoose.Schema({
    id:         { type: String, required: true },
    name:       { type: String, required: true },
    movies:     { type: [String], default: [] }, // slugs
    created_at: { type: Date, default: Date.now }
}, { _id: false });

const PlaylistSchema = new mongoose.Schema({
    user_id:    { type: String, required: true, unique: true, index: true },
    playlists:  { type: [PlaylistItemSchema], default: [] },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
