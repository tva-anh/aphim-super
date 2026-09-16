/* ════════════════════════════════════════════════════════════
   PROFILE SHOP MODULE v5 — Premium E-commerce
   ════════════════════════════════════════════════════════════ */

const SHOP_DATA = {
    frames: [
        { id: 'none', name: 'Mặc định', rarity: 'common', price: 0, class: '' },
        { id: 'vien_don', name: 'Neon Hồng (Nữ)', rarity: 'common', price: 500, class: 'av-frame-simple' },
        { id: 'dut_doan', name: 'Loading Blue', rarity: 'common', price: 800, class: 'av-frame-dash' },
        { id: 'vien_kep', name: 'Double Glow', rarity: 'common', price: 1000, class: 'av-frame-double' },
        { id: 'hao_quang', name: 'Hào quang', rarity: 'rare', price: 1200, class: 'av-frame-glow' },
        { id: 'neon', name: 'Đèn Neon', rarity: 'rare', price: 1500, class: 'av-frame-neon' },
        { id: 'film', name: 'Film Cổ Điển', rarity: 'rare', price: 1800, class: 'av-frame-film' },
        { id: 'vhs', name: 'VHS Retro', rarity: 'rare', price: 2000, class: 'av-frame-vhs' },
        { id: 'gradient', name: 'Gradient Dreams', rarity: 'rare', price: 2200, class: 'av-frame-gradient' },
        { id: 'trai_tim', name: 'Trái Tim Tình Yêu', rarity: 'epic', price: 2500, class: 'av-frame-heart' },
        { id: 'tai_tho', name: 'Tai Thỏ Siêu Cấp', rarity: 'epic', price: 3000, class: 'av-frame-bunny' },
        { id: 'canh_than', name: 'Cánh Thiên Thần', rarity: 'epic', price: 4500, class: 'av-frame-angel-wings' },
        { id: 'sung_quy', name: 'Sừng Quỷ Satan', rarity: 'epic', price: 5000, class: 'av-frame-devil' },
        { id: 'ech_xanh', name: 'Ếch Xanh', rarity: 'epic', price: 1500, class: 'av-frame-frog' },
        { id: 'meo_hong', name: 'Mèo Hồng', rarity: 'epic', price: 2000, class: 'av-frame-cat_pink' },
        { id: 'cao_cam', name: 'Cáo Cam', rarity: 'epic', price: 2200, class: 'av-frame-fox_orange' },
        { id: 'meo_lam', name: 'Mèo Lam', rarity: 'epic', price: 2500, class: 'av-frame-cat_blue' },
        { id: 'rotate', name: 'Quay Tròn', rarity: 'epic', price: 1800, class: 'av-frame-rotate' },
        { id: 'sam_chop', name: 'Sấm Chớp', rarity: 'epic', price: 2200, class: 'av-frame-lightning' },
        { id: 'lap_lanh', name: 'Lấp Lánh', rarity: 'legendary', price: 2800, class: 'av-frame-sparkle' },
        { id: 'hologram', name: 'Hologram', rarity: 'legendary', price: 3500, class: 'av-frame-hologram-v2' },
        { id: 'hoang_gia', name: 'Hoàng Gia', rarity: 'legendary', price: 4000, class: 'av-frame-royal-v2' },
        { id: 'vang_oscar', name: 'Vàng Oscar', rarity: 'legendary', price: 5000, class: 'av-frame-oscar-v2' },
        { id: 'cau_vong', name: 'Cầu Vồng', rarity: 'legendary', price: 6500, class: 'av-frame-rainbow-v2' },
        { id: 'rong_bay', name: 'Rồng Bay', rarity: 'legendary', price: 9999, class: 'av-frame-dragon' },
        { id: 'meo_den', name: 'Mèo Đen Huyền Bí', rarity: 'legendary', price: 2800, class: 'av-frame-purple_glow' },
        { id: 'meo_canh', name: 'Mèo Cánh Hoa', rarity: 'legendary', price: 3500, class: 'av-frame-rose' },
        { id: 'phu_thuy', name: 'Phù Thủy', rarity: 'legendary', price: 4500, class: 'av-frame-witch-v2' },
        { id: 'thien_than', name: 'Thiên Thần', rarity: 'legendary', price: 6000, class: 'av-frame-angel-v2' },
        { id: 'fire', name: 'Ngọn Lửa Thiêng', rarity: 'mythic', price: 12000, class: 'av-frame-fire-mythic' },
        { id: 'ice', name: 'Băng Giá Vĩnh Cửu', rarity: 'mythic', price: 12000, class: 'av-frame-ice-v2' },
        { id: 'lightning2', name: 'Sấm Sét Thần Tộc', rarity: 'mythic', price: 20000, class: 'av-frame-lightning-mythic' },
        { id: 'gold_oscar', name: 'Vàng Oscar Danh Giá', rarity: 'mythic', price: 30000, class: 'av-frame-oscar-v2' },
        { id: 'sakura', name: 'Hoa Anh Đào', rarity: 'mythic', price: 12000, class: 'av-frame-sakura' },
        { id: 'matrix', name: 'Digital Matrix', rarity: 'mythic', price: 15000, class: 'av-frame-matrix' },
        { id: 'cyber', name: 'Cyberpunk 2077', rarity: 'mythic', price: 18000, class: 'av-frame-cyber' },
        { id: 'galaxy', name: 'Galaxy Nebula', rarity: 'mythic', price: 25000, class: 'av-frame-galaxy-v2' },
        { id: 'phoenix', name: 'Phoenix Fire', rarity: 'mythic', price: 30000, class: 'av-frame-phoenix' },
        { id: 'diamond', name: 'Diamond Shine', rarity: 'mythic', price: 35000, class: 'av-frame-diamond-v2' },
        { id: 'winter', name: 'Winter Snowfall', rarity: 'mythic', price: 15000, class: 'av-frame-snow' },
        { id: 'dragon_v2', name: 'Rồng Vàng Thần Thoại', rarity: 'mythic', price: 45000, class: 'av-frame-dragon-v2' },
        { id: 'king_crown', name: 'Vương Miện King', rarity: 'mythic', price: 50000, class: 'av-frame-king' },
        { id: 'storm_v2', name: 'Bão Tố Sấm Sét', rarity: 'mythic', price: 20000, class: 'av-frame-storm' }
    ],
    banners: [
        { id: 'b1', name: 'Mặc định', rarity: 'common', price: 0, url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },
        { id: 'b2', name: 'Thành Phố Đêm', rarity: 'common', price: 200, url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800' },
        { id: 'b3', name: 'Rạp Chiếu Phim', rarity: 'common', price: 500, url: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800' },
        { id: 'b4', name: 'Neon Cyberpunk', rarity: 'rare', price: 1200, url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800' },
        { id: 'b5', name: 'Abstract Art', rarity: 'rare', price: 1500, url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800' },
        { id: 'b6', name: 'Galaxy Stars', rarity: 'epic', price: 3000, url: 'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=800' },
        { id: 'b7', name: 'Deep Space', rarity: 'epic', price: 4500, url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=800' },
        { id: 'b8', name: 'Legendary Sun', rarity: 'legendary', price: 8000, url: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=800' },
        { id: 'b9', name: 'Dragon Realm', rarity: 'legendary', price: 15000, url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' }
    ]
};

let currentShopCategory = 'frame';
let currentShopRarity = 'all';

/* ── Helpers ── */
function _getUserAvatar(user) {
    if (!user) return _fallbackAvatar('U');
    const userId = user._id || user.id || user.email || '';
    const key = userId ? `avatar_${userId}` : 'user_avatar';
    const stored = localStorage.getItem(key);
    if (stored && (stored.startsWith('data:') || stored.startsWith('http'))) return stored;
    if (user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:'))) return user.avatar;
    const name = (user.name || user.username || 'U').charAt(0).toUpperCase();
    return _fallbackAvatar(name);
}
function _fallbackAvatar(letter) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(letter || 'U')}&background=ff6b35&color=fff&bold=true&size=80&rounded=true`;
}

function initShop() {
    const fCount = document.getElementById('frameCount');
    if (fCount) fCount.textContent = SHOP_DATA.frames.length;
    const bCount = document.getElementById('bannerCount');
    if (bCount) bCount.textContent = SHOP_DATA.banners.length;
    updateBalanceDisplay();
    renderShopItems();
}

function updateBalanceDisplay() {
    const user = authService.getCurrentUser();
    // Standardize Xu vs Coins across system - Use Max for safety during migration
    const xu = (user && Math.max(user.xu || 0, user.coins || 0)) || 0;
    const el = document.getElementById('shopBalance');
    if (el) el.textContent = Number(xu).toLocaleString('vi-VN');
    // Sync sidebar widget (visible on all tabs)
    const sidebarEl = document.getElementById('sidebarXuBalance');
    if (sidebarEl) sidebarEl.textContent = Number(xu).toLocaleString('vi-VN');
    // Sync Edit Profile widget
    const epBalanceEl = document.getElementById('epXuBalance');
    if (epBalanceEl) epBalanceEl.textContent = xu.toLocaleString('vi-VN') + ' Xu';
}

function setShopCategory(cat) {
    currentShopCategory = cat;
    document.getElementById('catFrameBtn').classList.toggle('active', cat === 'frame');
    document.getElementById('catBannerBtn').classList.toggle('active', cat === 'banner');
    renderShopItems();
}

function setShopRarity(rarity) {
    currentShopRarity = rarity;
    document.querySelectorAll('.rarity-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.rarity === rarity);
    });
    renderShopItems();
}

function renderShopItems() {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;

    let items = currentShopCategory === 'frame' ? SHOP_DATA.frames : SHOP_DATA.banners;
    if (currentShopRarity !== 'all') {
        items = items.filter(i => i.rarity === currentShopRarity);
    }

    const user = authService.getCurrentUser();
    // Hỗ trợ cả cấu trúc MongoDB Inventory mới lẫn Fallback cũ
    const ownedFrames = (user && user.inventory && user.inventory.frames) || (user && user.ownedFrames) || [];
    const ownedBanners = (user && user.inventory && user.inventory.banners) || (user && user.ownedBanners) || [];
    const equippedFrame = (user && user.equippedFrame) || 'none';
    const currentBanner = (user && user.profileCover) || '';

    const rarityMap = {
        common: 'Phổ thông', rare: 'Hiếm', epic: 'Sử thi',
        legendary: 'Huyền thoại', mythic: 'Thần thoại'
    };

    const avatarSrc = _getUserAvatar(user);

    grid.innerHTML = items.map((item, index) => {
        const isOwned = currentShopCategory === 'frame'
            ? (item.id === 'none' || ownedFrames.includes(item.id))
            : (item.price === 0 || ownedBanners.includes(item.id));
        const isEquipped = currentShopCategory === 'frame'
            ? equippedFrame === item.id
            : currentBanner === item.url;
        const label = rarityMap[item.rarity] || 'Phổ thông';
        const delay = index * 0.04;

        const visualHtml = currentShopCategory === 'frame' ? `
            <div class="shop-frame-wrap size-md ${item.class}">
                <img src="${avatarSrc}"
                     style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;position:relative;z-index:1;"
                     onerror="this.src='https://ui-avatars.com/api/?name=U&background=ff6b35&color=fff&bold=true&size=80';this.onerror=null;"
                     alt="avatar">
            </div>` : `
            <img src="${item.url}"
                 style="width:100%;height:100%;object-fit:cover;border-radius:8px;"
                 onerror="this.style.background='#1f1f2e'" alt="${item.name}">`;

        const actionHtml = isEquipped
            ? `<button class="status-btn using"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Đang dùng</button>`
            : isOwned
                ? `<button class="status-btn owned" onclick="equipShopItem('${currentShopCategory}','${item.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;color:#f59e0b;margin-right:4px;filter:drop-shadow(0 1px 3px rgba(245, 158, 11, 0.4));"><path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clip-rule="evenodd" /></svg>Trang bị</button>`
                : `<div class="price-tag${item.price === 0 ? ' free' : ''}" onclick="buyShopItem('${currentShopCategory}','${item.id}')"><span class="material-icons-round" style="font-size:14px;">monetization_on</span>${item.price === 0 ? 'Miễn phí' : item.price.toLocaleString('vi-VN') + ' Xu'}</div>`;

        return `
        <div class="shop-item-card${isOwned ? ' owned' : ''}" style="animation-delay:${delay}s">
            <div class="item-rarity-tag rarity-${item.rarity}">${label}</div>
            <div class="item-visual-wrap${currentShopCategory === 'banner' ? ' banner' : ''}">${visualHtml}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-action-area">${actionHtml}</div>
        </div>`;
    }).join('');
}

async function buyShopItem(type, id) {
    const list = type === 'frame' ? SHOP_DATA.frames : SHOP_DATA.banners;
    const item = list.find(i => i.id === id);
    if (!item) return;

    const user = authService.getCurrentUser();
    // Lấy số dư thật (Cả coins và xu)
    const xu = (user && Math.max(user.xu || 0, user.coins || 0)) || 0;

    if (xu < item.price) {
        if (typeof showMessage === 'function') showMessage('Bạn không đủ Xu!', 'error');
        return;
    }

    const confirmed = await showConfirm('Xác nhận mua', `Mua "${item.name}" với giá ${item.price.toLocaleString('vi-VN')} Xu?`);
    if (confirmed) {
        try {
            // Trừ xu vào biến cục bộ
            const newBalance = xu - item.price;

            // Khởi tạo inventory nếu chưa có
            if (!user.inventory) user.inventory = { frames: [], banners: [] };
            if (!user.inventory.frames) user.inventory.frames = [];
            if (!user.inventory.banners) user.inventory.banners = [];

            if (type === 'frame') {
                if (!user.inventory.frames.includes(id)) user.inventory.frames.push(id);
                if (!user.ownedFrames) user.ownedFrames = [];
                if (!user.ownedFrames.includes(id)) user.ownedFrames.push(id);
            } else {
                if (!user.inventory.banners.includes(id)) user.inventory.banners.push(id);
                if (!user.ownedBanners) user.ownedBanners = [];
                if (!user.ownedBanners.includes(id)) user.ownedBanners.push(id);
            }

            // Cập nhật trường dữ liệu local
            const updates = {
                coins: newBalance,
                xu: newBalance,
                inventory: user.inventory,
                ownedFrames: user.ownedFrames || [],
                ownedBanners: user.ownedBanners || [],
                transactionLog: {
                    title: `Mua ${type === 'frame' ? 'Khung Avatar' : 'Ảnh Bìa'}: ${item.name}`,
                    amount: -item.price,
                    type: 'spend',
                    date: new Date().toISOString()
                }
            };

            // AUTO-EQUIP LUN KHI MUA
            if (type === 'frame') {
                localStorage.setItem('ap_frame_id', item.id);
                localStorage.setItem('ap_frame_url', '');
                localStorage.setItem('ap_frame_class', item.class);
                updates.equippedFrame = item.id;
                updates.equippedFrameUrl = '';
                updates.equippedFrameClass = item.class;
            } else {
                localStorage.setItem('ap_profile_cover', item.url);
                updates.profileCover = item.url;
            }

            // Cố gắng đẩy lên Server TRƯỚC KHI khẳng định thành công
            if (authService.updateProfile) {
                const response = await authService.updateProfile(updates);
                if (!response || response.success === false) {
                    throw new Error(response ? response.message : 'Server từ chối lưu giao dịch!');
                }
            } else {
                // Nếu không có Backend, lưu tạm offline (vẫn cho phép chạy)
                user.coins = newBalance;
                user.xu = newBalance;
                localStorage.setItem('cinestream_user', JSON.stringify(user));
            }

            if (type === 'frame') {
                if (typeof applyFrameToHero === 'function') applyFrameToHero('', '', item.class);
            } else {
                const img = document.getElementById('profileCoverImg');
                if (img) img.src = item.url;
            }

            if (typeof showCoinChange === 'function') {
                showCoinChange(-item.price, `Mua ${type === 'frame' ? 'Khung' : 'Banner'}`);
            }
            if (typeof showMessage === 'function') showMessage('Đã Mua và Trang Bị thành công! 🎉', 'success');

            updateBalanceDisplay();
            renderShopItems();

            // Đồng bộ UI toàn trang
            if (typeof updateUserUI === 'function') updateUserUI();
            if (typeof loadBasicUserInfo === 'function') loadBasicUserInfo();
            if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
            if (typeof initSidebar === 'function') initSidebar();
        } catch (err) {
            console.error('❌ Shopping Error:', err);
            if (typeof showMessage === 'function') showMessage('Mua thất bại: ' + err.message, 'error');
        }
    }
}

async function equipShopItem(type, id) {
    const list = type === 'frame' ? SHOP_DATA.frames : SHOP_DATA.banners;
    const item = list.find(i => i.id === id);
    if (!item) return;
    let user = authService.getCurrentUser() || {};
    if (type === 'frame') {
        localStorage.setItem('ap_equipped_frame', item.id);
        localStorage.setItem('ap_frame_id', item.id);
        localStorage.setItem('ap_frame_url', '');
        localStorage.setItem('ap_frame_class', item.class);
        user.equippedFrame = item.id;
        user.equippedFrameUrl = '';
        user.equippedFrameClass = item.class;
        if (authService.updateProfile) {
            await authService.updateProfile({ equippedFrame: item.id, equippedFrameUrl: '', equippedFrameClass: item.class });
        }
        if (typeof applyFrameToHero === 'function') applyFrameToHero('', '', item.class);
    } else {
        localStorage.setItem('ap_profile_cover', item.url);
        user.profileCover = item.url;
        if (authService.updateProfile) await authService.updateProfile({ profileCover: item.url });
        const img = document.getElementById('profileCoverImg');
        if (img) img.src = item.url;
    }
    if (typeof showMessage === 'function') showMessage('Đã trang bị! ✅', 'success');

    // Đồng bộ UI toàn trang
    if (typeof updateUserUI === 'function') updateUserUI();
    if (typeof updateMobileMenuUser === 'function') updateMobileMenuUser();
    if (typeof loadBasicUserInfo === 'function') loadBasicUserInfo();
    if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
    if (typeof rebuildBottomNav === 'function') rebuildBottomNav();
    if (typeof initSidebar === 'function') initSidebar();

    try {
        window.dispatchEvent(new CustomEvent('ap:user-updated', { detail: user }));
        window.dispatchEvent(new CustomEvent('auth:profileUpdated', { detail: user }));
    } catch (e) { }

    renderShopItems();
}

function renderOwnedFramesForEdit() {
    const grid = document.getElementById('epFrameGrid');
    if (!grid) return;
    const user = authService.getCurrentUser();
    const ownedIds = (user && user.ownedFrames) || [];
    const avatarSrc = _getUserAvatar(user);
    const equippedId = (user && user.equippedFrame) || localStorage.getItem('ap_frame_id') || 'none';

    grid.innerHTML = SHOP_DATA.frames.map(item => {
        const isOwned = item.id === 'none' || ownedIds.includes(item.id);
        const isSelected = equippedId === item.id;

        return `
            <div class="ep-frame-option${isSelected ? ' selected' : ''}${!isOwned ? ' locked' : ''}"
                 data-frame-id="${item.id}" 
                 data-frame-class="${item.class}"
                 data-frame-name="${item.name}"
                 data-is-owned="${isOwned}"
                 onclick="epSelectFrame(this)"
                 style="position:relative;">
                
                ${!isOwned ? `
                    <div class="frame-price-tag" style="position:absolute;top:-4px;right:-4px;background:rgba(0,0,0,0.8);padding:2px 6px;border-radius:6px;font-size:9px;color:#ffd700;display:flex;align-items:center;gap:2px;z-index:10;border:1px solid rgba(255,215,0,0.3);">
                        ${item.price} <span class="material-icons-round" style="font-size:10px;">lock</span>
                    </div>
                ` : ''}

                <div class="shop-frame-wrap size-sm ${item.class}">
                    <img src="${avatarSrc}"
                         style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;position:relative;z-index:1;"
                         onerror="this.src='https://ui-avatars.com/api/?name=U&background=ff6b35&color=fff&bold=true';this.onerror=null;" alt="avatar">
                </div>
                <span style="font-size:9px;color:rgba(255,255,255,0.55);margin-top:5px;text-align:center;line-height:1.2;">${item.name}</span>
            </div>`;
    }).join('');
}

function renderOwnedBannersForEdit() {
    const grid = document.getElementById('epCoverGrid');
    if (!grid) return;
    const user = authService.getCurrentUser();
    const ownedIds = (user && user.ownedBanners) || [];
    const defaultBannerUrl = (SHOP_DATA.banners && SHOP_DATA.banners[0]) ? SHOP_DATA.banners[0].url : '';
    const equippedUrl = (user && user.profileCover) || localStorage.getItem('ap_profile_cover') || defaultBannerUrl;

    grid.innerHTML = SHOP_DATA.banners.map(item => {
        const isOwned = item.id === 'default' || item.id === 'none' || item.id === 'b1' || ownedIds.includes(item.id);
        const isSelected = equippedUrl === item.url;

        return `
            <div class="ep-cover-option${isSelected ? ' selected' : ''}${!isOwned ? ' locked' : ''}"
                 data-cover-id="${item.id}" 
                 data-cover-url="${item.url}"
                 data-cover-name="${item.name}"
                 data-is-owned="${isOwned}"
                 onclick="epSelectCover(this)"
                 style="position:relative; cursor:pointer; border-radius:12px; overflow:hidden; border:2px solid ${isSelected ? '#e8b94f' : 'transparent'}; transition:all 0.2s;">
                
                ${!isOwned ? `
                    <div class="frame-price-tag" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.8);padding:2px 6px;border-radius:6px;font-size:10px;color:#ffd700;display:flex;align-items:center;gap:2px;z-index:10;border:1px solid rgba(255,215,0,0.3);">
                        ${item.price} <span class="material-icons-round" style="font-size:11px;">lock</span>
                    </div>
                ` : ''}

                <div style="aspect-ratio:16/7; width:100%; overflow:hidden;">
                    <img src="${item.url}" style="width:100%; height:100%; object-fit:cover; opacity:${isOwned ? '1' : '0.5'};" alt="${item.name}">
                </div>
                <div style="padding:6px 8px; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); position:absolute; bottom:0; left:0; right:0;">
                    <span style="font-size:10px; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">${item.name}</span>
                </div>
            </div>`;
    }).join('');
}

// MODAL SELECTION LOGIC
function epSelectFrame(el) {
    const isOwned = el.getAttribute('data-is-owned') === 'true';
    if (!isOwned) {
        if (typeof showMessage === 'function') showMessage('Bạn chưa sở hữu khung này. Hãy mua tại cửa hàng!', 'error');
        else alert('Bạn chưa sở hữu khung này. Hãy mua tại cửa hàng!');
        return;
    }

    const id = el.getAttribute('data-frame-id');
    const cls = el.getAttribute('data-frame-class');
    const name = el.getAttribute('data-frame-name');

    // 1. Update Visual Grid Selection
    const grid = document.getElementById('epFrameGrid');
    grid.querySelectorAll('.ep-frame-option').forEach(item => item.classList.remove('selected'));
    el.classList.add('selected');

    // 2. Update Modal LIVE Preview Container
    const previewWrap = document.getElementById('epFramePreviewWrap');
    const previewText = document.getElementById('epSelectedFrameName');

    if (previewWrap) {
        // Clear old av-frame classes
        Array.from(previewWrap.classList).forEach(c => {
            if (c.startsWith('av-frame-')) previewWrap.classList.remove(c);
        });
        // Apply new class
        if (cls && cls !== 'none') previewWrap.classList.add(cls);
    }
    if (previewText) previewText.textContent = name || 'Mặc định';

    // 3. Store to temporary cache
    window._tempSelectedFrame = id;
    window._tempSelectedFrameClass = cls;
}

function epSelectCover(el) {
    const isOwned = el.getAttribute('data-is-owned') === 'true';
    if (!isOwned) {
        if (typeof showMessage === 'function') showMessage('Bạn chưa sở hữu ảnh bìa này.', 'error');
        else alert('Bạn chưa sở hữu ảnh bìa này.');
        return;
    }

    const id = el.getAttribute('data-cover-id');
    const url = el.getAttribute('data-cover-url');

    // 1. Update Grid Selection
    const grid = document.getElementById('epCoverGrid');
    grid.querySelectorAll('.ep-cover-option').forEach(item => {
        item.classList.remove('selected');
        item.style.borderColor = 'transparent';
    });
    el.classList.add('selected');
    el.style.borderColor = '#e8b94f';

    // 2. Update Cache
    window._tempSelectedCover = url;
}

// Global exposure
window.setShopCategory = setShopCategory;
window.setShopRarity = setShopRarity;
window.buyShopItem = buyShopItem;
window.equipShopItem = equipShopItem;
window.loadShop = initShop;
window.renderOwnedFramesForEdit = renderOwnedFramesForEdit;
window.renderOwnedBannersForEdit = renderOwnedBannersForEdit;
window.epSelectFrame = epSelectFrame;
window.epSelectCover = epSelectCover;
