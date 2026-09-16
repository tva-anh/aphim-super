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
            @keyframes apProgressRun {
                0% { width: 100%; }
                100% { width: 0%; }
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
                padding: 14px 18px;
                border-radius: 18px;
                background: linear-gradient(135deg, rgba(20, 24, 38, 0.94) 0%, rgba(14, 17, 26, 0.96) 100%);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.16);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 0, 0, 0.4);
                color: #ffffff;
                font-family: 'Be Vietnam Pro', 'Inter', sans-serif;
                animation: apToastSpringIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                box-sizing: border-box;
            }

            /* Success Type Glow */
            .ap-toast-card.ap-toast-success {
                border-color: rgba(34, 197, 94, 0.35);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6), 0 0 30px rgba(34, 197, 94, 0.22);
            }
            /* Error Type Glow */
            .ap-toast-card.ap-toast-error {
                border-color: rgba(239, 68, 68, 0.35);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.22);
            }
            /* Warning Type Glow */
            .ap-toast-card.ap-toast-warning {
                border-color: rgba(245, 158, 11, 0.35);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.22);
            }
            /* Info Type Glow */
            .ap-toast-card.ap-toast-info {
                border-color: rgba(252, 213, 118, 0.35);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6), 0 0 30px rgba(252, 213, 118, 0.22);
            }

            /* Light Mode Override */
            html.light-mode .ap-toast-card {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(253, 251, 247, 0.96) 100%) !important;
                border: 1.5px solid rgba(217, 119, 6, 0.28) !important;
                color: #1c1917 !important;
                box-shadow: 0 16px 40px rgba(78, 64, 45, 0.16), 0 0 20px rgba(217, 119, 6, 0.12) !important;
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
                width: 40px;
                height: 40px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .ap-toast-success .ap-toast-icon-wrap {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.28), rgba(16, 185, 129, 0.15));
                border: 1.5px solid rgba(34, 197, 94, 0.5);
                color: #4ade80;
                box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
            }
            .ap-toast-error .ap-toast-icon-wrap {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.28), rgba(225, 29, 72, 0.15));
                border: 1.5px solid rgba(239, 68, 68, 0.5);
                color: #f87171;
                box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
            }
            .ap-toast-warning .ap-toast-icon-wrap {
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(217, 119, 6, 0.15));
                border: 1.5px solid rgba(245, 158, 11, 0.5);
                color: #fbbf24;
                box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
            }
            .ap-toast-info .ap-toast-icon-wrap {
                background: linear-gradient(135deg, rgba(252, 213, 118, 0.28), rgba(245, 158, 11, 0.15));
                border: 1.5px solid rgba(252, 213, 118, 0.5);
                color: #fcd576;
                box-shadow: 0 4px 14px rgba(252, 213, 118, 0.35);
            }

            /* Bottom Progress Bar */
            .ap-toast-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3.5px;
                border-radius: 0 0 18px 18px;
            }
            .ap-toast-success .ap-toast-bar { background: linear-gradient(90deg, #22c55e, #86efac); }
            .ap-toast-error .ap-toast-bar { background: linear-gradient(90deg, #ef4444, #fca5a5); }
            .ap-toast-warning .ap-toast-bar { background: linear-gradient(90deg, #f59e0b, #fde68a); }
            .ap-toast-info .ap-toast-bar { background: linear-gradient(90deg, #fcd576, #f59e0b); }

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
            <div style="flex: 1; word-break: break-word; min-width: 0;">
                <div class="ap-toast-header-tag" style="font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px; display: flex; align-items: center; gap: 5px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: ${dotColors[type]}; display: inline-block; animation: apPulseDot 1.8s infinite;"></span>
                    ${titles[type] || 'THÔNG BÁO'}
                </div>
                <div class="ap-toast-body-text" style="font-size: 13.5px; font-weight: 700; line-height: 1.4; color: #ffffff;">
                    ${cleanMsg}
                </div>
            </div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-top: -2px; transition: all 0.2s;" onmouseover="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.color='rgba(255,255,255,0.4)'; this.style.background='none'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="ap-toast-bar" style="animation: apProgressRun ${duration}ms linear forwards;"></div>
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
