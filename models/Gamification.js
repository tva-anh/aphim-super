/**
 * models/Gamification.js
 * Xu, XP, Streak, Daily Missions, Achievements
 */
const { mongoose } = require('../lib/mongodb');

const MissionSchema = new mongoose.Schema({
    id:        { type: String, required: true },
    progress:  { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    claimed:   { type: Boolean, default: false }
}, { _id: false });

const AchievementSchema = new mongoose.Schema({
    id:          { type: String, required: true },
    unlocked_at: { type: Date, default: null },
    claimed:     { type: Boolean, default: false }
}, { _id: false });

const GamificationSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true, index: true },

    // Xu & XP
    xu:               { type: Number, default: 150, min: 0 },
    xu_lifetime:      { type: Number, default: 150 },  // tổng xu kiếm được
    xp:               { type: Number, default: 0, min: 0 },
    level:            { type: Number, default: 1, min: 1 },
    rank:             { type: String, default: 'Tân Thủ APhim' },

    // Daily Streak
    streak_current:      { type: Number, default: 0 },
    streak_last_claimed: { type: String, default: '' }, // "YYYY-MM-DD"
    streak_longest:      { type: Number, default: 0 },

    // Daily Missions (reset mỗi ngày)
    missions_date: { type: String, default: '' }, // "YYYY-MM-DD"
    missions: {
        type: [MissionSchema],
        default: [
            { id: 'watch15',  progress: 0, completed: false, claimed: false },
            { id: 'watch45',  progress: 0, completed: false, claimed: false },
            { id: 'comment',  progress: 0, completed: false, claimed: false },
            { id: 'favorite', progress: 0, completed: false, claimed: false },
            { id: 'share',    progress: 0, completed: false, claimed: false }
        ]
    },

    // 12 Achievements
    achievements: {
        type: [AchievementSchema],
        default: [
            { id: 'first_watch',    unlocked_at: null, claimed: false },
            { id: 'streak_3',       unlocked_at: null, claimed: false },
            { id: 'streak_7',       unlocked_at: null, claimed: false },
            { id: 'streak_30',      unlocked_at: null, claimed: false },
            { id: 'commentator',    unlocked_at: null, claimed: false },
            { id: 'sharer',         unlocked_at: null, claimed: false },
            { id: 'collector_10',   unlocked_at: null, claimed: false },
            { id: 'collector_50',   unlocked_at: null, claimed: false },
            { id: 'vip_member',     unlocked_at: null, claimed: false },
            { id: 'level_10',       unlocked_at: null, claimed: false },
            { id: 'level_30',       unlocked_at: null, claimed: false },
            { id: 'legend',         unlocked_at: null, claimed: false }
        ]
    },

    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Gamification', GamificationSchema);
