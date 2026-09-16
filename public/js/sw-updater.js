/**
 * sw-updater.js — Phát hiện cập nhật mới và thông báo người dùng
 * Nhỏ gọn, không phụ thuộc thư viện nào.
 */
(function () {
    if (!('serviceWorker' in navigator)) return;

    // ── Đăng ký Service Worker ────────────────────────
    navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
            // Kiểm tra cập nhật định kỳ (mỗi 3 phút)
            setInterval(() => registration.update(), 3 * 60 * 1000);

            // Lắng nghe khi có SW mới đang chờ kích hoạt
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Có bản mới → Hiện thông báo
                        showUpdateToast(newWorker);
                    }
                });
            });
        })
        .catch(err => console.warn('[SW Updater] Lỗi đăng ký:', err));

    // Lắng nghe reload sau khi SW mới kiểm soát trang (chỉ reload khi cập nhật bản mới, tránh reload nháy màn hình ở lần truy cập đầu tiên)
    let refreshing = false;
    const isControlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isControlled && !refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });

    // ── Hiện toast thông báo cập nhật ─────────────────
    function showUpdateToast(newWorker) {
        // Không tạo 2 lần
        if (document.getElementById('sw-update-toast')) return;

        const toast = document.createElement('div');
        toast.id = 'sw-update-toast';
        toast.innerHTML = `
            <style>
                #sw-update-toast {
                    position: fixed;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    color: #f1f5f9;
                    padding: 14px 20px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08);
                    z-index: 999999;
                    font-family: 'Be Vietnam Pro', 'Manrope', sans-serif;
                    font-size: 13.5px;
                    opacity: 0;
                    transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
                    min-width: 280px;
                    max-width: 90vw;
                    white-space: nowrap;
                }
                #sw-update-toast.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                #sw-update-toast .sw-icon {
                    font-size: 22px;
                    flex-shrink: 0;
                }
                #sw-update-toast .sw-text {
                    flex: 1;
                    line-height: 1.4;
                }
                #sw-update-toast .sw-text strong {
                    display: block;
                    color: #ffd709;
                    font-weight: 700;
                    font-size: 13px;
                }
                #sw-update-toast .sw-text span {
                    color: #94a3b8;
                    font-size: 12px;
                }
                #sw-update-toast .sw-reload-btn {
                    background: linear-gradient(135deg, #ffd709, #f59e0b);
                    color: #1a1200;
                    border: none;
                    padding: 7px 16px;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 12.5px;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                    font-family: inherit;
                }
                #sw-update-toast .sw-reload-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(255,215,9,0.4);
                }
                #sw-update-toast .sw-dismiss-btn {
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.15);
                    color: #64748b;
                    padding: 6px 10px;
                    border-radius: 7px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                    font-family: inherit;
                }
                #sw-update-toast .sw-dismiss-btn:hover { background: rgba(255,255,255,0.05); }
            </style>
            <span class="sw-icon">🚀</span>
            <div class="sw-text">
                <strong>Phiên bản mới đã có!</strong>
                <span>Giao diện vừa được cập nhật</span>
            </div>
            <button class="sw-reload-btn" id="sw-reload">Tải lại</button>
            <button class="sw-dismiss-btn" id="sw-dismiss">✕</button>
        `;
        document.body.appendChild(toast);

        // Animate vào
        requestAnimationFrame(() => toast.classList.add('show'));

        // Nút tải lại
        document.getElementById('sw-reload').addEventListener('click', () => {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        });

        // Nút bỏ qua
        document.getElementById('sw-dismiss').addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 350);
        });

        // Tự ẩn sau 15 giây nếu không thao tác
        setTimeout(() => {
            if (document.getElementById('sw-update-toast')) {
                document.getElementById('sw-dismiss')?.click();
            }
        }, 15000);
    }
})();
