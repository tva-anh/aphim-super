/**
 * A PHIM - Chat Error Handler
 * Xử lý và hiển thị lỗi Firebase một cách thân thiện
 */

(function () {
    'use strict';

    class ChatErrorHandler {
        constructor() {
            this.errorCount = 0;
            this.lastError = null;
            this.permissionDenied = false;

            this._init();
        }

        _init() {
            // Listen for Firebase errors
            window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && event.reason.code) {
                    this.handleFirebaseError(event.reason);
                }
            });

            // Override console.error to catch Firebase errors
            const originalError = console.error;
            console.error = (...args) => {
                originalError.apply(console, args);

                // Check if it's a Firebase error
                args.forEach(arg => {
                    if (arg && typeof arg === 'object' && arg.code) {
                        this.handleFirebaseError(arg);
                    }
                });
            };
        }

        handleFirebaseError(error) {
            this.errorCount++;
            this.lastError = error;

            console.log('[ChatErrorHandler] Caught error:', error.code, error.message);

            switch (error.code) {
                case 'permission-denied':
                    this.handlePermissionDenied();
                    break;

                case 'unavailable':
                    this.handleUnavailable();
                    break;

                case 'unauthenticated':
                    this.handleUnauthenticated();
                    break;

                case 'failed-precondition':
                    this.handleFailedPrecondition();
                    break;

                case 'resource-exhausted':
                    this.handleResourceExhausted();
                    break;

                default:
                    this.handleGenericError(error);
            }
        }

        handlePermissionDenied() {
            this.permissionDenied = true;

            this.showErrorBanner({
                title: '⚠️ Lỗi Quyền Truy Cập',
                message: 'Firestore Security Rules chưa được cấu hình đúng.',
                action: 'Xem Hướng Dẫn',
                actionCallback: () => {
                    this.showFixGuide();
                },
                persistent: true
            });

            // Log to console with instructions
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ FIREBASE PERMISSION DENIED');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('');
            console.error('📋 HƯỚNG DẪN SỬA LỖI:');
            console.error('');
            console.error('1. Mở Firebase Console:');
            console.error('   https://console.firebase.google.com');
            console.error('');
            console.error('2. Chọn project: chat-a-phim');
            console.error('');
            console.error('3. Vào Firestore Database → Rules');
            console.error('');
            console.error('4. Copy rules từ file: FIRESTORE_SECURITY_RULES.txt');
            console.error('');
            console.error('5. Click Publish');
            console.error('');
            console.error('📄 Chi tiết: Xem file SUA_LOI_CHAT_PERMISSION.md');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        handleUnavailable() {
            this.showErrorBanner({
                title: '🔌 Mất Kết Nối',
                message: 'Không thể kết nối đến Firebase. Đang thử lại...',
                type: 'warning',
                autoHide: 5000
            });
        }

        handleUnauthenticated() {
            this.showErrorBanner({
                title: '🔐 Chưa Đăng Nhập',
                message: 'Vui lòng đăng nhập để sử dụng chat.',
                action: 'Đăng Nhập',
                actionCallback: () => {
                    if (window.authModal && typeof window.authModal.open === 'function') {
                        window.authModal.open('login');
                    } else {
                        window.location.href = '/login.html';
                    }
                }
            });
        }

        handleFailedPrecondition() {
            this.showErrorBanner({
                title: '⚠️ Lỗi Cấu Hình',
                message: 'Có vấn đề với cấu hình Firebase. Vui lòng thử lại.',
                type: 'warning',
                autoHide: 5000
            });
        }

        handleResourceExhausted() {
            this.showErrorBanner({
                title: '📊 Vượt Quota',
                message: 'Đã vượt giới hạn sử dụng Firebase. Vui lòng thử lại sau.',
                type: 'error',
                persistent: true
            });
        }

        handleGenericError(error) {
            this.showErrorBanner({
                title: '❌ Lỗi Không Xác Định',
                message: error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
                type: 'error',
                autoHide: 5000
            });
        }

        showErrorBanner({ title, message, action, actionCallback, type = 'error', persistent = false, autoHide = 0 }) {
            // Remove existing banner
            const existing = document.getElementById('chatErrorBanner');
            if (existing) existing.remove();

            // Create banner
            const banner = document.createElement('div');
            banner.id = 'chatErrorBanner';
            banner.className = `chat-error-banner ${type}`;
            banner.innerHTML = `
                <div class="error-banner-content">
                    <div class="error-banner-icon">
                        ${type === 'error' ? '⚠️' : type === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div class="error-banner-text">
                        <div class="error-banner-title">${title}</div>
                        <div class="error-banner-message">${message}</div>
                    </div>
                    ${action ? `<button class="error-banner-action">${action}</button>` : ''}
                    ${!persistent ? '<button class="error-banner-close">✕</button>' : ''}
                </div>
            `;

            // Add styles if not exists
            if (!document.getElementById('chatErrorBannerStyles')) {
                const style = document.createElement('style');
                style.id = 'chatErrorBannerStyles';
                style.textContent = `
                    .chat-error-banner {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        max-width: 400px;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        z-index: 999999;
                        animation: slideInRight 0.3s ease;
                    }
                    .chat-error-banner.error {
                        border-left: 4px solid #ef4444;
                    }
                    .chat-error-banner.warning {
                        border-left: 4px solid #f59e0b;
                    }
                    .chat-error-banner.info {
                        border-left: 4px solid #3b82f6;
                    }
                    .error-banner-content {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        padding: 16px;
                    }
                    .error-banner-icon {
                        font-size: 24px;
                        flex-shrink: 0;
                    }
                    .error-banner-text {
                        flex: 1;
                    }
                    .error-banner-title {
                        font-weight: 700;
                        font-size: 14px;
                        color: #1e293b;
                        margin-bottom: 4px;
                    }
                    .error-banner-message {
                        font-size: 13px;
                        color: #64748b;
                        line-height: 1.5;
                    }
                    .error-banner-action {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        flex-shrink: 0;
                    }
                    .error-banner-action:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                    }
                    .error-banner-close {
                        background: none;
                        border: none;
                        color: #94a3b8;
                        font-size: 18px;
                        cursor: pointer;
                        padding: 0;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        transition: all 0.2s;
                        flex-shrink: 0;
                    }
                    .error-banner-close:hover {
                        background: #f1f5f9;
                        color: #1e293b;
                    }
                    @keyframes slideInRight {
                        from {
                            opacity: 0;
                            transform: translateX(100px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    @media (max-width: 768px) {
                        .chat-error-banner {
                            top: 10px;
                            right: 10px;
                            left: 10px;
                            max-width: none;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(banner);

            // Add event listeners
            if (action && actionCallback) {
                banner.querySelector('.error-banner-action').onclick = () => {
                    actionCallback();
                    banner.remove();
                };
            }

            const closeBtn = banner.querySelector('.error-banner-close');
            if (closeBtn) {
                closeBtn.onclick = () => banner.remove();
            }

            // Auto hide
            if (autoHide > 0) {
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.style.animation = 'slideOutRight 0.3s ease';
                        setTimeout(() => banner.remove(), 300);
                    }
                }, autoHide);
            }
        }

        showFixGuide() {
            const modal = document.createElement('div');
            modal.className = 'chat-fix-guide-modal';
            modal.innerHTML = `
                <div class="fix-guide-overlay" onclick="this.parentElement.remove()"></div>
                <div class="fix-guide-content">
                    <div class="fix-guide-header">
                        <h2>🔧 Hướng Dẫn Sửa Lỗi Permission</h2>
                        <button class="fix-guide-close" onclick="this.closest('.chat-fix-guide-modal').remove()">✕</button>
                    </div>
                    <div class="fix-guide-body">
                        <div class="fix-guide-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h3>Mở Firebase Console</h3>
                                <p>Truy cập: <a href="https://console.firebase.google.com" target="_blank">console.firebase.google.com</a></p>
                            </div>
                        </div>
                        <div class="fix-guide-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h3>Chọn Project</h3>
                                <p>Chọn project: <strong>chat-a-phim</strong></p>
                            </div>
                        </div>
                        <div class="fix-guide-step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h3>Vào Firestore Rules</h3>
                                <p>Firestore Database → Rules</p>
                            </div>
                        </div>
                        <div class="fix-guide-step">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h3>Copy Rules</h3>
                                <p>Copy nội dung từ file: <code>FIRESTORE_SECURITY_RULES.txt</code></p>
                            </div>
                        </div>
                        <div class="fix-guide-step">
                            <div class="step-number">5</div>
                            <div class="step-content">
                                <h3>Publish</h3>
                                <p>Click nút <strong>Publish</strong> để áp dụng</p>
                            </div>
                        </div>
                    </div>
                    <div class="fix-guide-footer">
                        <p>📄 Chi tiết đầy đủ: <code>SUA_LOI_CHAT_PERMISSION.md</code></p>
                    </div>
                </div>
            `;

            // Add styles
            if (!document.getElementById('fixGuideStyles')) {
                const style = document.createElement('style');
                style.id = 'fixGuideStyles';
                style.textContent = `
                    .chat-fix-guide-modal {
                        position: fixed;
                        inset: 0;
                        z-index: 9999999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .fix-guide-overlay {
                        position: absolute;
                        inset: 0;
                        background: rgba(0,0,0,0.7);
                        backdrop-filter: blur(4px);
                    }
                    .fix-guide-content {
                        position: relative;
                        background: white;
                        border-radius: 16px;
                        max-width: 600px;
                        width: 100%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: modalZoom 0.3s ease;
                    }
                    .fix-guide-header {
                        padding: 24px;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    .fix-guide-header h2 {
                        margin: 0;
                        font-size: 20px;
                        color: #1e293b;
                    }
                    .fix-guide-close {
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #94a3b8;
                        cursor: pointer;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 6px;
                        transition: all 0.2s;
                    }
                    .fix-guide-close:hover {
                        background: #f1f5f9;
                        color: #1e293b;
                    }
                    .fix-guide-body {
                        padding: 24px;
                    }
                    .fix-guide-step {
                        display: flex;
                        gap: 16px;
                        margin-bottom: 24px;
                    }
                    .step-number {
                        width: 32px;
                        height: 32px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        flex-shrink: 0;
                    }
                    .step-content h3 {
                        margin: 0 0 8px 0;
                        font-size: 16px;
                        color: #1e293b;
                    }
                    .step-content p {
                        margin: 0;
                        font-size: 14px;
                        color: #64748b;
                        line-height: 1.6;
                    }
                    .step-content code {
                        background: #f1f5f9;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 13px;
                        color: #667eea;
                    }
                    .step-content a {
                        color: #667eea;
                        text-decoration: none;
                    }
                    .step-content a:hover {
                        text-decoration: underline;
                    }
                    .fix-guide-footer {
                        padding: 16px 24px;
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                        text-align: center;
                    }
                    .fix-guide-footer p {
                        margin: 0;
                        font-size: 13px;
                        color: #64748b;
                    }
                    @keyframes modalZoom {
                        from {
                            opacity: 0;
                            transform: scale(0.9);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(modal);
        }

        getStatus() {
            return {
                errorCount: this.errorCount,
                lastError: this.lastError,
                permissionDenied: this.permissionDenied
            };
        }
    }

    // Initialize
    window.chatErrorHandler = new ChatErrorHandler();
    console.log('[ChatErrorHandler] Initialized ✓');
})();
