/**
 * User UI - Cập nhật nav theo trạng thái đăng nhập
 * - Đã đăng nhập: thay #authContainer bằng avatar + tên
 * - Chưa đăng nhập: KHÔNG thay gì cả, để button gốc với onclick/auth-modal.js xử lý
 */

function getEquippedFrameInfo(u) {
    const frameId = (u && u.equippedFrame) || localStorage.getItem('ap_frame_id') || localStorage.getItem('ap_equipped_frame') || '';
    if (!frameId || frameId === 'frame_none' || frameId === 'none') {
        return { type: 'none', value: '' };
    }

    // 1. Direct URL check on user or localStorage
    let url = (u && u.equippedFrameUrl) || localStorage.getItem('ap_frame_url') || localStorage.getItem('ap_equipped_frame_url') || '';
    let cls = (u && u.equippedFrameClass) || localStorage.getItem('ap_frame_class') || '';

    if (frameId && (frameId.startsWith('http') || frameId.startsWith('data:'))) {
        url = frameId;
    }

    // Lookup in DISCORD_FRAMES_MAP or window._shopFramesMap if present
    if (!url && !cls && frameId) {
        if (window.DISCORD_FRAMES_MAP && window.DISCORD_FRAMES_MAP[frameId]) {
            url = window.DISCORD_FRAMES_MAP[frameId];
        } else if (window._shopFramesMap && window._shopFramesMap[frameId]) {
            const item = window._shopFramesMap[frameId];
            if (item.frameImg) url = item.frameImg;
            if (item.class) cls = item.class;
        }
    }

    if (url && (url.startsWith('http') || url.startsWith('data:'))) {
        return { type: 'url', value: url };
    }

    if (cls && cls !== 'none' && cls.startsWith('av-frame-')) {
        return { type: 'class', value: cls };
    }

    if (frameId) {
        const frameMap = {
            'vien_don': 'av-frame-simple', 'dut_doan': 'av-frame-dash', 'vien_kep': 'av-frame-double',
            'hao_quang': 'av-frame-glow', 'neon': 'av-frame-neon', 'film': 'av-frame-film',
            'vhs': 'av-frame-vhs', 'gradient': 'av-frame-gradient', 'trai_tim': 'av-frame-heart',
            'tai_tho': 'av-frame-bunny', 'canh_than': 'av-frame-angel-wings', 'sung_quy': 'av-frame-devil',
            'ech_xanh': 'av-frame-frog', 'meo_hong': 'av-frame-cat_pink', 'cao_cam': 'av-frame-fox_orange',
            'meo_lam': 'av-frame-cat_blue', 'rotate': 'av-frame-rotate', 'sam_chop': 'av-frame-lightning',
            'lap_lanh': 'av-frame-sparkle', 'hologram': 'av-frame-hologram-v2', 'hoang_gia': 'av-frame-royal-v2',
            'vang_oscar': 'av-frame-oscar-v2', 'cau_vong': 'av-frame-rainbow-v2', 'rong_bay': 'av-frame-dragon',
            'meo_den': 'av-frame-purple_glow', 'meo_canh': 'av-frame-rose', 'phu_thuy': 'av-frame-witch-v2',
            'thien_than': 'av-frame-angel-v2', 'fire': 'av-frame-fire-mythic', 'ice': 'av-frame-ice-v2',
            'lightning2': 'av-frame-lightning-mythic', 'gold_oscar': 'av-frame-oscar-v2', 'sakura': 'av-frame-sakura',
            'matrix': 'av-frame-matrix', 'cyber': 'av-frame-cyber', 'galaxy': 'av-frame-galaxy-v2',
            'phoenix': 'av-frame-phoenix', 'diamond': 'av-frame-diamond-v2', 'winter': 'av-frame-snow',
            'dragon_v2': 'av-frame-dragon-v2', 'king_crown': 'av-frame-king', 'storm_v2': 'av-frame-storm'
        };
        if (frameMap[frameId]) return { type: 'class', value: frameMap[frameId] };
        if (frameId.startsWith('av-frame-')) return { type: 'class', value: frameId };
    }

    return { type: 'none', value: '' };
}

function renderAvatarWithFrame(innerHtml, sizePx, frameInfo) {
    sizePx = sizePx || 38;
    const fontSize = Math.round(sizePx * 0.42);
    if (!frameInfo || frameInfo.type === 'none') {
        return `<div class="ap-user-avatar-badge ap-avatar-no-frame" style="width:${sizePx}px; height:${sizePx}px; border-radius:50%; border:2px solid rgba(255,255,255,0.22); background:linear-gradient(135deg, #fcd576, #d97706); display:flex; align-items:center; justify-content:center; font-size:${fontSize}px; font-weight:900; color:#1a1000; overflow:hidden; flex-shrink:0; box-shadow:0 2px 8px rgba(0,0,0,0.2); position:relative; z-index:2;">${innerHtml}</div>`;
    }
    if (frameInfo.type === 'url') {
        return `
            <div class="user-avatar-frame-wrap" style="position:relative; display:inline-flex; align-items:center; justify-content:center; width:${sizePx}px; height:${sizePx}px; flex-shrink:0;">
                <div class="user-avatar-inner" style="width:100%; height:100%; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, #fcd576 0%, #f59e0b 100%) !important; position:relative; z-index:1; font-size:${fontSize}px; font-weight:900; color:#1a1000 !important; box-shadow:0 4px 14px rgba(245,158,11,0.45);">
                    ${innerHtml}
                </div>
                <img src="${frameInfo.value}" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:120%; height:120%; max-width:none; max-height:none; object-fit:contain; pointer-events:none; z-index:5;" alt="frame">
            </div>
        `;
    }
    if (frameInfo.type === 'class') {
        const sizeClass = sizePx <= 40 ? 'size-xs' : (sizePx <= 64 ? 'size-sm' : 'size-lg');
        return `
            <div class="shop-frame-wrap ${sizeClass} ${frameInfo.value}" style="width:${sizePx}px; height:${sizePx}px; flex-shrink:0; position:relative; z-index:2;">
                ${innerHtml}
            </div>
        `;
    }
    return innerHtml;
}
window.renderAvatarWithFrame = renderAvatarWithFrame;

