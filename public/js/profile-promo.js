/**
 * PROFILE INTRODUCTION PROMO
 * Shows a small, non-intrusive notification to inform users about the new Profile feature.
 */

class ProfilePromo {
    constructor() {
        this.storageKey = 'ap_profile_promo_closed';
        this.lastShownKey = 'ap_profile_promo_last_shown';
        this.promoId = 'profilePromoNotification';
        
        // Show after 4 seconds of page load to allow splash to finish
        setTimeout(() => this.checkAndShow(), 4000);
    }

    checkAndShow() {
        console.log('[ProfilePromo] Checking display conditions...');
        
        // Don't show if user is not logged in
        if (typeof authService === 'undefined') {
            console.log('[ProfilePromo] authService not found. Skipping.');
            return;
        }
        
        if (!authService.isLoggedIn()) {
            console.log('[ProfilePromo] User is NOT logged in. Notification hidden.');
            return;
        }
        
        // Don't show if user already closed it permanently
        if (localStorage.getItem(this.storageKey) === 'true') {
            console.log('[ProfilePromo] User has previously disabled this notification permanentlly.');
            return;
        }
        
        // Frequency check: only show once every 24 hours
        const lastShown = localStorage.getItem(this.lastShownKey);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; 
        
        if (lastShown && (now - parseInt(lastShown)) < oneDay) {
            const minutesLeft = ((oneDay - (now - parseInt(lastShown))) / 60000).toFixed(1);
            console.log(`[ProfilePromo] Frequency restriction active. Showing again in ${minutesLeft} minutes.`);
            console.log(`[Tip] To bypass this for testing, run in console: localStorage.removeItem('${this.lastShownKey}')`);
            return;
        }

        console.log('[ProfilePromo] Conditions met! Injecting visual component now...');
        this.injectStyles();
        this.render();
        localStorage.setItem(this.lastShownKey, now.toString());
    }

