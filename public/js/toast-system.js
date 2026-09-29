/**
 * 🌟 APhim Super - AAA-Grade Glassmorphism Toast Notification System
 * Inspired by Linear.app, Apple VisionOS, Vercel & Dynamic Island.
 */

(function() {
    function getToastContainer() {
        let container = document.getElementById('ap-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ap-toast-container';
            container.style.cssText = `
                position: fixed;
                top: 76px;
                right: 24px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
                max-width: 400px;
                width: calc(100vw - 36px);
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    if (!document.getElementById('ap-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'ap-toast-styles';
        style.textContent = `
            @keyframes apToastSpringIn {
                0% { opacity: 0; transform: translateY(-28px) scale(0.86); filter: blur(8px); }
                65% { opacity: 1; transform: translateY(4px) scale(1.02); filter: blur(0); }
                100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            }
            @keyframes apToastSpringOut {
                0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                100% { opacity: 0; transform: translateY(-18px) scale(0.92); filter: blur(6px); }
            }
            @keyframes apPulseDot {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.4); opacity: 0.6; }
            }
            @keyframes apCheckDraw {
                0% { stroke-dashoffset: 24; }
                100% { stroke-dashoffset: 0; }
            }
            @keyframes apGlowRing {
                0%, 100% { box-shadow: 0 0 12px rgba(34, 197, 94, 0.4); }
                50% { box-shadow: 0 0 24px rgba(34, 197, 94, 0.8); }
            }
            @keyframes apSparkleFloat {
                0% { transform: translate(0, 0) rotate(0deg) scale(0.8); opacity: 1; }
                100% { transform: translate(var(--dx), var(--dy)) rotate(180deg) scale(0); opacity: 0; }
            }

            .ap-toast-card {
                pointer-events: auto;
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 15px 18px;
                border-radius: 20px;
                background: linear-gradient(135deg, rgba(26, 31, 48, 0.92) 0%, rgba(12, 15, 24, 0.97) 100%);
                backdrop-filter: blur(22px) saturate(150%);
                -webkit-backdrop-filter: blur(22px) saturate(150%);
                border: 1px solid rgba(255, 255, 255, 0.14);
                box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
                color: #ffffff;
                font-family: 'Be Vietnam Pro', 'Inter', sans-serif;
                animation: apToastSpringIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                box-sizing: border-box;
            }

            /* (Coloured aura blob removed — it made the top-left corner look glaring) */

            /* Type accent = subtle border only (outer coloured glow removed: it caused the "halo glare") */
            .ap-toast-card.ap-toast-success { border-color: rgba(34, 197, 94, 0.35); }
            .ap-toast-card.ap-toast-error { border-color: rgba(239, 68, 68, 0.35); }
            .ap-toast-card.ap-toast-warning { border-color: rgba(245, 158, 11, 0.35); }
            .ap-toast-card.ap-toast-info { border-color: rgba(252, 213, 118, 0.35); }

            /* Light Mode Override */
            html.light-mode .ap-toast-card {
                background: #ffffff !important;
                border: 1px solid rgba(217, 119, 6, 0.26) !important;
                color: #1c1917 !important;
                box-shadow: 0 14px 34px rgba(78, 64, 45, 0.16) !important;
            }
            html.light-mode .ap-toast-header-tag {
                color: #b45309 !important;
            }
            html.light-mode .ap-toast-body-text {
                color: #1c1917 !important;
            }

            /* 3D Glowing Vector Icon Containers */
            .ap-toast-icon-wrap {
                position: relative;
                z-index: 2;
                width: 42px;
                height: 42px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .ap-toast-success .ap-toast-icon-wrap {
                background: linear-gradient(140deg, rgba(34, 197, 94, 0.34), rgba(16, 185, 129, 0.14));
                border: 1.5px solid rgba(34, 197, 94, 0.5);
                color: #4ade80;
            }
            .ap-toast-error .ap-toast-icon-wrap {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.28), rgba(225, 29, 72, 0.15));
                border: 1.5px solid rgba(239, 68, 68, 0.5);
                color: #f87171;
            }
            .ap-toast-warning .ap-toast-icon-wrap {
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(217, 119, 6, 0.15));
                border: 1.5px solid rgba(245, 158, 11, 0.5);
                color: #fbbf24;
            }
            .ap-toast-info .ap-toast-icon-wrap {
                background: linear-gradient(135deg, rgba(252, 213, 118, 0.28), rgba(245, 158, 11, 0.15));
                border: 1.5px solid rgba(252, 213, 118, 0.5);
                color: #fcd576;
            }

            /* Header tag colour per type */
            .ap-toast-success .ap-toast-header-tag { color: #86efac !important; }
            .ap-toast-error .ap-toast-header-tag { color: #fca5a5 !important; }
            .ap-toast-warning .ap-toast-header-tag { color: #fcd34d !important; }
            .ap-toast-info .ap-toast-header-tag { color: #fcd576 !important; }

            html.light-mode .ap-toast-success .ap-toast-header-tag { color: #15803d !important; }
            html.light-mode .ap-toast-error .ap-toast-header-tag { color: #b91c1c !important; }
            html.light-mode .ap-toast-warning .ap-toast-header-tag { color: #b45309 !important; }
            html.light-mode .ap-toast-info .ap-toast-header-tag { color: #b45309 !important; }

            /* Light mode: deeper icon strokes so they stay crisp on cream */
            html.light-mode .ap-toast-success .ap-toast-icon-wrap {
                background: linear-gradient(140deg, rgba(34, 197, 94, 0.18), rgba(16, 185, 129, 0.07)) !important;
                border: 1.5px solid rgba(34, 197, 94, 0.42) !important;
                color: #15803d !important;
            }
            html.light-mode .ap-toast-error .ap-toast-icon-wrap {
                background: linear-gradient(140deg, rgba(239, 68, 68, 0.16), rgba(225, 29, 72, 0.06)) !important;
                border: 1.5px solid rgba(239, 68, 68, 0.4) !important;
                color: #b91c1c !important;
            }
            html.light-mode .ap-toast-warning .ap-toast-icon-wrap {
                background: linear-gradient(140deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.08)) !important;
                border: 1.5px solid rgba(245, 158, 11, 0.45) !important;
                color: #b45309 !important;
            }
            html.light-mode .ap-toast-info .ap-toast-icon-wrap {
                background: linear-gradient(140deg, rgba(252, 213, 118, 0.3), rgba(245, 158, 11, 0.1)) !important;
                border: 1.5px solid rgba(217, 119, 6, 0.42) !important;
                color: #b45309 !important;
            }

            /* Close button */
            .ap-toast-close {
                flex-shrink: 0;
                width: 26px;
                height: 26px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin: -2px -5px 0 0;
                border: none;
                border-radius: 9px;
                background: rgba(255, 255, 255, 0.07);
                color: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
            }
            .ap-toast-close:hover {
                background: rgba(255, 255, 255, 0.16);
                color: #ffffff;
                transform: scale(1.08);
            }
            .ap-toast-close:active { transform: scale(0.95); }
            html.light-mode .ap-toast-close {
                background: rgba(28, 25, 23, 0.05);
                color: rgba(28, 25, 23, 0.45);
            }
            html.light-mode .ap-toast-close:hover {
                background: rgba(28, 25, 23, 0.11);
                color: #1c1917;
            }

            @media (max-width: 640px) {
                #ap-toast-container {
                    top: 68px !important;
                    right: 50% !important;
                    transform: translateX(50%);
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createSparkles(container) {
        for (let i = 0; i < 6; i++) {
            const sp = document.createElement('span');
            const dx = (Math.random() * 60 - 30) + 'px';
            const dy = (Math.random() * -40 - 10) + 'px';
            sp.style.cssText = `
                position: absolute;
                top: 50%;
                left: 20px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: ${['#4ade80', '#fcd576', '#38bdf8'][i % 3]};
                pointer-events: none;
                z-index: 10;
                --dx: ${dx};
                --dy: ${dy};
                animation: apSparkleFloat 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            `;
            container.appendChild(sp);
        }
    }

    window.showToast = function(msg, type = 'success', duration = 3400) {
        if (!msg) return;
        const container = getToastContainer();

        // Xóa emoji/icon ở đầu chuỗi message
        function stripLeadingEmoji(str) {
            return str.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F300}-\u{1F9FF}\u{FE00}-\u{FEFF}\u{200D}\uFE0F✅❌⚠️ℹ️🔔💬📢🎉🎊🌟⭐💡🔥🚀]+[\s]*/gu, '').trim();
        }
        const cleanMsg = stripLeadingEmoji(String(msg));

        const toast = document.createElement('div');
        toast.className = `ap-toast-card ap-toast-${type}`;

        const titles = {
            success: 'THÀNH CÔNG',
            error: 'LỖI',
            warning: 'CẢNH BÁO',
            info: 'THÔNG BÁO'
        };

        const dotColors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#fcd576'
        };

        // Modern 3D Glowing Vector SVG Icons
        const icons = {
            success: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01" style="stroke-dasharray: 24; stroke-dashoffset: 0; animation: apCheckDraw 0.4s ease-out;"/>
                </svg>
            `,
            error: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            `,
            warning: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
            `,
            info: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
            `
        };

        toast.innerHTML = `
            <div class="ap-toast-icon-wrap">
                ${icons[type] || icons.info}
            </div>
            <div class="ap-toast-content" style="flex: 1; word-break: break-word; min-width: 0; position: relative; z-index: 2;">
                <div class="ap-toast-header-tag" style="font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px; display: flex; align-items: center; gap: 5px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: ${dotColors[type]}; display: inline-block; animation: apPulseDot 1.8s infinite;"></span>
                    ${titles[type] || 'THÔNG BÁO'}
                </div>
                <div class="ap-toast-body-text" style="font-size: 13.5px; font-weight: 700; line-height: 1.4; color: #ffffff;">
                    ${cleanMsg}
                </div>
            </div>
            <button class="ap-toast-close" onclick="this.parentElement.remove()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

        `;

        container.appendChild(toast);
        if (type === 'success') createSparkles(toast);

        setTimeout(() => {
            toast.style.animation = 'apToastSpringOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }, duration);
    };

    window.showMessage = function(msg, type) {
        window.showToast(msg, type || 'info');
    };

    window.alert = function(msg) {
        if (!msg) return;
        const msgStr = String(msg);
        let type = 'info';
        if (msgStr.includes('thành công') || msgStr.includes('trang bị') || msgStr.includes('thành viên') || msgStr.includes('🎉') || msgStr.includes('✅')) {
            type = 'success';
        } else if (msgStr.includes('thất bại') || msgStr.includes('lỗi') || msgStr.includes('cần thêm') || msgStr.includes('không')) {
            type = 'warning';
        }
        window.showToast(msgStr, type, 3500);
    };
})();