var NAME_COLORS_MAP = window.NAME_COLORS_MAP || {
    // Phổ thông (5)
    'color_default': { id: 'color_default', name: 'Mặc định', rarity: 'common', textStyle: '' },
    'color_gold': { id: 'color_gold', name: 'Vàng Hoàng Kim', rarity: 'common', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 18%, #f59e0b 45%, #b45309 60%, #fef08a 75%, #ffffff 88%, #d97706 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #b45309) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(245,158,11,0.6)); font-weight: 900; animation: nameShimmerGlint 2.4s linear infinite;' },
    'color_cyan': { id: 'color_cyan', name: 'Xanh Cyberpunk', rarity: 'common', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #cffafe 18%, #38bdf8 45%, #0284c7 65%, #a5f3fc 78%, #ffffff 88%, #0369a1 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #0284c7) drop-shadow(0 2px 0 #0369a1) drop-shadow(0 3px 0 #075985) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(56,189,248,0.6)); font-weight: 900; animation: nameGradientWave 2s linear infinite;' },
    'color_pink': { id: 'color_pink', name: 'Hồng Neon', rarity: 'common', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fce7f3 18%, #f472b6 45%, #db2777 65%, #fbcfe8 78%, #ffffff 88%, #9d174d 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #db2777) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #831843) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(236,72,153,0.6)); font-weight: 900; animation: nameGradientWave 1.9s linear infinite, nameNeonPulse 2.2s ease-in-out infinite;' },
    'color_silver': { id: 'color_silver', name: 'Bạc Platinum', rarity: 'common', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f8fafc 20%, #cbd5e1 45%, #64748b 65%, #ffffff 78%, #cbd5e1 88%, #475569 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #94a3b8) drop-shadow(0 2px 0 #64748b) drop-shadow(0 3px 0 #475569) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(203,213,225,0.6)); font-weight: 900; animation: nameShimmerGlint 2.6s linear infinite;' },

    // Hiếm (7)
    'color_purple': { id: 'color_purple', name: 'Tím Cyber', rarity: 'rare', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f3e8ff 18%, #c084fc 45%, #7e22ce 65%, #e9d5ff 78%, #ffffff 88%, #581c87 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #9333ea) drop-shadow(0 2px 0 #7e22ce) drop-shadow(0 3px 0 #581c87) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(192,132,252,0.6)); font-weight: 900; animation: nameGradientWave 2.2s linear infinite;' },
    'color_amber': { id: 'color_amber', name: 'Cam Hổ Phách', rarity: 'rare', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef3c7 18%, #fbbf24 45%, #d97706 65%, #fef08a 78%, #ffffff 88%, #92400e 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #b45309) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(245,158,11,0.6)); font-weight: 900; animation: nameShimmerGlint 2.3s linear infinite;' },
    'color_fire': { id: 'color_fire', name: 'Đỏ Huyết Lửa', rarity: 'rare', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 15%, #f97316 35%, #ef4444 55%, #b91c1c 75%, #ffffff 85%, #7f1d1d 100%); background-size: 280% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #dc2626) drop-shadow(0 2px 0 #b91c1c) drop-shadow(0 3px 0 #7f1d1d) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(239,68,68,0.7)); font-weight: 900; animation: nameFlameFlicker 1.8s ease-in-out infinite;' },
    'color_ocean': { id: 'color_ocean', name: 'Xanh Đại Dương', rarity: 'rare', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #dbeafe 18%, #60a5fa 45%, #2563eb 65%, #93c5fd 78%, #ffffff 88%, #1e3a8a 100%); background-size: 280% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #2563eb) drop-shadow(0 2px 0 #1d4ed8) drop-shadow(0 3px 0 #1e3a8a) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(59,130,246,0.6)); font-weight: 900; animation: nameGradientWave 2.3s linear infinite;' },
    'color_sakura': { id: 'color_sakura', name: 'Hồng Anh Đào', rarity: 'rare', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fce7f3 18%, #f472b6 45%, #ec4899 65%, #fbcfe8 78%, #ffffff 88%, #be185d 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #db2777) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #831843) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(244,114,182,0.6)); font-weight: 900; animation: nameGradientWave 2s linear infinite;' },
    'color_frost': { id: 'color_frost', name: 'Băng Tuyết Cryo', rarity: 'rare', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f0f9ff 20%, #7dd3fc 45%, #0284c7 65%, #bae6fd 78%, #ffffff 88%, #0369a1 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #0284c7) drop-shadow(0 2px 0 #0369a1) drop-shadow(0 3px 0 #0c4a6e) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(56,189,248,0.7)); font-weight: 900; animation: nameGradientWave 2s linear infinite, nameFrostSparkle 2.8s ease-in-out infinite;' },
    'color_lime': { id: 'color_lime', name: 'Xanh Chanh Lime', rarity: 'rare', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f7fee7 18%, #a3e635 45%, #65a30d 65%, #d9f99d 78%, #ffffff 88%, #365314 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #65a30d) drop-shadow(0 2px 0 #4d7c0f) drop-shadow(0 3px 0 #365314) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(163,230,53,0.6)); font-weight: 900; animation: nameGradientWave 1.9s linear infinite;' },

    // Sử Thi (7)
    'color_emerald': { id: 'color_emerald', name: 'Xanh Ngọc Lục', rarity: 'epic', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #ecfdf5 18%, #34d399 45%, #059669 65%, #a7f3d0 78%, #ffffff 88%, #064e3b 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #059669) drop-shadow(0 2px 0 #047857) drop-shadow(0 3px 0 #064e3b) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(52,211,153,0.6)); font-weight: 900; animation: nameGradientWave 1.8s linear infinite;' },
    'color_aurora': { id: 'color_aurora', name: 'Laser Aurora', rarity: 'epic', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 15%, #f97316 35%, #ef4444 55%, #ec4899 75%, #ffffff 85%, #be185d 100%); background-size: 280% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #ea580c) drop-shadow(0 2px 0 #c2410c) drop-shadow(0 3px 0 #7c2d12) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(249,115,22,0.7)); font-weight: 900; animation: nameGradientWave 1.5s linear infinite;' },
    'color_thunder': { id: 'color_thunder', name: 'Sấm Sét Lôi Điện', rarity: 'epic', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 18%, #60a5fa 40%, #2563eb 60%, #fde047 75%, #ffffff 88%, #1e3a8a 100%); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #2563eb) drop-shadow(0 2px 0 #1d4ed8) drop-shadow(0 3px 0 #1e3a8a) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(96,165,250,0.75)); font-weight: 900; animation: nameLightningFlash 2.2s infinite;' },
    'color_dark_magic': { id: 'color_dark_magic', name: 'Ma Pháp Hắc Ám', rarity: 'epic', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f3e8ff 18%, #a855f7 45%, #6b21a8 65%, #c084fc 78%, #ffffff 88%, #3b0764 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #7c3aed) drop-shadow(0 2px 0 #581c87) drop-shadow(0 3px 0 #3b0764) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(168,85,247,0.75)); font-weight: 900; animation: nameVoidPulse 2.5s ease-in-out infinite;' },
    'color_mythic_plat': { id: 'color_mythic_plat', name: 'Bạch Kim Glitch', rarity: 'epic', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f8fafc 18%, #cbd5e1 45%, #64748b 65%, #ffffff 78%, #cbd5e1 88%, #334155 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #64748b) drop-shadow(0 2px 0 #475569) drop-shadow(0 3px 0 #1e293b) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(226,232,240,0.6)); font-weight: 900; animation: nameGradientWave 1.8s linear infinite, nameGlitchCut 3s infinite;' },
    'color_ruby': { id: 'color_ruby', name: 'Hồng Ngọc Ruby', rarity: 'epic', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #ffe4e6 18%, #fb7185 45%, #e11d48 65%, #fecdd3 78%, #ffffff 88%, #881337 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #e11d48) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #881337) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(251,113,133,0.7)); font-weight: 900; animation: nameShimmerGlint 2.2s linear infinite;' },
    'color_gradient_sunset': { id: 'color_gradient_sunset', name: 'Hoàng Hôn Sunset', rarity: 'epic', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fed7aa 15%, #f97316 35%, #ec4899 55%, #8b5cf6 75%, #ffffff 85%, #4c1d95 100%); background-size: 350% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #ea580c) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #581c87) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(249,115,22,0.7)); font-weight: 900; animation: nameGradientWave 1.8s linear infinite;' },

    // Huyền Thoại (5)
    'color_rainbow': { id: 'color_rainbow', name: 'Cầu Vồng 7 Màu', rarity: 'legendary', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #ef4444 14%, #f59e0b 28%, #10b981 42%, #06b6d4 56%, #3b82f6 70%, #8b5cf6 84%, #ec4899 100%); background-size: 350% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #059669) drop-shadow(0 3px 0 #2563eb) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(239,68,68,0.65)); font-weight: 900; animation: nameGradientWave 1.6s linear infinite, nameHueShift 5s linear infinite;' },
    'color_galaxy_shift': { id: 'color_galaxy_shift', name: 'Ngân Hà Galaxy', rarity: 'legendary', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f3e8ff 15%, #c084fc 35%, #38bdf8 55%, #f472b6 75%, #ffffff 85%, #4f46e5 100%); background-size: 350% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #7c3aed) drop-shadow(0 2px 0 #0284c7) drop-shadow(0 3px 0 #312e81) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(168,85,247,0.75)); font-weight: 900; animation: nameGradientWave 1.4s linear infinite;' },
    'color_matrix': { id: 'color_matrix', name: 'Matrix Cyber', rarity: 'legendary', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #dcfce7 18%, #4ade80 45%, #16a34a 65%, #86efac 78%, #ffffff 88%, #14532d 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #16a34a) drop-shadow(0 2px 0 #15803d) drop-shadow(0 3px 0 #14532d) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(74,222,128,0.8)); font-weight: 900; animation: nameGradientWave 1.3s linear infinite, nameMatrixPulse 2s ease-in-out infinite;' },
    'color_emperor': { id: 'color_emperor', name: 'Đế Vương Hoàng Kim', rarity: 'legendary', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fffbeb 14%, #fef08a 28%, #f59e0b 48%, #d97706 68%, #ffffff 82%, #78350f 100%); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #b45309) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 2px rgba(0,0,0,0.75)) drop-shadow(0 0 14px rgba(253,211,77,0.85)); font-weight: 900; animation: nameShimmerGlint 1.8s linear infinite, nameDivineGlow 2.5s ease-in-out infinite;' },
    'color_divine_light': { id: 'color_divine_light', name: 'Ánh Sáng Thần Thánh', rarity: 'legendary', textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef9c3 14%, #ffffff 28%, #fcd34d 48%, #f59e0b 68%, #ffffff 82%, #b45309 100%); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #f59e0b) drop-shadow(0 2px 0 #d97706) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 3px rgba(0,0,0,0.8)) drop-shadow(0 0 16px rgba(253,211,77,0.95)); font-weight: 900; animation: nameShimmerGlint 1.5s linear infinite, nameDivineGlow 2s ease-in-out infinite;' }
};
window.NAME_COLORS_MAP = NAME_COLORS_MAP;

var LIGHT_MODE_GRADIENTS = window.LIGHT_MODE_GRADIENTS || {
    'color_gold': 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 18%, #f59e0b 45%, #b45309 60%, #fef08a 75%, #ffffff 88%, #d97706 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #b45309) drop-shadow(0 2px 0 #78350f) drop-shadow(0 3px 0 #451a03) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_silver': 'background-image: linear-gradient(135deg, #ffffff 0%, #f1f5f9 20%, #94a3b8 45%, #475569 65%, #ffffff 78%, #64748b 88%, #334155 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #64748b) drop-shadow(0 2px 0 #475569) drop-shadow(0 3px 0 #1e293b) drop-shadow(0 4px 2px rgba(0,0,0,0.4)) !important;',
    'color_cyan': 'background-image: linear-gradient(135deg, #ffffff 0%, #bae6fd 18%, #0284c7 45%, #0369a1 65%, #7dd3fc 78%, #ffffff 88%, #075985 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #0284c7) drop-shadow(0 2px 0 #0369a1) drop-shadow(0 3px 0 #075985) drop-shadow(0 4px 2px rgba(0,0,0,0.4)) !important;',
    'color_pink': 'background-image: linear-gradient(135deg, #ffffff 0%, #fbcfe8 18%, #db2777 45%, #be185d 65%, #f472b6 78%, #ffffff 88%, #831843 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #db2777) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #831843) drop-shadow(0 4px 2px rgba(0,0,0,0.4)) !important;',
    'color_purple': 'background-image: linear-gradient(135deg, #ffffff 0%, #e9d5ff 18%, #7e22ce 45%, #6b21a8 65%, #c084fc 78%, #ffffff 88%, #3b0764 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #7e22ce) drop-shadow(0 2px 0 #6b21a8) drop-shadow(0 3px 0 #3b0764) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_fire': 'background-image: linear-gradient(135deg, #ffffff 0%, #fed7aa 15%, #ef4444 35%, #b91c1c 55%, #7f1d1d 75%, #ffffff 85%, #450a0a 100%) !important; background-size: 280% 100% !important; filter: drop-shadow(0 1px 0 #dc2626) drop-shadow(0 2px 0 #b91c1c) drop-shadow(0 3px 0 #7f1d1d) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_amber': 'background-image: linear-gradient(135deg, #ffffff 0%, #fef3c7 18%, #d97706 45%, #b45309 65%, #fbbf24 78%, #ffffff 88%, #78350f 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #b45309) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_ocean': 'background-image: linear-gradient(135deg, #ffffff 0%, #bfdbfe 18%, #2563eb 45%, #1d4ed8 65%, #60a5fa 78%, #ffffff 88%, #172554 100%) !important; background-size: 280% 100% !important; filter: drop-shadow(0 1px 0 #2563eb) drop-shadow(0 2px 0 #1d4ed8) drop-shadow(0 3px 0 #1e3a8a) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_sakura': 'background-image: linear-gradient(135deg, #ffffff 0%, #fbcfe8 18%, #db2777 45%, #be185d 65%, #f472b6 78%, #ffffff 88%, #831843 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #db2777) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #831843) drop-shadow(0 4px 2px rgba(0,0,0,0.4)) !important;',
    'color_frost': 'background-image: linear-gradient(135deg, #ffffff 0%, #bae6fd 20%, #0284c7 45%, #0369a1 65%, #7dd3fc 78%, #ffffff 88%, #082f49 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #0284c7) drop-shadow(0 2px 0 #0369a1) drop-shadow(0 3px 0 #0c4a6e) drop-shadow(0 4px 2px rgba(0,0,0,0.4)) !important;',
    'color_lime': 'background-image: linear-gradient(135deg, #ffffff 0%, #d9f99d 18%, #65a30d 45%, #4d7c0f 65%, #a3e635 78%, #ffffff 88%, #1a2e05 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #65a30d) drop-shadow(0 2px 0 #4d7c0f) drop-shadow(0 3px 0 #365314) drop-shadow(0 4px 2px rgba(0,0,0,0.4)) !important;',
    'color_emerald': 'background-image: linear-gradient(135deg, #ffffff 0%, #a7f3d0 18%, #059669 45%, #047857 65%, #34d399 78%, #ffffff 88%, #022c22 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #059669) drop-shadow(0 2px 0 #047857) drop-shadow(0 3px 0 #064e3b) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_aurora': 'background-image: linear-gradient(135deg, #ffffff 0%, #fed7aa 15%, #ea580c 35%, #dc2626 55%, #db2777 75%, #ffffff 85%, #831843 100%) !important; background-size: 280% 100% !important; filter: drop-shadow(0 1px 0 #ea580c) drop-shadow(0 2px 0 #c2410c) drop-shadow(0 3px 0 #7c2d12) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_thunder': 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 18%, #2563eb 40%, #1d4ed8 60%, #f59e0b 75%, #ffffff 88%, #0f172a 100%) !important; background-size: 300% 100% !important; filter: drop-shadow(0 1px 0 #2563eb) drop-shadow(0 2px 0 #1d4ed8) drop-shadow(0 3px 0 #1e3a8a) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_dark_magic': 'background-image: linear-gradient(135deg, #ffffff 0%, #ddd6fe 18%, #7c3aed 45%, #581c87 65%, #a855f7 78%, #ffffff 88%, #2e1065 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #7c3aed) drop-shadow(0 2px 0 #581c87) drop-shadow(0 3px 0 #3b0764) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_mythic_plat': 'background-image: linear-gradient(135deg, #ffffff 0%, #e2e8f0 18%, #64748b 45%, #334155 65%, #ffffff 78%, #475569 88%, #0f172a 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #64748b) drop-shadow(0 2px 0 #475569) drop-shadow(0 3px 0 #1e293b) drop-shadow(0 4px 2px rgba(0,0,0,0.4)) !important;',
    'color_ruby': 'background-image: linear-gradient(135deg, #ffffff 0%, #fecdd3 18%, #e11d48 45%, #be123c 65%, #fb7185 78%, #ffffff 88%, #4c0519 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #e11d48) drop-shadow(0 2px 0 #be123c) drop-shadow(0 3px 0 #881337) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_gradient_sunset': 'background-image: linear-gradient(135deg, #ffffff 0%, #fed7aa 15%, #ea580c 35%, #db2777 55%, #7c3aed 75%, #ffffff 85%, #3b0764 100%) !important; background-size: 350% 100% !important; filter: drop-shadow(0 1px 0 #ea580c) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #581c87) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_rainbow': 'background-image: linear-gradient(135deg, #ffffff 0%, #dc2626 14%, #d97706 28%, #059669 42%, #0284c7 56%, #2563eb 70%, #7c3aed 84%, #db2777 100%) !important; background-size: 350% 100% !important; filter: drop-shadow(0 1px 0 #b45309) drop-shadow(0 2px 0 #047857) drop-shadow(0 3px 0 #1d4ed8) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_galaxy_shift': 'background-image: linear-gradient(135deg, #ffffff 0%, #e9d5ff 15%, #9333ea 35%, #0284c7 55%, #db2777 75%, #ffffff 85%, #312e81 100%) !important; background-size: 350% 100% !important; filter: drop-shadow(0 1px 0 #7e22ce) drop-shadow(0 2px 0 #0369a1) drop-shadow(0 3px 0 #1e1b4b) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_matrix': 'background-image: linear-gradient(135deg, #ffffff 0%, #bbf7d0 18%, #16a34a 45%, #15803d 65%, #4ade80 78%, #ffffff 88%, #052e16 100%) !important; background-size: 250% 100% !important; filter: drop-shadow(0 1px 0 #15803d) drop-shadow(0 2px 0 #166534) drop-shadow(0 3px 0 #14532d) drop-shadow(0 4px 2px rgba(0,0,0,0.45)) !important;',
    'color_emperor': 'background-image: linear-gradient(135deg, #ffffff 0%, #fef3c7 14%, #f59e0b 28%, #d97706 48%, #b45309 68%, #ffffff 82%, #451a03 100%) !important; background-size: 300% 100% !important; filter: drop-shadow(0 1px 0 #b45309) drop-shadow(0 2px 0 #78350f) drop-shadow(0 3px 0 #451a03) drop-shadow(0 4px 2px rgba(0,0,0,0.5)) !important;',
    'color_divine_light': 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 14%, #ffffff 28%, #f59e0b 48%, #d97706 68%, #ffffff 82%, #78350f 100%) !important; background-size: 300% 100% !important; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #92400e) drop-shadow(0 3px 0 #451a03) drop-shadow(0 4px 2px rgba(0,0,0,0.55)) !important;'
};
window.LIGHT_MODE_GRADIENTS = LIGHT_MODE_GRADIENTS;

function ensureNameColorStyles() {
    if (typeof document === 'undefined') return;
    let styleEl = document.getElementById('ap-name-color-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ap-name-color-styles';
        document.head.appendChild(styleEl);
    }
    let css = `
        @keyframes nameGradientWave {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes nameShimmerGlint {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes nameHueShift {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
        @keyframes nameGlitchCut {
            0%, 86%, 100% { transform: translate(0, 0) skewX(0deg); filter: brightness(1); }
            88% { transform: translate(-1.5px, 0.5px) skewX(-4deg); filter: brightness(1.35) contrast(1.2); }
            92% { transform: translate(1.5px, -0.5px) skewX(4deg); filter: brightness(1.45) contrast(1.25); }
            96% { transform: translate(0, 0) skewX(0deg); filter: brightness(1); }
        }
        @keyframes nameFlameFlicker {
            0%, 100% { background-position: 0% 50%; filter: brightness(1); }
            25% { background-position: 30% 50%; filter: brightness(1.25) contrast(1.15); }
            50% { background-position: 70% 50%; filter: brightness(1.1); }
            75% { background-position: 100% 50%; filter: brightness(1.35) contrast(1.2); }
        }
        @keyframes nameLightningFlash {
            0%, 82%, 100% { background-position: 0% 50%; filter: brightness(1); }
            85% { background-position: 50% 50%; filter: brightness(1.6) contrast(1.3); }
            88% { background-position: 20% 50%; filter: brightness(1.1); }
            91% { background-position: 100% 50%; filter: brightness(1.8) contrast(1.4); }
            95% { background-position: 100% 50%; filter: brightness(1.15); }
        }
        @keyframes nameDivineGlow {
            0%, 100% { filter: brightness(1) contrast(1.05); }
            50% { filter: brightness(1.35) contrast(1.2); }
        }
        @keyframes nameFrostSparkle {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.3) contrast(1.15); }
        }
        @keyframes nameNeonPulse {
            0%, 100% { filter: brightness(1) contrast(1.05); }
            50% { filter: brightness(1.35) contrast(1.2); }
        }
        @keyframes nameVoidPulse {
            0%, 100% { filter: brightness(1) contrast(1.05); }
            50% { filter: brightness(1.35) contrast(1.2); }
        }
        @keyframes nameMatrixPulse {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.35) contrast(1.2); }
        }
        .has-custom-name-color,
        .shop-name-text-render,
        .sidebar-username.has-custom-name-color,
        .ap-user-name-text.has-custom-name-color,
        .ap-dropdown-user-name.has-custom-name-color,
        .mm-user-name-text.has-custom-name-color,
        .avatar-label.has-custom-name-color {
            font-family: 'Montserrat', 'Oswald', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif !important;
            font-weight: 900 !important;
            letter-spacing: 0.04em !important;
            text-transform: none !important;
            display: inline-block !important;
        }

        /* Default Name Style: Standard, clean, unstyled font matching light and dark themes */
        .ap-nc-color_default {
            background: none !important;
            -webkit-background-clip: initial !important;
            -webkit-text-fill-color: #ffffff !important;
            color: #ffffff !important;
            animation: none !important;
            filter: none !important;
            text-shadow: none !important;
            font-weight: 700 !important;
        }
        html.light-mode .ap-nc-color_default,
        html.light-mode .ap-user-name-text.ap-nc-color_default,
        html.light-mode .ap-dropdown-user-name.ap-nc-color_default,
        html.light-mode .mm-user-name-text.ap-nc-color_default,
        html.light-mode .sidebar-username.ap-nc-color_default,
        html.light-mode .avatar-label.ap-nc-color_default,
        html.light-mode .shop-name-text-render.ap-nc-color_default {
            background: none !important;
            -webkit-background-clip: initial !important;
            -webkit-text-fill-color: #1c1917 !important;
            color: #1c1917 !important;
            animation: none !important;
            filter: none !important;
            text-shadow: none !important;
            font-weight: 700 !important;
        }
    `;
    Object.keys(NAME_COLORS_MAP).forEach(id => {
        const item = NAME_COLORS_MAP[id];
        if (id === 'color_default') {
            // Handled above cleanly
        } else {
            css += `
                .ap-nc-${id} {
                    ${item.textStyle}
                    display: inline-block;
                }
            `;
            if (LIGHT_MODE_GRADIENTS[id]) {
                css += `
                    html.light-mode .ap-nc-${id} {
                        ${LIGHT_MODE_GRADIENTS[id]}
                        -webkit-background-clip: text !important;
                        -webkit-text-fill-color: transparent !important;
                    }
                `;
            }
        }
    });
    styleEl.textContent = css;
}
ensureNameColorStyles();

function getEquippedColorId(u) {
    return (u && u.equippedColor) || localStorage.getItem('ap_equipped_color') || 'color_default';
}
window.getEquippedColorId = getEquippedColorId;

function getEquippedNameColorClass(u) {
    const id = getEquippedColorId(u);
    return (id && id !== 'color_default' && id !== 'none') ? `ap-nc-${id} has-custom-name-color` : 'ap-nc-color_default';
}
window.getEquippedNameColorClass = getEquippedNameColorClass;

function getEquippedNameColorStyle(u) {
    const id = getEquippedColorId(u);
    const isLightMode = typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('light-mode');

    if (id === 'color_default' || id === 'none' || !id) {
        if (isLightMode) {
            return 'background: none !important; -webkit-background-clip: initial !important; -webkit-text-fill-color: #1c1917 !important; color: #1c1917 !important; animation: none !important; filter: none !important; text-shadow: none !important; font-weight: 700 !important;';
        }
        return 'background: none !important; -webkit-background-clip: initial !important; -webkit-text-fill-color: #ffffff !important; color: #ffffff !important; animation: none !important; filter: none !important; text-shadow: none !important; font-weight: 700 !important;';
    }

    if (isLightMode && LIGHT_MODE_GRADIENTS[id]) {
        return `${LIGHT_MODE_GRADIENTS[id]} -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; font-weight: 900 !important; font-family: "Montserrat", "Oswald", "Be Vietnam Pro", system-ui, sans-serif !important; letter-spacing: 0.04em !important; text-transform: none !important;`;
    }

    const item = NAME_COLORS_MAP[id];
    if (item && item.textStyle) {
        return item.textStyle + ' font-family: "Montserrat", "Oswald", "Be Vietnam Pro", system-ui, sans-serif !important; letter-spacing: 0.04em !important; text-transform: none !important;';
    }
    return '';
}
window.getEquippedNameColorStyle = getEquippedNameColorStyle;

function applyEquippedNameColor(el, u) {
    if (!el || !el.style) return;
    ensureNameColorStyles();
    const id = getEquippedColorId(u);
    const cls = getEquippedNameColorClass(u);
    const st = getEquippedNameColorStyle(u);

    // Remove old ap-nc classes
    el.className = el.className.split(' ').filter(c => !c.startsWith('ap-nc-')).join(' ');
    if (cls) el.classList.add(...cls.split(' '));
    if (st) el.setAttribute('style', st);
}
window.applyEquippedNameColor = applyEquippedNameColor;

function getEquippedBadge(u) {
    if (u && u.equippedBadge) return u.equippedBadge;
    if (u && u.equippedTitle) return u.equippedTitle;
    const local = localStorage.getItem('ap_equipped_badge') || localStorage.getItem('ap_equipped_title');
    if (local) return local;
    if (u) {
        if (u.role === 'admin') return 'ADMIN TOP 1';
        if (u.isVip || u.vip) return 'VIP PRO';
        if (u.level) return 'LV.' + u.level;
    }
    return 'LV.15';
}
window.getEquippedBadge = getEquippedBadge;

function renderUserBadgeHtml(badgeText, badgeClass) {
    if (!badgeText) return '';
    let iconSvg = '';
    let bgStyle = '';

    const textLower = badgeText.toLowerCase();

    // 1. Crown / VIP / Admin Badge
    if (textLower.includes('admin') || textLower.includes('vip')) {
        if (textLower.includes('admin')) {
            iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0; transform: translateY(-0.5px);"><path d="M2 19h20v2H2v-2zm1-3l2.5-9 4.5 4 4-7 4 7 4.5-4L21 16H3z" fill="#ffffff"/><circle cx="12" cy="5" r="1.5" fill="#fde047"/></svg>`;
            bgStyle = 'background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: #ffffff; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 0 10px rgba(239,68,68,0.45); font-weight: 900;';
        } else if (textLower.includes('vvip')) {
            iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0; transform: translateY(-0.5px);"><path d="M12 2L2 9l10 13L22 9L12 2zm0 3.2L18.4 9H5.6L12 5.2z" fill="#60a5fa"/></svg>`;
            bgStyle = 'background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); color: #93c5fd; border: 1px solid rgba(96,165,250,0.5); box-shadow: 0 0 10px rgba(37,99,235,0.45); font-weight: 900;';
        } else {
            iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0; transform: translateY(-0.5px);"><path d="M2 19h20v2H2v-2zm1-3l2.5-9 4.5 4 4-7 4 7 4.5-4L21 16H3z" fill="#1a1000"/></svg>`;
            bgStyle = 'background: linear-gradient(135deg, #fcd576 0%, #d97706 100%); color: #1a1000; border: 1px solid rgba(252,213,118,0.7); box-shadow: 0 0 10px rgba(252,213,118,0.4); font-weight: 900;';
        }
    }
    // 2. Mọt Phim / Pink / Sakura Badge
    else if (textLower.includes('mọt phim') || textLower.includes('pink') || textLower.includes('sakura')) {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0; transform: translateY(-0.5px);"><path d="M12 2a4 4 0 0 1 4 4c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 4-4zm-7 7a4 4 0 0 1 4 4c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 4-4zm14 0a4 4 0 0 1 4 4c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 4-4z" fill="#f472b6"/></svg>`;
        bgStyle = 'background: linear-gradient(135deg, rgba(244,114,182,0.22), rgba(219,39,119,0.22)); color: #f472b6; border: 1px solid rgba(244,114,182,0.45); box-shadow: 0 0 8px rgba(244,114,182,0.3); font-weight: 800;';
    }
    // 3. Cinephile / Cyber / Lightning Badge
    else if (textLower.includes('cinephile') || textLower.includes('cyber') || textLower.includes('lôi')) {
        iconSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="flex-shrink:0; transform: translateY(-0.5px);"><path d="M11 21l1-7H7l7-12-1 7h5l-7 12z" fill="#38bdf8"/></svg>`;
        bgStyle = 'background: linear-gradient(135deg, rgba(56,189,248,0.22), rgba(2,132,199,0.22)); color: #38bdf8; border: 1px solid rgba(56,189,248,0.45); box-shadow: 0 0 8px rgba(56,189,248,0.3); font-weight: 800;';
    }
    // 4. Level Badge (LV.XX)
    else if (textLower.startsWith('lv.')) {
        iconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
        bgStyle = 'background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.18); font-weight: 700;';
    }
    // 5. Default custom badge fallback
    else {
        iconSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;"><path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1-6.3-4.6-6.3 4.6 2.3-7.1-6-4.5h7.6z" fill="#fcd576"/></svg>`;
        bgStyle = 'background: rgba(252,213,118,0.15); color: #fcd576; border: 1px solid rgba(252,213,118,0.35); font-weight: 800;';
    }

    const cleanText = badgeText.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    return `<span class="ap-user-badge-tag ${badgeClass || ''}" style="font-size: 10px; padding: 2px 7px; border-radius: 5px; display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.3px; line-height: 1.2; ${bgStyle}">${iconSvg}<span>${cleanText || badgeText}</span></span>`;
}
window.renderUserBadgeHtml = renderUserBadgeHtml;

function renderCosmicStarSvg(size = 18) {
    const s = size || 18;
    return `<span class="ap-vip-modern-badge" title="Thành viên nổi bật" style="display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; vertical-align:middle; margin-left:3px; line-height:1; position:relative; z-index:2;">
        <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" style="display:block; filter:drop-shadow(0 2px 6px rgba(129,140,248,0.7)); overflow:visible;">
            <defs>
                <linearGradient id="facetNW_g" x1="12" y1="1.5" x2="10" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#a5b4fc"/></linearGradient>
                <linearGradient id="facetNE_g" x1="12" y1="1.5" x2="14" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#e0e7ff"/><stop offset="100%" stop-color="#818cf8"/></linearGradient>
                <linearGradient id="facetEN_g" x1="22.5" y1="12" x2="12" y2="9.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#a855f7"/></linearGradient>
                <linearGradient id="facetES_g" x1="22.5" y1="12" x2="12" y2="14.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#f472b6"/><stop offset="100%" stop-color="#c026d3"/></linearGradient>
                <linearGradient id="facetSE_g" x1="12" y1="22.5" x2="14" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#9333ea"/></linearGradient>
                <linearGradient id="facetSW_g" x1="12" y1="22.5" x2="10" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#4f46e5"/></linearGradient>
                <linearGradient id="facetWS_g" x1="1.5" y1="12" x2="12" y2="14.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#2563eb"/></linearGradient>
                <linearGradient id="facetWN_g" x1="1.5" y1="12" x2="12" y2="9.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient>
            </defs>
            <polygon points="12,1.5 9.5,9.5 12,12" fill="url(#facetNW_g)"/>
            <polygon points="12,1.5 14.5,9.5 12,12" fill="url(#facetNE_g)"/>
            <polygon points="22.5,12 14.5,9.5 12,12" fill="url(#facetEN_g)"/>
            <polygon points="22.5,12 14.5,14.5 12,12" fill="url(#facetES_g)"/>
            <polygon points="12,22.5 14.5,14.5 12,12" fill="url(#facetSE_g)"/>
            <polygon points="12,22.5 9.5,14.5 12,12" fill="url(#facetSW_g)"/>
            <polygon points="1.5,12 9.5,14.5 12,12" fill="url(#facetWS_g)"/>
            <polygon points="1.5,12 9.5,9.5 12,12" fill="url(#facetWN_g)"/>
            <polygon points="12,8.5 13.8,12 12,15.5 10.2,12" fill="#ffffff" opacity="0.9"/>
            <circle cx="20" cy="4" r="1.3" fill="#e0e7ff" opacity="0.95"/>
            <circle cx="4" cy="20" r="1.1" fill="#c084fc" opacity="0.9"/>
        </svg>
    </span>`;
}
window.renderCosmicStarSvg = renderCosmicStarSvg;

function getEquippedColor(u) {
    if (typeof getEquippedColorId === 'function') return getEquippedColorId(u);
    return (u && (u.equippedColor || u.colorId)) || 'color_default';
}
window.getEquippedColor = getEquippedColor;

function applyEquippedNameColor(el, user) {
    if (!el || !el.style) return;
    const id = getEquippedColor(user);
    const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('light-mode');

    // Clean old classes
    if (el.classList) {
        const toRemove = [];
        el.classList.forEach(c => {
            if (c.startsWith('ap-nc-') || c === 'has-custom-name-color') toRemove.push(c);
        });
        toRemove.forEach(c => el.classList.remove(c));
        el.classList.add(`ap-nc-${id}`);
        if (id !== 'color_default' && id !== 'none') {
            el.classList.add('has-custom-name-color');
        }
    }

    if (id === 'color_default' || id === 'none' || !id) {
        el.style.background = 'none';
        el.style.backgroundImage = 'none';
        el.style.webkitBackgroundClip = 'initial';
        el.style.webkitTextFillColor = isLight ? '#1c1917' : '#ffffff';
        el.style.color = isLight ? '#1c1917' : '#ffffff';
        el.style.animation = 'none';
        el.style.filter = 'none';
        el.style.textShadow = 'none';
        el.style.fontWeight = '700';
        return;
    }

    const item = NAME_COLORS_MAP[id];
    if (item && item.textStyle) {
        const styleToApply = (isLight && LIGHT_MODE_GRADIENTS[id]) ? LIGHT_MODE_GRADIENTS[id] : item.textStyle;
        el.style.cssText += ';' + styleToApply;
        el.style.fontFamily = "'Montserrat', 'Oswald', 'Be Vietnam Pro', system-ui, sans-serif";
        el.style.fontWeight = '900';
        el.style.letterSpacing = '0.04em';
        el.style.textTransform = 'none';
    }
}
window.applyEquippedNameColor = applyEquippedNameColor;

var BANNERS_MAP = window.BANNERS_MAP || {
    'banner_default': { id: 'banner_default', name: 'Mặc định', bgStyle: 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;' },
    'banner_gold': { id: 'banner_gold', name: 'Hoàng Gia Gold', bgStyle: 'background: linear-gradient(135deg, #78350f 0%, #b45309 35%, #f59e0b 70%, #fef08a 100%) !important;' },
    'banner_forest': { id: 'banner_forest', name: 'Rừng Đêm Dạ Quang', bgStyle: 'background: linear-gradient(135deg, #064e3b 0%, #047857 35%, #10b981 70%, #6ee7b7 100%) !important;' },
    'banner_cyber': { id: 'banner_cyber', name: 'Cyberpunk Neon 2026', bgStyle: 'background: linear-gradient(135deg, #3b0764 0%, #6b21a8 35%, #a855f7 70%, #38bdf8 100%) !important;' },
    'banner_sakura': { id: 'banner_sakura', name: 'Hoa Anh Đào Sakura', bgStyle: 'background: linear-gradient(135deg, #831843 0%, #be185d 35%, #ec4899 70%, #fbcfe8 100%) !important;' },
    'banner_sunset': { id: 'banner_sunset', name: 'Sóng Biển Hoàng Hôn', bgStyle: 'background: linear-gradient(135deg, #1e1b4b 0%, #431407 30%, #ea580c 70%, #fcd34d 100%) !important;' },
    'banner_space': { id: 'banner_space', name: 'Vũ Trụ Starry Night', bgStyle: 'background: linear-gradient(135deg, #020617 0%, #1e1b4b 35%, #4338ca 70%, #818cf8 100%) !important;' },
    'banner_meteor': { id: 'banner_meteor', name: 'Thiên Thạch Rực Rỡ', bgStyle: 'background: linear-gradient(135deg, #450a0a 0%, #991b1b 35%, #ea580c 70%, #fde047 100%) !important;' },
    'banner_cinema': { id: 'banner_cinema', name: 'Bom Tấn Rạp Phim', bgStyle: 'background: linear-gradient(135deg, #450a0a 0%, #b91c1c 30%, #f59e0b 70%, #fef08a 100%) !important; background-size: 200% 200% !important; animation: shopRainbowShift 4s ease infinite !important;' }
};
window.BANNERS_MAP = BANNERS_MAP;

function getEquippedBannerId(u) {
    return (u && u.equippedBanner) || localStorage.getItem('ap_equipped_banner') || 'banner_default';
}
window.getEquippedBannerId = getEquippedBannerId;

function applyEquippedBanner(coverEl, u) {
    const targets = coverEl ? [coverEl] : Array.from(document.querySelectorAll('#sidebarCoverEl, .sidebar-cover, #rightCoverEl, .avatar-panel-cover'));
    if (!targets || targets.length === 0) return;
    const bannerId = getEquippedBannerId(u);
    const banner = BANNERS_MAP[bannerId] || BANNERS_MAP['banner_default'];
    const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('light-mode');

    let activeBgStyle = (banner && banner.bgStyle) || '';
    if (bannerId === 'banner_default' || bannerId === 'none') {
        activeBgStyle = isLight
            ? 'background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%) !important; border-bottom: 1px solid rgba(0,0,0,0.06);'
            : 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;';
    }

    targets.forEach(el => {
        if (!el) return;
        Array.from(el.classList).forEach(c => {
            if (c.startsWith('ap-banner-')) el.classList.remove(c);
        });
        el.classList.add(`ap-banner-${bannerId}`);
        if (bannerId !== 'banner_default' && bannerId !== 'none') {
            el.classList.add('has-custom-banner');
        } else {
            el.classList.remove('has-custom-banner');
        }

        const isSidebar = el.id === 'sidebarCoverEl' || el.classList.contains('sidebar-cover');
        const isRight = el.classList.contains('avatar-panel-cover') || el.id === 'rightCoverEl';
        if (activeBgStyle) {
            if (isSidebar) {
                el.setAttribute('style', `${activeBgStyle} position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; min-height: 100%; border-radius: inherit; z-index: 1; overflow: hidden; transition: all 0.3s ease;`);
            } else {
                const height = isRight ? '105px' : '120px';
                el.setAttribute('style', `${activeBgStyle} height: ${height}; min-height: ${height}; position: relative; overflow: hidden; flex-shrink: 0; transition: all 0.3s ease;`);
            }
        }
    });

    if (typeof window.applyProfileBannerAura === 'function') {
        window.applyProfileBannerAura(bannerId);
    }
}
window.applyEquippedBanner = applyEquippedBanner;

function updateUserUI() {
    if (typeof authService === 'undefined') {
        setTimeout(updateUserUI, 150);
        return;
    }

    let user = (typeof authService !== 'undefined' && authService.getCurrentUser) ? authService.getCurrentUser() : null;
    if (!user) {
        try {
            user = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
        } catch (e) { }
    }

    // Apply equipped banner if sidebar cover is on this page
    applyEquippedBanner(null, user);

    // Synchronize left sidebar if on profile page
    try {
        if (typeof window.initSidebar === 'function') {
            window.initSidebar();
        }
    } catch (e) { }

    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    if (!document.querySelector('script[src*="dotlottie-player.mjs"]')) {
        const s = document.createElement('script');
        s.src = "https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs";
        s.type = "module";
        document.head.appendChild(s);
    }

    if (user) {
        const userId = user._id || user.id || user.email;
        const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
        const savedAvatar = (user.avatar || user.avatar_url) || localStorage.getItem(avatarKey) || localStorage.getItem('user_avatar') || '';
        const displayName = user.displayName || user.name || user.fullName || 'Người dùng';
        const initial = displayName.charAt(0).toUpperCase();

        const frameInfo = getEquippedFrameInfo(user);
        const nameColorClass = getEquippedNameColorClass(user);
        const nameColorStyle = getEquippedNameColorStyle(user);

        // 1. Render Avatar Circle (with frame overlay or CSS frame if equipped)
        const innerAvatar = savedAvatar
            ? `<img src="${savedAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;" onerror="this.outerHTML='<span style=\\'color:#1a1100; font-weight:800; font-size:16px;\\'>${initial}</span>'"/>`
            : `<span style="color:#1a1100; font-weight:800; font-size:16px;">${initial}</span>`;

        const avatarHtml = renderAvatarWithFrame(innerAvatar, 38, frameInfo);

        // 2. Render Notification Bell & Premium Dropdown Panel
        const notificationBell = `
            <div class="relative flex items-center" id="navNotificationBtn" style="cursor:pointer; z-index: 60; margin-right: 0px; flex-shrink:0;">
                <button type="button" class="nav-bell-trigger relative" aria-label="Thông báo" title="Thông báo">
                    <svg class="nav-bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"></path>
                    </svg>
                    <span id="navNotifBadge" class="nav-bell-badge hidden"></span>
                </button>
                
                <!-- Notification Panel -->
                <div id="navNotifPanel" class="nav-notif-dropdown invisible opacity-0 translate-y-3 scale-95 transition-all duration-200">
                    <div id="notifArrow" class="nav-notif-arrow"></div>

                    <!-- Header -->
                    <div class="nav-notif-header">
                        <div class="nav-notif-header-title">
                            <div class="nav-notif-title-row">
                                <span class="nav-notif-title-text">Thông Báo</span>
                                <span id="notifCountBadge" class="nav-notif-count-pill hidden">0 Mới</span>
                            </div>
                            <span class="nav-notif-sub-text">Cập nhật tin tức & ưu đãi VIP</span>
                        </div>
                        <button type="button" onclick="event.stopPropagation(); markAllNotifsRead()" class="nav-notif-mark-read-btn" title="Đánh dấu tất cả là đã đọc">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>Đã đọc</span>
                        </button>
                    </div>

                    <!-- List Container -->
                    <div id="notifListContainer" class="nav-notif-list custom-scrollbar"></div>

                    <!-- Footer -->
                    <div class="nav-notif-footer">
                        <a href="/profile?tab=notifications" class="nav-notif-view-all-btn">
                            <span>Xem tất cả thông báo</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;

        // 3. Render Profile Link & Dropdown Menu (Matching Image 1 & Image 2)
        const profileLink = `
            <div id="userNavProfile" class="flex items-center" style="position: relative; z-index: 50; gap: 8px;">
                ${notificationBell}
                <div class="relative group nav-profile-dropdown" style="padding: 0; overflow: visible !important;">
                    <!-- User Bar Trigger: Avatar + Name + Downward Chevron -->
                    <div class="ap-user-bar-trigger flex items-center gap-2.5 px-2 py-1 rounded-full cursor-pointer transition-all duration-200"
                         style="user-select: none;"
                         title="${displayName.replace(/"/g, '&quot;')}"
                         onclick="this.parentElement.classList.toggle('is-open')">
                        ${avatarHtml}
                        <span class="ap-user-name-text ${nameColorClass}" title="${displayName.replace(/"/g, '&quot;')}" style="font-size: 14.5px !important; font-weight: 900 !important; font-family: 'Montserrat', 'Oswald', 'Be Vietnam Pro', system-ui, sans-serif !important; letter-spacing: 0.03em !important; text-transform: none !important; white-space: nowrap !important; max-width: 130px !important; overflow: hidden !important; text-overflow: ellipsis !important; vertical-align: middle !important; ${nameColorStyle}">
                            ${displayName}
                        </span>
                        <svg class="ap-user-chevron-icon" style="width:14px; height:14px; flex-shrink:0; transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s ease; display:block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    </div>
                    
                    <!-- Dropdown Menu Box -->
                    <div class="ap-user-dropdown-menu" style="position:absolute; right:0; top:calc(100% + 12px); opacity:0; visibility:hidden; transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s; z-index:999999; transform: scale(0.95) translateY(-6px); transform-origin: top right; width:280px; background:#1e2235; border:1px solid rgba(255,255,255,0.12); border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04); padding:20px 16px 16px 16px; backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px);">
                        
                        <!-- Top Header: Username + Modern 3D Cyber Star Badge -->
                        <div style="display:flex; align-items:center; gap:8px; padding:0 4px; margin-bottom:16px;">
                            <span class="ap-dropdown-user-name ${nameColorClass}" style="color:#ffffff; font-size:16.5px; font-weight:900; font-family:'Montserrat', 'Oswald', 'Be Vietnam Pro', system-ui, sans-serif !important; letter-spacing:0.03em !important; text-transform:none !important; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; display:inline-block; ${nameColorStyle}" title="${displayName.replace(/"/g, '&quot;')}">${displayName}</span>
                            <span class="ap-vip-modern-badge" title="Thành viên VIP" style="display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer; transition:transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;" onmouseover="this.style.transform='scale(1.25) rotate(15deg)';" onmouseout="this.style.transform='scale(1) rotate(0deg)';">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="display:block; filter:drop-shadow(0 2px 8px rgba(129,140,248,0.7));">
                                    <defs>
                                        <linearGradient id="facetNW" x1="12" y1="1.5" x2="10" y2="12" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#ffffff"/>
                                            <stop offset="100%" stop-color="#a5b4fc"/>
                                        </linearGradient>
                                        <linearGradient id="facetNE" x1="12" y1="1.5" x2="14" y2="12" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#e0e7ff"/>
                                            <stop offset="100%" stop-color="#818cf8"/>
                                        </linearGradient>
                                        <linearGradient id="facetEN" x1="22.5" y1="12" x2="12" y2="9.5" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#c084fc"/>
                                            <stop offset="100%" stop-color="#a855f7"/>
                                        </linearGradient>
                                        <linearGradient id="facetES" x1="22.5" y1="12" x2="12" y2="14.5" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#f472b6"/>
                                            <stop offset="100%" stop-color="#c026d3"/>
                                        </linearGradient>
                                        <linearGradient id="facetSE" x1="12" y1="22.5" x2="14" y2="12" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#ec4899"/>
                                            <stop offset="100%" stop-color="#9333ea"/>
                                        </linearGradient>
                                        <linearGradient id="facetSW" x1="12" y1="22.5" x2="10" y2="12" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#7c3aed"/>
                                            <stop offset="100%" stop-color="#4f46e5"/>
                                        </linearGradient>
                                        <linearGradient id="facetWS" x1="1.5" y1="12" x2="12" y2="14.5" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#38bdf8"/>
                                            <stop offset="100%" stop-color="#2563eb"/>
                                        </linearGradient>
                                        <linearGradient id="facetWN" x1="1.5" y1="12" x2="12" y2="9.5" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stop-color="#67e8f9"/>
                                            <stop offset="100%" stop-color="#6366f1"/>
                                        </linearGradient>
                                    </defs>
                                    <polygon points="12,1.5 9.5,9.5 12,12" fill="url(#facetNW)"/>
                                    <polygon points="12,1.5 14.5,9.5 12,12" fill="url(#facetNE)"/>
                                    <polygon points="22.5,12 14.5,9.5 12,12" fill="url(#facetEN)"/>
                                    <polygon points="22.5,12 14.5,14.5 12,12" fill="url(#facetES)"/>
                                    <polygon points="12,22.5 14.5,14.5 12,12" fill="url(#facetSE)"/>
                                    <polygon points="12,22.5 9.5,14.5 12,12" fill="url(#facetSW)"/>
                                    <polygon points="1.5,12 9.5,14.5 12,12" fill="url(#facetWS)"/>
                                    <polygon points="1.5,12 9.5,9.5 12,12" fill="url(#facetWN)"/>
                                    <!-- Central Core Highlight -->
                                    <polygon points="12,8.5 13.8,12 12,15.5 10.2,12" fill="#ffffff" opacity="0.9"/>
                                    <!-- Satellite Sparkles -->
                                    <circle cx="20" cy="4" r="1.3" fill="#e0e7ff" opacity="0.95"/>
                                    <circle cx="4" cy="20" r="1.1" fill="#c084fc" opacity="0.9"/>
                                </svg>
                            </span>
                        </div>

                        <!-- Menu Items (Synchronized 100% with Profile Tabs) -->
                        <div style="display:flex; flex-direction:column; gap:3px;">
                            <!-- 1. Thông tin cá nhân -->
                            <a href="/profile?tab=account" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('account'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('account'); else if(typeof switchTab==='function') switchTab('account'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(99,102,241,0.18); border:1px solid rgba(99,102,241,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#818cf8;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Thông tin cá nhân</span>
                            </a>

                            <!-- 2. Cửa hàng -->
                            <a href="/profile?tab=shop" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('shop'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('shop'); else if(typeof switchTab==='function') switchTab('shop'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(251,191,36,0.18); border:1px solid rgba(251,191,36,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#fbbf24;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Cửa hàng</span>
                            </a>

                            <!-- 3. Yêu thích -->
                            <a href="/profile?tab=favorites" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('favorites'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('favorites'); else if(typeof switchTab==='function') switchTab('favorites'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(244,63,94,0.18); border:1px solid rgba(244,63,94,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#fb7185;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Yêu thích</span>
                            </a>

                            <!-- 4. Lịch sử xem -->
                            <a href="/profile?tab=history" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('history'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('history'); else if(typeof switchTab==='function') switchTab('history'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(34,197,94,0.18); border:1px solid rgba(34,197,94,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#4ade80;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Lịch sử xem</span>
                            </a>

                            <!-- 5. Danh sách phát -->
                            <a href="/profile?tab=watchlist" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('watchlist'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('watchlist'); else if(typeof switchTab==='function') switchTab('watchlist'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(56,189,248,0.18); border:1px solid rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#38bdf8;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h7"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Danh sách phát</span>
                            </a>

                            <!-- 6. Lịch chiếu rạp -->
                            <a href="/profile?tab=cinema" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('cinema'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('cinema'); else if(typeof switchTab==='function') switchTab('cinema'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(168,85,247,0.18); border:1px solid rgba(168,85,247,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#c084fc;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m2 7 4.41-4.41A2 2 0 017.83 2h8.34a2 2 0 011.42.59L22 7M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M15 22v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4M2 7h20"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Lịch chiếu rạp</span>
                            </a>

                            <!-- 7. Thành tựu -->
                            <a href="/profile?tab=achievements" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('achievements'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('achievements'); else if(typeof switchTab==='function') switchTab('achievements'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#f59e0b;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Thành tựu</span>
                            </a>

                            <!-- 8. Cài đặt tiện ích -->
                            <a href="/profile?tab=settings" 
                               onclick="if(window.location.pathname.startsWith('/profile')){ event.preventDefault(); if(typeof window.switchTab==='function') window.switchTab('settings'); else if(typeof window.switchProfileTab==='function') window.switchProfileTab('settings'); else if(typeof switchTab==='function') switchTab('settings'); document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el=>el.classList.remove('is-open')); document.querySelectorAll('.ap-user-dropdown-menu').forEach(menu=>{menu.style.opacity='0';menu.style.visibility='hidden';}); }"
                               style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-decoration:none; transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.11)'; this.style.borderColor='rgba(255,255,255,0.14)'; this.style.transform='translateX(2px)';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(100,116,139,0.22); border:1px solid rgba(100,116,139,0.35); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#94a3b8;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                </span>
                                <span style="color:#e2e8f0; font-size:13.5px; font-weight:500;">Cài đặt tiện ích</span>
                            </a>
                        </div>

                        <!-- Thoát -->
                        <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.07);">
                            <button onclick="if(window.doLogout){window.doLogout();}else if(window.authService){window.authService.logout();}else{localStorage.clear();window.location.href='/';}"
                                    style="width:100%; display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.18); cursor:pointer; transition:all 0.2s ease;"
                                    onmouseover="this.style.background='rgba(239,68,68,0.18)'; this.style.borderColor='rgba(239,68,68,0.35)'; this.style.transform='translateX(2px)';"
                                    onmouseout="this.style.background='rgba(239,68,68,0.08)'; this.style.borderColor='rgba(239,68,68,0.18)'; this.style.transform='translateX(0)';">
                                <span style="width:30px; height:30px; border-radius:9px; background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.35); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <svg style="width:14px; height:14px; color:#ef4444;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                </span>
                                <span style="color:#ef4444; font-size:13.5px; font-weight:600;">Thoát</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 4. In-place DOM update across all userNavProfile instances if user is already rendered to avoid destroying hover/open states and eliminate flicker
        const existingNavs = document.querySelectorAll('#userNavProfile');
        if (existingNavs.length > 0 && Array.from(existingNavs).every(nav => nav.dataset.userId === userId)) {
            existingNavs.forEach(nav => {
                const triggerEl = nav.querySelector('.ap-user-bar-trigger');
                if (triggerEl) {
                    triggerEl.title = displayName;
                    triggerEl.innerHTML = `
                        ${avatarHtml}
                        <span class="ap-user-name-text ${nameColorClass}" title="${displayName.replace(/"/g, '&quot;')}" style="font-size: 14.5px !important; font-weight: 900 !important; font-family: 'Montserrat', 'Oswald', 'Be Vietnam Pro', system-ui, sans-serif !important; letter-spacing: 0.03em !important; text-transform: none !important; white-space: nowrap !important; max-width: 130px !important; overflow: hidden !important; text-overflow: ellipsis !important; vertical-align: middle !important; ${nameColorStyle}">
                            ${displayName}
                        </span>
                        <svg class="ap-user-chevron-icon" style="width:14px; height:14px; flex-shrink:0; transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s ease; display:block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    `;
                }
                const dropNameEl = nav.querySelector('.ap-dropdown-user-name');
                if (dropNameEl) {
                    dropNameEl.textContent = displayName;
                    dropNameEl.className = `ap-dropdown-user-name ${nameColorClass}`;
                    if (nameColorStyle) dropNameEl.style.cssText = `color:#ffffff; font-size:16.5px; font-weight:900; font-family:'Montserrat', 'Oswald', 'Be Vietnam Pro', system-ui, sans-serif !important; letter-spacing:0.03em !important; text-transform:none !important; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; display:inline-block; ${nameColorStyle}`;
                }
            });
            if (typeof window.rebuildBottomNav === 'function') {
                try { window.rebuildBottomNav(); } catch (e) { }
            }
            if (typeof window.updateMobileMenuUser === 'function') {
                try { window.updateMobileMenuUser(); } catch (e) { }
            }
            return;
        }

        // 5. Clean up any duplicated profile dropdowns in header outside container (NEVER remove bottom-nav)
        document.querySelectorAll('header .nav-profile-dropdown, #sofa-header .nav-profile-dropdown').forEach(el => {
            if (!el.closest('#authContainer') && !el.closest('#bottom-nav-dock') && el.id !== 'bn-tab-account') {
                el.remove();
            }
        });

        // 6. Update all container elements
        const containers = document.querySelectorAll('#authContainer');
        containers.forEach(container => {
            container.style.setProperty('overflow', 'visible', 'important');
            container.innerHTML = '';
            container.insertAdjacentHTML('afterbegin', profileLink);
            const renderedNav = container.querySelector('#userNavProfile');
            if (renderedNav) renderedNav.dataset.userId = userId;
        });

        // Inject global hover bridge style if not present
        if (!document.getElementById('ap-user-dropdown-bridge-style')) {
            const style = document.createElement('style');
            style.id = 'ap-user-dropdown-bridge-style';
            style.textContent = `
                .nav-profile-dropdown { position: relative; }
                .nav-profile-dropdown:hover .ap-user-dropdown-menu,
                .nav-profile-dropdown.is-open .ap-user-dropdown-menu {
                    opacity: 1 !important;
                    visibility: visible !important;
                    transform: scale(1) translateY(0) !important;
                    pointer-events: auto !important;
                }
                .ap-user-dropdown-menu {
                    pointer-events: none;
                }
                .ap-user-dropdown-menu::before {
                    content: '';
                    position: absolute;
                    top: -18px;
                    left: 0;
                    width: 100%;
                    height: 20px;
                    background: transparent;
                }
            `;
            document.head.appendChild(style);
        }

        // Sync bottom navigation dock so account tab is always present and active
        if (typeof window.rebuildBottomNav === 'function') {
            try { window.rebuildBottomNav(); } catch (e) { }
        }

        // 7. Sync notification bell click listener
        const notifBtn = document.getElementById('navNotificationBtn');
        if (notifBtn) {
            notifBtn.onclick = function (e) {
                e.stopPropagation();
                const panel = document.getElementById('navNotifPanel');
                if (panel) {
                    const isVisible = panel.classList.contains('opacity-100');
                    if (isVisible) {
                        panel.classList.add('invisible', 'opacity-0', 'scale-95', 'translate-y-4');
                        panel.classList.remove('opacity-100', 'visible', 'scale-100', 'translate-y-0');
                    } else {
                        panel.classList.remove('invisible', 'opacity-0', 'scale-95', 'translate-y-4');
                        panel.classList.add('opacity-100', 'visible', 'scale-100', 'translate-y-0');
                    }
                }
            };
        }

        // Close dropdown / notif when clicking outside
        if (!document._apUserClickGuard) {
            document._apUserClickGuard = true;
            document.addEventListener('click', function (e) {
                if (!e.target.closest('#navNotificationBtn')) {
                    const panel = document.getElementById('navNotifPanel');
                    if (panel && panel.classList.contains('opacity-100')) {
                        panel.classList.add('invisible', 'opacity-0', 'scale-95', 'translate-y-4');
                        panel.classList.remove('opacity-100', 'visible', 'scale-100', 'translate-y-0');
                    }
                }
                if (!e.target.closest('.nav-profile-dropdown')) {
                    document.querySelectorAll('.nav-profile-dropdown.is-open').forEach(el => el.classList.remove('is-open'));
                }
            });
        }

        // 7. Sync notifications from backend
        if (typeof syncNotifications === 'function') {
            syncNotifications();
        }
    } else {
        // CHƯA ĐĂNG NHẬP: Render Notification Bell + Login Button
        const loginBtnHtml = `
            <div class="flex items-center" style="gap: 10px;">
                <div class="relative flex items-center" style="cursor:pointer; z-index: 60;" onclick="if(window.showAuthModal){event.preventDefault();event.stopImmediatePropagation();window.showAuthModal('login');}else{alert('Vui lòng đăng nhập để xem thông báo!');}">
                    <div class="sofa-icon-circle-btn relative" style="width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(8px);">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                        </svg>
                    </div>
                </div>
                <a href="/profile"
                   onclick="if(window.showAuthModal){event.preventDefault();event.stopImmediatePropagation();window.showAuthModal('login');return false;}"
                   class="sofa-login-rect-btn">Đăng nhập</a>
            </div>
        `;
        const containers = document.querySelectorAll('#authContainer');
        containers.forEach(container => {
            container.style.setProperty('overflow', 'visible', 'important');
            container.innerHTML = loginBtnHtml;
        });
    }
}

// Khởi chạy & Lắng nghe đồng bộ đa nguồn Realtime
document.addEventListener('DOMContentLoaded', updateUserUI);
setTimeout(updateUserUI, 300);

window.addEventListener('ap:user-updated', function (e) {
    updateUserUI();
});
window.addEventListener('auth:profileUpdated', function (e) {
    updateUserUI();
});
window.addEventListener('auth:profileSynced', function (e) {
    updateUserUI();
});
window.addEventListener('storage', function (e) {
    if (e.key === 'cinestream_user' || e.key === 'user_avatar' || (e.key && e.key.startsWith('avatar_'))) {
        updateUserUI();
    }
});

// Export để các script khác gọi sau khi login/logout
window.updateUserUI = updateUserUI;

// ── PREMIUM NOTIFICATION SYSTEM (GLOBAL) ──────────────────────────
var TOAST_ICONS = window.TOAST_ICONS || {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    coin: `<svg viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9"/></svg>`
};

(function injectToastCSS() {
    if (document.getElementById('ap-global-toast-css')) return;
    const s = document.createElement('style');
    s.id = 'ap-global-toast-css';
    s.textContent = `
        #ap-toast-stack {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            width: 330px;
            max-width: 85vw;
        }
        .ap-toast {
            pointer-events: all;
            position: relative;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 18px;
            border-radius: 16px;
            background: rgba(13, 13, 17, 0.75);
            backdrop-filter: blur(20px) saturate(200%);
            -webkit-backdrop-filter: blur(20px) saturate(200%);
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.5), 
                        inset 0 1px 1px rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            transform: translateX(140%);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
        }
        .ap-toast::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 3px; height: 100%;
            background: var(--accent-color, #fcd576);
            border-radius: 0 3px 3px 0;
        }
        .ap-toast.show { transform: translateX(0); opacity: 1; }
        
        .ap-toast-icon-wrap {
            width: 36px; height: 36px; flex-shrink: 0;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.04);
            color: var(--accent-color);
        }
        .ap-toast-icon-wrap svg { width: 20px; height: 20px; }
        
        .ap-toast-content { flex: 1; display: flex; flex-direction: column; gap: 2px; justify-content: center; min-width: 0; }
        .ap-toast-title { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; letter-spacing: 0.8px; }
        .ap-toast-body { 
            font-size: 13.5px; 
            color: rgba(255,255,255,0.95); 
            font-weight: 600; 
            line-height: 1.35; 
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden; 
        }

        .ap-toast-success { --accent-color: #10b981; }
        .ap-toast-success .ap-toast-icon-wrap { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.1); }
        
        .ap-toast-error { --accent-color: #ef4444; }
        .ap-toast-error .ap-toast-icon-wrap { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.1); }
        
        .ap-toast-warning { --accent-color: #f59e0b; }
        .ap-toast-warning .ap-toast-icon-wrap { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.1); }
        
        .ap-toast-info { --accent-color: #3b82f6; }
        .ap-toast-info .ap-toast-icon-wrap { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.1); }
        
        .ap-toast-coin-change {
            --accent-color: #f59e0b;
            background: linear-gradient(135deg, rgba(15, 15, 22, 0.8), rgba(25, 20, 15, 0.8));
            border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .coin-diff { 
            font-family: 'Space Grotesk', sans-serif; 
            font-weight: 800; 
            font-size: 17px; 
            margin-left: auto;
            display: flex;
            align-items: baseline;
            gap: 2px;
            flex-shrink: 0;
        }
        .coin-diff.plus { color: #10b981; text-shadow: 0 0 12px rgba(16, 185, 129, 0.3); }
        .coin-diff.minus { color: #ef4444; text-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
        
        @keyframes toast-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        .ap-toast-shake { animation: toast-shake 0.3s cubic-bezier(.36,.07,.19,.97) 2; }

        /* Notification Bell & Panel */
        .notif-bell-shake { animation: bell-shake 0.5s ease-in-out infinite; }
        @keyframes bell-shake {
            0%, 100% { transform: rotate(0); }
            20%, 60% { transform: rotate(15deg); }
            40%, 80% { transform: rotate(-15deg); }
        }
        
        .notif-item {
            padding: 18px 24px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            background: transparent;
        }
        .notif-item:hover { 
            background: linear-gradient(90deg, rgba(232,185,79,0.04), transparent);
            transform: translateX(4px);
        }
        .notif-item.unread { 
            background: rgba(232,185,79,0.02);
        }
        .notif-item.unread::after {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 3px;
            background: #e8b94f;
            box-shadow: 0 0 10px rgba(232,185,79,0.4);
        }
        .notif-item.unread::before {
            content: '';
            position: absolute;
            right: 20px; top: 22px;
            width: 6px; height: 6px;
            background: #e8b94f;
            border-radius: 50%;
            box-shadow: 0 0 8px #e8b94f;
        }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        /* Confirm Modal Style */
        .ap-confirm-overlay {
            position: fixed; inset: 0; z-index: 100001;
            background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        .ap-confirm-box {
            background: #16161e; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px; width: 100%; max-width: 400px; padding: 32px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            transform: scale(0.9); animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { to { transform: scale(1); } }

        /* ── User Header Dropdown & Trigger Styling (Matching Image 1 & Image 2) ── */
        #authContainer {
            display: inline-flex !important;
            align-items: center !important;
            flex-shrink: 0 !important;
            min-width: max-content !important;
        }
        #userNavProfile {
            display: inline-flex !important;
            align-items: center !important;
            flex-shrink: 0 !important;
            min-width: max-content !important;
        }
        .ap-user-bar-trigger {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 4px 10px 4px 6px !important;
            border-radius: 9999px !important;
            background: transparent !important;
            flex-shrink: 0 !important;
            white-space: nowrap !important;
            transition: all 0.2s ease !important;
        }
        .ap-user-bar-trigger:hover,
        .nav-profile-dropdown.is-open .ap-user-bar-trigger {
            background: rgba(255, 255, 255, 0.08) !important;
        }
        .ap-user-name-text {
            color: #ffffff !important;
            font-size: 14.5px !important;
            font-weight: 500 !important;
            font-family: inherit !important;
            white-space: nowrap !important;
            max-width: 130px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            display: inline-block !important;
            vertical-align: middle !important;
            flex-shrink: 1 !important;
            cursor: pointer !important;
        }
        @media (max-width: 1280px) {
            .ap-user-name-text {
                max-width: 100px !important;
            }
        }
        @media (max-width: 1024px) {
            .ap-user-name-text {
                max-width: 80px !important;
            }
        }
        /* ── MOBILE: Ẩn tên user nhưng GIỮ NGUYÊN avatar + icon mũi tên (chevron) trên header ── */
        @media (max-width: 768px) {
            #userNavProfile {
                gap: 8px !important;
            }
            .ap-user-bar-trigger .ap-user-name-text,
            span.ap-user-name-text {
                display: none !important;
            }
            .ap-user-bar-trigger .ap-user-chevron-icon,
            .ap-user-chevron-icon {
                display: block !important;
                width: 14px !important;
                height: 14px !important;
                margin-left: 1px !important;
                margin-right: 2px !important;
                color: rgba(255, 255, 255, 0.75) !important;
                flex-shrink: 0 !important;
            }
            .ap-user-bar-trigger {
                display: inline-flex !important;
                align-items: center !important;
                padding: 2px 6px 2px 2px !important;
                gap: 4px !important;
                background: rgba(255, 255, 255, 0.06) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 9999px !important;
            }
        }
        .ap-user-chevron-icon {
            color: #94a3b8 !important;
            fill: none !important;
            stroke: currentColor !important;
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s ease !important;
        }
        .ap-user-bar-trigger:hover .ap-user-chevron-icon,
        .nav-profile-dropdown.is-open .ap-user-chevron-icon,
        .nav-profile-dropdown:hover .ap-user-chevron-icon {
            transform: rotate(180deg) !important;
            color: #fcd576 !important;
        }

        .nav-profile-dropdown.is-open .ap-user-dropdown-menu {
            opacity: 1 !important;
            visibility: visible !important;
            transform: scale(1) translateY(0) !important;
        }

        .ap-menu-item-pill {
            background: rgba(255, 255, 255, 0.07) !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            border-radius: 18px !important;
            color: rgba(255, 255, 255, 0.88) !important;
            transition: all 0.2s ease !important;
        }

        .ap-menu-item-pill:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
            color: #ffffff !important;
            transform: translateX(3px) !important;
        }

        .ap-menu-logout-btn:hover {
            opacity: 0.9 !important;
            transform: translateX(3px) !important;
        }

        @media (max-width: 1024px) {
            .ap-user-dropdown-menu {
                position: fixed !important;
                top: 70px !important;
                right: 12px !important;
                width: calc(100vw - 24px) !important;
                max-width: 320px !important;
            }
            #navNotifPanel {
                position: fixed !important;
                top: 75px !important;
                left: 16px !important;
                right: 16px !important;
                width: auto !important;
                max-width: none !important;
                transform: translateY(16px) !important;
                z-index: 1000000 !important;
            }
            #navNotifPanel.visible {
                transform: translateY(0) !important;
            }
            #notifArrow {
                display: none !important;
            }
        }

        /* ── MOBILE: Ẩn chữ "Đăng Nhập", chỉ hiện icon → tiết kiệm diện tích ── */
        @media (max-width: 768px) {
            .auth-btn-text {
                display: none !important;
            }
            .nav-auth-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                width: 40px !important;
                height: 40px !important;
                min-width: unset !important;
                gap: 0 !important;
                position: relative !important;
                background: transparent !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 50% !important;
                backdrop-filter: blur(8px) !important;
                box-shadow: none !important;
                box-sizing: border-box !important;
            }
            .nav-auth-btn .material-icons-round,
            .nav-auth-btn dotlottie-player {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) scale(1.85) !important;
                margin: 0 !important;
            }
            .nav-auth-btn .material-icons-round {
                font-size: 1.25rem !important;
                line-height: 1 !important;
                color: #eab308 !important;
            }
        }
    `;
    document.head.appendChild(s);
})();

function getToastStack() {
    let stack = document.getElementById('ap-toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'ap-toast-stack';
        document.body.appendChild(stack);
    }
    return stack;
}

window.showMessage = function (message, type = 'info', duration = 4000) {
    const stack = getToastStack();
    const toast = document.createElement('div');
    toast.className = `ap-toast ap-toast-${type}`;

    const titleLabels = { success: 'Thành Công', error: 'Lỗi Hệ Thống', warning: 'Cảnh Báo', info: 'Thông Báo' };

    toast.innerHTML = `
        <div class="ap-toast-icon-wrap">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
        <div class="ap-toast-content">
            <div class="ap-toast-title">${titleLabels[type] || 'Thông Báo'}</div>
            <div class="ap-toast-body">${message}</div>
        </div>
    `;
    stack.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    const hide = () => {
        toast.classList.remove('show');
        toast.style.transform = 'translateX(150%) scale(0.9)';
        setTimeout(() => toast.remove(), 600);
    };
    setTimeout(hide, duration);
    toast.onclick = hide;
};

window.showCoinChange = function (amount, reason = 'Giao dịch thành công') {
    const stack = getToastStack();
    const isPlus = amount > 0;
    const diffText = isPlus ? `+${amount.toLocaleString('vi-VN')}` : `${amount.toLocaleString('vi-VN')}`;

    const toast = document.createElement('div');
    toast.className = `ap-toast ap-toast-coin-change ${!isPlus ? 'ap-toast-shake' : ''}`;
    toast.innerHTML = `
        <div class="ap-toast-icon-wrap">${TOAST_ICONS.coin}</div>
        <div class="ap-toast-content">
            <div class="ap-toast-title">Biến Động Số Dư</div>
            <div class="ap-toast-body" style="color: rgba(255,255,255,0.7); font-size:13px;">${reason}</div>
        </div>
        <div class="coin-diff ${isPlus ? 'plus' : 'minus'}">
            ${diffText} 
            <span style="font-size: 11px; opacity: 0.7; font-weight:700; letter-spacing:0.5px;">XU</span>
        </div>
    `;

    stack.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    const hide = () => {
        toast.classList.remove('show');
        toast.style.transform = 'translateX(150%) scale(0.9)';
        setTimeout(() => toast.remove(), 600);
    };
    setTimeout(hide, 6000); // slightly longer to read amounts
    toast.onclick = hide;
};

window.showConfirm = function (title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'ap-confirm-overlay';
        overlay.innerHTML = `
            <div class="ap-confirm-box">
                <h3 style="font-size:20px; font-weight:800; color:#fff; margin-bottom:12px;">${title}</h3>
                <p style="font-size:15px; color:rgba(255,255,255,0.6); line-height:1.6; margin-bottom:24px;">${message}</p>
                <div style="display:flex; gap:12px;">
                    <button id="confirm-cancel" style="flex:1; padding:12px; background:rgba(255,255,255,0.05); border:none; border-radius:12px; color:#fff; font-weight:700; cursor:pointer;">Hủy</button>
                    <button id="confirm-ok" style="flex:1; padding:12px; background:#eab308; border:none; border-radius:12px; color:#000; font-weight:800; cursor:pointer;">Xác nhận</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
        overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
    });
};

// ── NOTIFICATION SERVICE ──────────────────────────────────────────
window.syncNotifications = async function () {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) {
        console.log('⏭️ Skip syncNotifications - not logged in');
        return;
    }

    const token = localStorage.getItem('cinestream_token');
    if (!token) {
        console.log('⏭️ Skip syncNotifications - no token');
        return;
    }

    const userId = user._id || user.id;

    try {
        const backendUrl = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : null;
        if (!backendUrl) return;
        const response = await fetch(`${backendUrl}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Handle non-ok status (401, 404, 500, etc.)
        if (!response.ok) {
            if (response.status === 401) {
                console.warn('⚠️ Notifications 401 - token expired');
            }
            return;
        }

        const data = await response.json();
        if (data.success) {
            localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(data.data));
            renderNotifications();
            updateNotifBadge();

            // 🚀 DELIVER PENDING UNREAD TOASTS (User returned to site)
            // Filter unread, sort oldest-to-newest to queue properly
            const unread = (data.data || []).filter(n => !n.isRead && !n.read).reverse();
            let toastCount = 0;

            unread.forEach((n) => {
                const notifId = n._id || n.id;
                if (!notifId) return;

                const toastKey = `ap_toast_seen_${notifId}`;
                // Check local delivery guard to prevent duplicate spamming on every F5 refresh
                if (!localStorage.getItem(toastKey) && toastCount < 2) {
                    toastCount++;

                    setTimeout(() => {
                        if (n.type === 'coin' || n.type === 'success') {
                            let msg = n.message || '';
                            let reason = 'Giao dịch thành công';

                            // Attempt intelligent string extraction from backend format: 
                            // "[+1.000 Xu] Bạn vừa nhận... \nNội dung: Admin nap"
                            if (msg.includes('\nNội dung:')) {
                                const parts = msg.split('\nNội dung:');
                                // Reason is the second part, keep it clean
                                reason = parts[1].trim() || 'Biến động tài khoản';
                            } else if (n.title) {
                                reason = n.title;
                            }

                            // Highly resilient REGEX search for numeric currency pattern (+/- then digit)
                            const numMatch = msg.match(/([+-]?[\d\.,]+)\s*Xu/i);
                            if (numMatch && typeof showCoinChange === 'function') {
                                // Clean numeric separators (. or ,) to parse int
                                const valStr = numMatch[1].replace(/\./g, '').replace(/,/g, '');
                                const val = parseInt(valStr, 10);
                                if (!isNaN(val)) {
                                    showCoinChange(val, reason);
                                } else {
                                    showMessage(n.message, n.type);
                                }
                            } else {
                                showMessage(n.message, n.type);
                            }
                        } else {
                            // Standard push for info / other types
                            showMessage(n.message, n.type === 'promotion' ? 'success' : 'info');
                        }
                        // Lock the delivery so it never repeats
                        localStorage.setItem(toastKey, 'true');
                    }, 1500 + (toastCount * 2000)); // Delayed stagger to prevent collision lag
                }
            });
        }
    } catch (e) {
        console.warn('Silent fail: could not sync notifications', e);
    }
};

function formatRelativeNotifTime(dateVal) {
    if (!dateVal) return 'Vừa xong';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    if (diffSec < 172800) return 'Hôm qua';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

window.getNotifications = function () {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    const userId = user ? (user._id || user.id) : null;
    let notifs = [];
    try {
        if (userId) notifs = JSON.parse(localStorage.getItem(`ap_notifs_${userId}`) || '[]');
        if (!notifs || !notifs.length) {
            notifs = JSON.parse(localStorage.getItem('cinestream_notifications') || '[]');
        }
    } catch (e) { }

    // Purge any leftover mock test notifications
    if (Array.isArray(notifs)) {
        const cleanNotifs = notifs.filter(n => {
            if (!n) return false;
            const id = String(n.id || n._id || '');
            if (id.startsWith('notif_') || id === '1' || id === '2' || id === '3') return false;
            const text = `${n.title || ''} ${n.message || ''} ${n.content || ''}`;
            if (text.includes('50.000') || text.includes('50,000')) return false;
            if (text.includes('Chào mừng bạn gia nhập APhim Super VIP')) return false;
            if (text.includes('Bom tấn rạp 2026')) return false;
            if (text.includes('Đặc quyền Thành viên VIP đã kích hoạt')) return false;
            if (text.includes('Bảo vệ tài khoản & Trung tâm dữ liệu')) return false;
            return true;
        });
        if (cleanNotifs.length !== notifs.length) {
            try {
                localStorage.setItem('cinestream_notifications', JSON.stringify(cleanNotifs));
                if (userId) localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(cleanNotifs));
            } catch (e) { }
            return cleanNotifs;
        }
        return notifs;
    }
    return [];
};

window.addNotification = function (title, message, type = 'admin') {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    const userId = user ? (user._id || user.id) : null;
    const notifs = getNotifications();

    const newNotif = {
        id: Date.now().toString(),
        title,
        message,
        type,
        createdAt: new Date().toISOString(),
        read: false
    };

    notifs.unshift(newNotif);
    try {
        localStorage.setItem('cinestream_notifications', JSON.stringify(notifs.slice(0, 50)));
        if (userId) localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs.slice(0, 50)));
    } catch (e) { }

    renderNotifications();
    updateNotifBadge();

    // Shake bell for attention
    const bell = document.querySelector('#navNotificationBtn .nav-bell-icon') || document.querySelector('#navNotificationBtn svg');
    if (bell) {
        bell.classList.add('notif-bell-shake');
        setTimeout(() => bell.classList.remove('notif-bell-shake'), 3000);
    }
};

window.handleNavNotifClick = function (id) {
    if (typeof markNotifRead === 'function') {
        markNotifRead(id);
    }
    const panel = document.getElementById('navNotifPanel');
    if (panel) {
        panel.classList.add('invisible', 'opacity-0', 'scale-95', 'translate-y-3');
        panel.classList.remove('opacity-100', 'visible', 'scale-100', 'translate-y-0');
    }
    if (typeof switchTab === 'function') {
        switchTab('notifications');
    } else {
        window.location.href = '/profile?tab=notifications';
    }
};

window.renderNotifications = function () {
    const container = document.getElementById('notifListContainer');
    if (!container) return;

    const notifs = getNotifications();
    if (!notifs || notifs.length === 0) {
        container.innerHTML = `
            <div class="nav-notif-empty">
                <div class="nav-notif-empty-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                        <line x1="2" y1="2" x2="22" y2="22"/>
                    </svg>
                </div>
                <div class="nav-notif-empty-title">Hộp thư thông báo trống</div>
                <div class="nav-notif-empty-desc">Bạn đã xem hết các thông báo mới</div>
            </div>
        `;
        return;
    }

    container.innerHTML = notifs.slice(0, 8).map(n => {
        const isUnread = !n.isRead && !n.read;
        const notifId = n._id || n.id || '';

        let iconSvg = '';
        let iconClass = 'system';
        let badgeText = 'Hệ thống';

        if (n.type === 'coin' || n.type === 'reward' || n.type === 'success') {
            iconClass = 'coin';
            badgeText = 'Xu & Quà';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 7v10"/></svg>`;
        } else if (n.type === 'vip' || n.type === 'promotion') {
            iconClass = 'vip';
            badgeText = 'Ưu đãi VIP';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`;
        } else if (n.type === 'movie') {
            iconClass = 'movie';
            badgeText = 'Phim mới';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;
        } else {
            iconClass = 'system';
            badgeText = 'Hệ thống';
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
        }

        const msgText = n.message || n.content || '';
        const timeText = formatRelativeNotifTime(n.createdAt || n.date);

        return `
            <div class="nav-notif-item ${isUnread ? 'unread' : 'read'} type-${iconClass}" onclick="event.stopPropagation(); window.handleNavNotifClick('${notifId}')">
                <div class="nav-notif-icon-box ${iconClass}">
                    ${iconSvg}
                    ${isUnread ? '<div class="nav-notif-pulse-dot"></div>' : ''}
                </div>
                <div class="nav-notif-content">
                    <div class="nav-notif-item-header">
                        <span class="nav-notif-type-tag ${iconClass}">${badgeText}</span>
                        <span class="nav-notif-item-time">${timeText}</span>
                    </div>
                    <div class="nav-notif-item-title">${n.title || 'Thông báo'}</div>
                    <div class="nav-notif-item-msg">${msgText}</div>
                </div>
            </div>
        `;
    }).join('');
};

function updateNotifBadge() {
    const badge = document.getElementById('navNotifBadge');
    const panelBadge = document.getElementById('notifCountBadge');
    const notifs = getNotifications();
    const unreadCount = notifs.filter(n => !n.isRead && !n.read).length;

    if (badge) {
        if (unreadCount > 0) {
            badge.classList.remove('hidden');
            badge.style.display = 'block';
        } else {
            badge.classList.add('hidden');
            badge.style.display = 'none';
        }
    }
    if (panelBadge) {
        if (unreadCount > 0) {
            panelBadge.textContent = `${unreadCount} Mới`;
            panelBadge.classList.remove('hidden');
            panelBadge.style.display = 'inline-flex';
        } else {
            panelBadge.classList.add('hidden');
            panelBadge.style.display = 'none';
        }
    }
    const sidebarBadge = document.getElementById('sidebarNotifBadge');
    if (sidebarBadge) {
        if (unreadCount > 0) {
            sidebarBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            sidebarBadge.style.display = 'inline-flex';
            sidebarBadge.style.alignItems = 'center';
            sidebarBadge.style.justifyContent = 'center';
        } else {
            sidebarBadge.style.display = 'none';
        }
    }
}

window.markAllNotifsRead = function () {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    const userId = user ? (user._id || user.id) : null;
    const notifs = getNotifications();
    notifs.forEach(n => { n.read = true; n.isRead = true; });
    try {
        localStorage.setItem('cinestream_notifications', JSON.stringify(notifs));
        if (userId) localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs));
    } catch (e) { }
    renderNotifications();
    updateNotifBadge();
    if (typeof updateProfileNotifBadge === 'function') {
        updateProfileNotifBadge();
    }
    if (typeof showToast === 'function') {
        showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    }
};

window.markNotifRead = function (id) {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    const userId = user ? (user._id || user.id) : null;
    const notifs = getNotifications();
    const idx = notifs.findIndex(n => (n.id == id || n._id == id));
    if (idx !== -1) {
        notifs[idx].read = true;
        notifs[idx].isRead = true;
        try {
            localStorage.setItem('cinestream_notifications', JSON.stringify(notifs));
            if (userId) localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs));
        } catch (e) { }
        renderNotifications();
        updateNotifBadge();
        if (typeof updateProfileNotifBadge === 'function') {
            updateProfileNotifBadge();
        }
    }
};

window.toggleNotif = async function (id, element) {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) return;

    // 1. Mark as read in storage & Backend
    const userId = user._id || user.id;
    const notifs = getNotifications();
    const idx = notifs.findIndex(n => (n._id === id || n.id === id));

    if (idx !== -1 && !notifs[idx].isRead && !notifs[idx].read) {
        notifs[idx].isRead = true;
        notifs[idx].read = true;
        localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs));
        updateNotifBadge();

        // Async sync to backend
        const token = localStorage.getItem('cinestream_token');
        const backendUrl = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : null;
        if (token && backendUrl && id.length > 15) { // Only sync if it looks like a MongoID
            fetch(`${backendUrl}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => { });
        }
    }

    // 2. Update UI manually without re-rendering everything
    element.classList.remove('unread');
    const unreadDot = element.querySelector('.notif-unread-dot');
    if (unreadDot) unreadDot.remove();

    // 3. Toggle expand
    const msg = element.querySelector('.notif-msg');
    const expandBtn = element.querySelector('.notif-expand-btn');
    if (msg) {
        const isClamped = msg.classList.contains('line-clamp-2');
        if (isClamped) {
            msg.classList.remove('line-clamp-2');
            msg.style.color = 'rgba(255,255,255,0.9)';
            element.style.backgroundColor = 'rgba(255,255,255,0.03)';
            if (expandBtn) expandBtn.textContent = 'Thu gọn';
        } else {
            msg.classList.add('line-clamp-2');
            msg.style.color = 'rgba(255,255,255,0.4)';
            element.style.backgroundColor = 'transparent';
            if (expandBtn) expandBtn.textContent = 'Xem chi tiết';
        }
    }
};

window.markAllNotifsRead = async function () {
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) return;
    const userId = user._id || user.id;
    const notifs = getNotifications();
    notifs.forEach(n => {
        n.isRead = true;
        n.read = true;
    });
    localStorage.setItem(`ap_notifs_${userId}`, JSON.stringify(notifs));
    renderNotifications();
    updateNotifBadge();

    // Sync to backend
    const token = localStorage.getItem('cinestream_token');
    const backendUrl = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : null;
    if (token && backendUrl) {
        fetch(`${backendUrl}/notifications/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => { });
    }
};

function formatRelativeNotifTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
}

// Toggle panel logic
document.addEventListener('click', (e) => {
    const btn = document.getElementById('navNotificationBtn');
    const panel = document.getElementById('navNotifPanel');
    if (!btn || !panel) return;

    if (btn.contains(e.target)) {
        const isVisible = !panel.classList.contains('invisible');
        if (isVisible) {
            panel.classList.add('invisible', 'opacity-0', 'translate-y-4', 'scale-95');
            panel.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
        } else {
            panel.classList.remove('invisible', 'opacity-0', 'translate-y-4', 'scale-95');
            panel.classList.add('opacity-100', 'translate-y-0', 'scale-100');
            renderNotifications();
        }
    } else if (!panel.contains(e.target)) {
        panel.classList.add('invisible', 'opacity-0', 'translate-y-4', 'scale-95');
        panel.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
    }
});

// Initial badge update
setTimeout(updateNotifBadge, 1500);