    injectStyles() {
        if (document.getElementById('profilePromoStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'profilePromoStyles';
        style.textContent = `
            .ap-promo-container {
                position: fixed;
                bottom: 100px;
                right: 24px;
                z-index: 9999;
                width: 290px;
                max-width: calc(100vw - 48px);
                pointer-events: none;
            }
            
            .ap-promo-card-wrapper {
                position: relative;
                pointer-events: auto;
                animation: apPromoFadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4));
            }

            /* Glow outer wrapper */
            .ap-promo-card-wrapper::before {
                content: '';
                position: absolute;
                inset: -1px;
                background: linear-gradient(135deg, var(--accent-gold, #e8b94f), #f59e0b);
                border-radius: 18px;
                z-index: -1;
                opacity: 0.4;
                blur: 8px;
                -webkit-filter: blur(8px);
                transition: opacity 0.3s ease;
            }
            
            .ap-promo-card-wrapper:hover::before {
                opacity: 0.8;
                -webkit-filter: blur(12px);
            }

            .ap-promo-card {
                background: rgba(31, 34, 43, 0.85); /* Matches --bg-glass-nav */
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 16px;
                padding: 16px;
                display: flex;
                gap: 14px;
                position: relative;
                overflow: hidden;
            }

            /* Shimmer reflection effect */
            .ap-promo-card::after {
                content: '';
                position: absolute;
                top: 0; left: -100%;
                width: 100%; height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                animation: apPromoShimmer 4s infinite linear;
            }

            .ap-promo-close {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.05);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                z-index: 10;
            }
            .ap-promo-close:hover {
                background: #f43f5e;
                transform: rotate(90deg);
            }
            .ap-promo-close span {
                font-size: 16px !important;
            }

            .ap-promo-icon-box {
                width: 44px;
                height: 44px;
                min-width: 44px;
                border-radius: 12px;
                background: rgba(232, 185, 79, 0.15);
                border: 1px solid rgba(232, 185, 79, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            .ap-promo-icon-box span {
                color: var(--accent-gold, #e8b94f);
                font-size: 24px !important;
            }

            .ap-promo-content {
                flex: 1;
                min-width: 0;
            }

            .ap-promo-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(232, 185, 79, 0.15);
                color: var(--accent-gold, #e8b94f);
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.5px;
                padding: 3px 8px;
                border-radius: 6px;
                margin-bottom: 6px;
                text-transform: uppercase;
            }

            .ap-promo-ping {
                width: 6px;
                height: 6px;
                background: var(--accent-gold, #e8b94f);
                border-radius: 50%;
                position: relative;
            }
            .ap-promo-ping::after {
                content: '';
                position: absolute;
                inset: 0;
                background: inherit;
                border-radius: inherit;
                animation: apPromoPingAni 1.5s infinite cubic-bezier(0, 0, 0.2, 1);
            }

            .ap-promo-title {
                color: #fff;
                font-weight: 700;
                font-size: 13px;
                margin: 0 0 4px 0;
                line-height: 1.4;
            }

            .ap-promo-text {
                color: rgba(255,255,255,0.7);
                font-size: 11px;
                margin: 0 0 12px 0;
                line-height: 1.5;
            }

            .ap-promo-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: var(--gradient-brand, linear-gradient(135deg, #e8b94f, #f59e0b));
                color: #050508;
                font-size: 11px;
                font-weight: 800;
                padding: 8px 14px;
                border-radius: 99px;
                text-decoration: none;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(232, 185, 79, 0.2);
            }
            
            .ap-promo-btn:hover {
                transform: translateX(4px);
                box-shadow: 0 6px 20px rgba(232, 185, 79, 0.4);
                color: #000;
            }

            .ap-promo-btn span {
                font-size: 16px !important;
                animation: apPromoBounceX 1s infinite;
            }

            @keyframes apPromoFadeInUp {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @keyframes apPromoFadeOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(20px) scale(0.95); }
            }

            @keyframes apPromoBounceX {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(4px); }
            }

            @keyframes apPromoPingAni {
                75%, 100% { transform: scale(3); opacity: 0; }
            }

            @keyframes apPromoShimmer {
                0% { left: -100%; }
                100% { left: 200%; }
            }

            /* Mobile adaptation */
            @media (max-width: 768px) {
                .ap-promo-container {
                    bottom: 85px; /* Avoid overlap with potential mobile tab bar */
                    right: 16px;
                    width: auto;
                    left: 16px; /* Full width minus safe zone on tiny screens */
                }
            }
        `;
        document.head.appendChild(style);
    }

    render() {
        if (document.getElementById(this.promoId)) return;

        const container = document.createElement('div');
        container.id = this.promoId;
        container.className = 'ap-promo-container';
        
        container.innerHTML = `
            <div class="ap-promo-card-wrapper">
                <div class="ap-promo-card">
                    <button type="button" class="ap-promo-close" onclick="window.profilePromo.close(true)" aria-label="Đóng">
                        <span class="material-icons-round">close</span>
                    </button>

                    <div class="ap-promo-icon-box">
                        <span class="material-icons-round">account_circle</span>
                    </div>

                    <div class="ap-promo-content">
                        <div class="ap-promo-badge">
                            <div class="ap-promo-ping"></div>
                            Mới
                        </div>
                        <h4 class="ap-promo-title">Cá nhân hóa trang cá nhân!</h4>
                        <p class="ap-promo-text">
                            Khoe khung Avatar, đổi banner cực ngầu và lưu lại hành trình điện ảnh của riêng bạn ngay hôm nay.
                        </p>
                        <a href="profile.html" class="ap-promo-btn">
                            TRUY CẬP NGAY
                            <span class="material-icons-round">arrow_forward</span>
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    close(permanently = false) {
        const el = document.getElementById(this.promoId);
        if (!el) return;

        const wrapper = el.querySelector('.ap-promo-card-wrapper');
        if (wrapper) {
            wrapper.style.animation = 'apPromoFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards';
        }

        setTimeout(() => {
            if (el && el.parentNode) {
                el.remove();
            }
        }, 400);
        
        if (permanently) {
            // Mark as permanently closed (user dismissed it)
            localStorage.setItem(this.storageKey, 'true');
        }
    }
}

// Initialize singleton
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.profilePromo = new ProfilePromo();
    });
} else {
    window.profilePromo = new ProfilePromo();
}

