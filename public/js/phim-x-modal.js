// ============================================================
// PHIM X - 18+ Warning Modal
// Include this script in every page that has the nav item
// ============================================================

(function () {
    // Inject modal HTML into body
    function injectModal() {
        if (document.getElementById('phimXModal')) return;

        const modalHTML = `
        <!-- Phim X 18+ Warning Modal -->
        <div id="phimXModal" style="
            display: none;
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(0,0,0,0.92);
            backdrop-filter: blur(12px);
            align-items: center;
            justify-content: center;
            font-family: 'Be Vietnam Pro', 'Space Grotesk', sans-serif;
        ">
            <div id="phimXModalBox" style="
                background: linear-gradient(135deg, #1a0a0a 0%, #1f1025 50%, #0f0a1a 100%);
                border: 1px solid rgba(249,115,22,0.4);
                border-radius: 20px;
                padding: 40px 32px;
                max-width: 480px;
                width: 90%;
                text-align: center;
                box-shadow: 0 0 60px rgba(249,115,22,0.2), 0 0 120px rgba(147,51,234,0.1);
                animation: phimXSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                position: relative;
                overflow: hidden;
            ">
                <!-- Glow background -->
                <div style="
                    position: absolute; inset: 0;
                    background: radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 70%);
                    pointer-events: none;
                "></div>

                <!-- Icon -->
                <div style="
                    width: 80px; height: 80px; margin: 0 auto 20px;
                    background: linear-gradient(135deg, #f97316, #dc2626);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 36px;
                    box-shadow: 0 0 30px rgba(249,115,22,0.5);
                    animation: phimXPulse 2s ease-in-out infinite;
                ">🔞</div>

                <!-- Badge -->
                <div style="
                    display: inline-block;
                    background: rgba(249,115,22,0.15);
                    border: 1px solid rgba(249,115,22,0.4);
                    color: #f97316;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    padding: 4px 16px;
                    border-radius: 100px;
                    margin-bottom: 16px;
                ">NỘI DUNG NGƯỜI LỚN</div>

                <!-- Title -->
                <h2 style="
                    color: #ffffff;
                    font-size: 22px;
                    font-weight: 800;
                    margin: 0 0 12px;
                    letter-spacing: 0.5px;
                ">Cảnh báo: 18+</h2>

                <!-- Description -->
                <p style="
                    color: #9ca3af;
                    font-size: 14px;
                    line-height: 1.7;
                    margin: 0 0 28px;
                ">
                    Khu vực <strong style="color:#f97316">Phim X</strong> chứa nội dung dành riêng cho
                    người lớn từ <strong style="color:#fff">18 tuổi trở lên</strong>.
                    <br><br>
                    Bằng cách tiếp tục, bạn xác nhận rằng bạn đủ 18 tuổi và đồng ý với
                    điều khoản sử dụng của chúng tôi.
                </p>

                <!-- Warning box -->
                <div style="
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.25);
                    border-radius: 10px;
                    padding: 10px 16px;
                    margin-bottom: 28px;
                    font-size: 12px;
                    color: #fca5a5;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-align: left;
                ">
                    <span style="font-size:16px;flex-shrink:0;">⚠️</span>
                    <span>Không dành cho người dưới 18 tuổi. Nếu bạn chưa đủ tuổi, vui lòng rời khỏi trang này.</span>
                </div>

                <!-- Buttons -->
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button onclick="phimXConfirm()" id="phimXConfirmBtn" style="
                        background: linear-gradient(135deg, #f97316, #ea580c);
                        color: #fff;
                        font-weight: 800;
                        font-size: 15px;
                        letter-spacing: 0.5px;
                        border: none;
                        border-radius: 12px;
                        padding: 14px 24px;
                        cursor: pointer;
                        width: 100%;
                        transition: all 0.2s;
                        box-shadow: 0 4px 20px rgba(249,115,22,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 30px rgba(249,115,22,0.5)'"
                       onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px rgba(249,115,22,0.4)'">
                        ✅ Tôi đã đủ 18 tuổi, cho tôi vào!
                    </button>

                    <button onclick="phimXClose()" style="
                        background: rgba(255,255,255,0.05);
                        color: #9ca3af;
                        font-weight: 600;
                        font-size: 14px;
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 12px;
                        padding: 12px 24px;
                        cursor: pointer;
                        width: 100%;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'"
                       onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='#9ca3af'">
                        ← Quay lại trang an toàn
                    </button>
                </div>

                <!-- Footer note -->
                <p style="
                    color: #4b5563;
                    font-size: 11px;
                    margin-top: 20px;
                ">Lựa chọn của bạn sẽ được lưu trong phiên trình duyệt hiện tại</p>
            </div>
        </div>

        <style>
            @keyframes phimXSlideIn {
                from { opacity: 0; transform: scale(0.85) translateY(20px); }
                to   { opacity: 1; transform: scale(1)   translateY(0); }
            }
            @keyframes phimXPulse {
                0%, 100% { box-shadow: 0 0 20px rgba(249,115,22,0.4); }
                50%       { box-shadow: 0 0 40px rgba(249,115,22,0.7); }
            }
        </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Open modal
    window.openPhimXModal = function () {
        injectModal();
        const modal = document.getElementById('phimXModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    // Close modal
    window.phimXClose = function () {
        const modal = document.getElementById('phimXModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    };

    // Confirm - Go to Phim X page
    window.phimXConfirm = function () {
        const btn = document.getElementById('phimXConfirmBtn');
        if (btn) {
            btn.innerHTML = '⏳ Đang chuyển trang...';
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';
        }
        setTimeout(function () {
            window.location.href = 'phim-x.html';
        }, 400);
    };

    // Close on backdrop click
    document.addEventListener('click', function (e) {
        const modal = document.getElementById('phimXModal');
        const box = document.getElementById('phimXModalBox');
        if (modal && modal.style.display === 'flex' && !box.contains(e.target) && e.target === modal) {
            window.phimXClose();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') window.phimXClose();
    });

})();
