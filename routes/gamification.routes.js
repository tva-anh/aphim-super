/**
 * routes/gamification.routes.js
 * Xu, XP, Daily Streak, Missions, Achievements — MongoDB
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { supabaseAdmin } = require('../lib/supabase');
const Gamification = require('../models/Gamification');

// Config chuẩn
const STREAK_REWARDS = [
    { day: 1, xp: 20, xu: 2 },
    { day: 2, xp: 25, xu: 3 },
    { day: 3, xp: 30, xu: 4 },
    { day: 4, xp: 35, xu: 5 },
    { day: 5, xp: 40, xu: 6 },
    { day: 6, xp: 45, xu: 7 },
    { day: 7, xp: 100, xu: 15, luckyTicket: 1 }
];

const MISSIONS_DEF = [
    { id: 'watch15', title: 'Khởi Động Phim', xp: 30, xu: 2, target: 15, unit: 'phút' },
    { id: 'watch45', title: 'Cày Phim Chăm Chỉ', xp: 50, xu: 3, target: 45, unit: 'phút' },
    { id: 'comment', title: 'Bình Luận Đóng Góp', xp: 20, xu: 2, target: 2, unit: 'lần' },
    { id: 'favorite', title: 'Yêu Thích Phim', xp: 10, xu: 1, target: 1, unit: 'lần' },
    { id: 'share', title: 'Lan Tỏa Phim', xp: 20, xu: 1, target: 1, unit: 'lần' }
];

const RANKS_DEF = [
    { minLvl: 1, maxLvl: 5, rank: 'Tân Thủ APhim' },
    { minLvl: 6, maxLvl: 15, rank: 'Người Khám Phá' },
    { minLvl: 16, maxLvl: 30, rank: 'Tín Đồ Điện Ảnh' },
    { minLvl: 31, maxLvl: 50, rank: 'Bậc Thầy Phim Ảnh' },
    { minLvl: 51, maxLvl: 999, rank: 'Huyền Thoại VIP' }
];

function getTodayString() {
    return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function calcLevel(xp) {
    // Mỗi level cần xp*level*50 điểm
    let level = 1;
    let needed = 0;
    while (xp >= needed + level * 50) {
        needed += level * 50;
        level++;
    }
    return level;
}

function calcRank(level) {
    return RANKS_DEF.find(r => level >= r.minLvl && level <= r.maxLvl)?.rank || 'Tân Thủ APhim';
}

// Helper: sync xu+xp lên bảng profiles Supabase
async function syncToProfile(userId, xu, xp) {
    const level = calcLevel(xp);
    const rank = calcRank(level);
    await supabaseAdmin.from('profiles').update({ xu, xp, level, updated_at: new Date().toISOString() }).eq('id', userId);
    return { level, rank };
}

// Helper: reset missions nếu ngày mới
function ensureMissionsReset(gamif) {
    const today = getTodayString();
    if (gamif.missions_date !== today) {
        gamif.missions_date = today;
        gamif.missions = MISSIONS_DEF.map(m => ({ id: m.id, progress: 0, completed: false, claimed: false }));
    }
}

// ── GET /api/gamification/me ─────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        let gamif = await Gamification.findOne({ user_id: userId });

        if (!gamif) {
            gamif = await Gamification.create({ user_id: userId });
        }

        // Reset missions nếu ngày mới
        ensureMissionsReset(gamif);
        await gamif.save();

        return res.json({
            success: true,
            data: {
                xu: gamif.xu, xp: gamif.xp, level: gamif.level, rank: gamif.rank,
                xu_lifetime: gamif.xu_lifetime,
                streak_current: gamif.streak_current,
                streak_last_claimed: gamif.streak_last_claimed,
                streak_longest: gamif.streak_longest,
                missions_date: gamif.missions_date,
                missions: gamif.missions.map(m => {
                    const def = MISSIONS_DEF.find(d => d.id === m.id) || {};
                    return { ...m.toObject(), ...def };
                }),
                achievements: gamif.achievements,
                streak_rewards: STREAK_REWARDS
            }
        });
    } catch (err) {
        console.error('[Gamification] me error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/gamification/claim-streak ─────────────────────────────────────
router.post('/claim-streak', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const today = getTodayString();

        let gamif = await Gamification.findOne({ user_id: userId });
        if (!gamif) gamif = await Gamification.create({ user_id: userId });

        if (gamif.streak_last_claimed === today) {
            return res.status(400).json({ success: false, message: 'Bạn đã điểm danh hôm nay rồi!' });
        }

        // Tính streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const isConsecutive = gamif.streak_last_claimed === yesterdayStr;
        const newStreak = isConsecutive ? Math.min(gamif.streak_current + 1, 7) : 1;
        const reward = STREAK_REWARDS[newStreak - 1];

        gamif.streak_current = newStreak;
        gamif.streak_last_claimed = today;
        gamif.streak_longest = Math.max(gamif.streak_longest, newStreak);
        gamif.xu += reward.xu;
        gamif.xp += reward.xp;
        gamif.xu_lifetime += reward.xu;

        const newLevel = calcLevel(gamif.xp);
        gamif.level = newLevel;
        gamif.rank = calcRank(newLevel);

        // Unlock achievement streak_7
        if (newStreak === 7) {
            const ach = gamif.achievements.find(a => a.id === 'streak_7');
            if (ach && !ach.unlocked_at) ach.unlocked_at = new Date();
        }
        if (newStreak >= 3) {
            const ach3 = gamif.achievements.find(a => a.id === 'streak_3');
            if (ach3 && !ach3.unlocked_at) ach3.unlocked_at = new Date();
        }

        await gamif.save();
        await syncToProfile(userId, gamif.xu, gamif.xp);

        return res.json({
            success: true,
            message: `Điểm danh Ngày ${newStreak}/7 thành công! +${reward.xu} Xu, +${reward.xp} XP`,
            streak: newStreak, reward, xu: gamif.xu, xp: gamif.xp, level: gamif.level
        });

    } catch (err) {
        console.error('[Gamification] claim-streak error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/gamification/mission/complete ──────────────────────────────────
router.post('/mission/complete', requireAuth, async (req, res) => {
    try {
        const { mission_id, progress_delta = 1 } = req.body;
        const userId = req.user.id;

        let gamif = await Gamification.findOne({ user_id: userId });
        if (!gamif) gamif = await Gamification.create({ user_id: userId });
        ensureMissionsReset(gamif);

        const mission = gamif.missions.find(m => m.id === mission_id);
        const def = MISSIONS_DEF.find(d => d.id === mission_id);
        if (!mission || !def) {
            return res.status(400).json({ success: false, message: 'Nhiệm vụ không tồn tại.' });
        }

        if (!mission.completed) {
            mission.progress = Math.min(mission.progress + progress_delta, def.target);
            if (mission.progress >= def.target) mission.completed = true;
        }

        await gamif.save();
        return res.json({ success: true, mission: { ...mission.toObject(), ...def } });

    } catch (err) {
        console.error('[Gamification] mission/complete error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/gamification/mission/claim ────────────────────────────────────
router.post('/mission/claim', requireAuth, async (req, res) => {
    try {
        const { mission_id } = req.body;
        const userId = req.user.id;

        let gamif = await Gamification.findOne({ user_id: userId });
        if (!gamif) return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu.' });
        ensureMissionsReset(gamif);

        const mission = gamif.missions.find(m => m.id === mission_id);
        const def = MISSIONS_DEF.find(d => d.id === mission_id);
        if (!mission || !def) return res.status(400).json({ success: false, message: 'Không tìm thấy nhiệm vụ.' });
        if (!mission.completed) return res.status(400).json({ success: false, message: 'Nhiệm vụ chưa hoàn thành.' });
        if (mission.claimed) return res.status(400).json({ success: false, message: 'Đã nhận thưởng rồi!' });

        mission.claimed = true;
        gamif.xu += def.xu;
        gamif.xp += def.xp;
        gamif.xu_lifetime += def.xu;
        gamif.level = calcLevel(gamif.xp);
        gamif.rank = calcRank(gamif.level);

        await gamif.save();
        await syncToProfile(userId, gamif.xu, gamif.xp);

        return res.json({
            success: true,
            message: `Nhận thưởng "${def.title}" thành công! +${def.xu} Xu, +${def.xp} XP`,
            xu: gamif.xu, xp: gamif.xp, level: gamif.level
        });

    } catch (err) {
        console.error('[Gamification] mission/claim error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/gamification/redeem-vip ───────────────────────────────────────
router.post('/redeem-vip', requireAuth, async (req, res) => {
    try {
        const { days } = req.body;
        const userId = req.user.id;

        const VIP_PACKAGES = {
            1: { days: 1, xuCost: 100, title: 'VIP 1 Ngày' },
            3: { days: 3, xuCost: 250, title: 'VIP 3 Ngày' },
            7: { days: 7, xuCost: 500, title: 'VIP 7 Ngày' },
            30: { days: 30, xuCost: 1800, title: 'VIP 30 Ngày' }
        };

        const pack = VIP_PACKAGES[days];
        if (!pack) return res.status(400).json({ success: false, message: 'Gói VIP không hợp lệ.' });

        let gamif = await Gamification.findOne({ user_id: userId });
        if (!gamif) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

        if (gamif.xu < pack.xuCost) {
            return res.status(400).json({
                success: false,
                message: `Bạn cần ${pack.xuCost} Xu. Số dư hiện tại: ${gamif.xu} Xu.`
            });
        }

        // Trừ xu
        gamif.xu -= pack.xuCost;
        await gamif.save();
        await supabaseAdmin.from('profiles').update({ xu: gamif.xu }).eq('id', userId);

        // Tạo subscription Supabase
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pack.days);

        await supabaseAdmin.from('vip_subscriptions').insert({
            user_id: userId, plan: 'PREMIUM', status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            payment_ref: `XU_REDEEM_${pack.title.replace(' ', '_').toUpperCase()}_${Date.now()}`
        });

        // Log transaction
        await supabaseAdmin.from('transactions').insert({
            user_id: userId, type: 'xu_redeem_vip',
            amount_vnd: 0, xu_amount: -pack.xuCost,
            plan_code: `VIP_${days}D`, status: 'confirmed',
            transfer_content: `Dùng ${pack.xuCost} Xu đổi ${pack.title}`
        });

        return res.json({
            success: true,
            message: `Đổi ${pack.title} thành công! Hạn dùng đến ${expiresAt.toLocaleDateString('vi-VN')}.`,
            xu: gamif.xu, vip_expires: expiresAt.toISOString()
        });

    } catch (err) {
        console.error('[Gamification] redeem-vip error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/gamification/leaderboard ──────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || 'weekly';
        const currentUserId = req.query.userId || (req.user ? req.user.id : null);

        // Lấy danh sách thành viên thực tế từ Supabase profiles
        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, name, avatar_url, xp, xu, level, equipped_frame, created_at, role')
            .order('xp', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[Leaderboard] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn cơ sở dữ liệu.' });
        }

        // Lọc bỏ tài khoản role admin để bảng xếp hạng thuần người dùng thực
        const regularUsers = (profiles || []).filter(p => p.role !== 'admin');
        const userIds = regularUsers.map(p => p.id);

        let gamifs = [];
        let histories = [];
        try {
            gamifs = await Gamification.find({ user_id: { $in: userIds } });
        } catch (e) {
            console.warn('[Leaderboard] Gamification find warn:', e.message);
        }

        try {
            const WatchHistory = require('../models/WatchHistory');
            histories = await WatchHistory.find({ user_id: { $in: userIds } });
        } catch (e) {
            console.warn('[Leaderboard] WatchHistory find warn:', e.message);
        }

        const gamifMap = new Map();
        (gamifs || []).forEach(g => gamifMap.set(g.user_id, g));

        const historyMap = new Map();
        (histories || []).forEach(h => {
            let totalSeconds = 0;
            (h.history || []).forEach(item => {
                totalSeconds += (item.progress_seconds || 0);
            });
            historyMap.set(h.user_id, Math.round(totalSeconds / 3600));
        });

        let fullList = regularUsers.map(p => {
            const g = gamifMap.get(p.id) || {};
            const realXP = (g.xp !== undefined && g.xp !== null) ? Math.max(g.xp, p.xp || 0) : (p.xp || 0);
            const watchHours = historyMap.get(p.id) || Math.max(0, Math.round(realXP / 35));
            const streak = g.streak_current || 1;
            const level = p.level || g.level || calcLevel(realXP);
            const rank = g.rank || calcRank(level);
            const name = p.name || 'Thành viên APhim';
            const avatar = p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.id || name)}`;
            const isMe = currentUserId && (p.id === currentUserId);

            return {
                id: p.id,
                name,
                avatar,
                xp: realXP,
                hours: watchHours,
                rank,
                level,
                streak,
                equipped_frame: p.equipped_frame || 'frame_none',
                isMe: !!isMe
            };
        });

        // Sắp xếp giảm dần theo điểm kinh nghiệm thực tế
        fullList.sort((a, b) => b.xp - a.xp);
        fullList.forEach((item, index) => {
            item.position = index + 1;
        });

        let myRankItem = null;
        if (currentUserId) {
            myRankItem = fullList.find(x => x.id === currentUserId);
        }

        const top3 = fullList.slice(0, 3);
        const rest = fullList.slice(3, 10);

        return res.json({
            success: true,
            data: {
                timeframe,
                top3,
                rest,
                myRank: myRankItem ? myRankItem.position : (fullList.length ? fullList.length + 1 : 1),
                myEntry: myRankItem || null,
                all: fullList
            }
        });

    } catch (err) {
        console.error('[Leaderboard] error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

module.exports = router;
