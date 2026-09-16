/**
 * models/Comment.js
 * MongoDB Schema for Realtime Movie Comments
 */
const { mongoose } = require('../lib/mongodb');

const CommentSchema = new mongoose.Schema({
    movieSlug: {
        type: String,
        required: true,
        index: true
    },
    movieId: {
        type: String,
        default: ''
    },
    user: {
        id: { type: String, default: '' },
        displayName: { type: String, default: 'Thành viên' },
        name: { type: String, default: 'Thành viên' },
        email: { type: String, default: '' },
        avatarUrl: { type: String, default: '' },
        avatar: { type: String, default: '' },
        equippedFrameUrl: { type: String, default: '' },
        equippedFrameClass: { type: String, default: '' },
        equippedColor: { type: String, default: 'color_default' },
        role: { type: String, default: 'user' },
        level: { type: Number, default: 15 },
        badge: { type: String, default: '' }
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    isSpoiler: {
        type: Boolean,
        default: false
    },
    parentId: {
        type: String,
        default: null,
        index: true
    },
    episodeInfo: {
        type: String,
        default: ''
    },
    reactions: {
        type: Map,
        of: [String],
        default: {}
    },
    likes: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['approved', 'pending', 'hidden'],
        default: 'approved'
    }
}, {
    timestamps: true
});

// Index for high performance query
CommentSchema.index({ movieSlug: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);
