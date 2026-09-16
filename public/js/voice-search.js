/**
 * Voice Search - UI Only Version
 * Chỉ hiển thị giao diện nút Mic cho đẹp, không chạy ngầm API.
 */
(function () {
    'use strict';

    var style = document.createElement('style');
    style.textContent = `
        .vs-nav-mic-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.7);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: color 0.18s, background 0.18s;
            margin-left: 2px;
            z-index: 100;
        }
        .vs-nav-mic-btn:hover {
            color: #f2f20d;
            background: rgba(255,255,255,0.08);
        }
        .vs-nav-mic-btn .material-icons-round {
            font-size: 18px;
        }
        /* ── Tự động ẩn mic trùng trong Mobile Search Overlay ── */
        .mso-input-wrap .vs-nav-mic-btn {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    function injectMicButtonToForm(searchForm) {
        if (!searchForm) return;
        // Nếu là .mso-input-wrap (Mobile Overlay) đã có #msoVoiceBtn thì bỏ qua không inject trùng
        if (searchForm.classList.contains('mso-input-wrap') || searchForm.querySelector('#msoVoiceBtn')) return;
        if (searchForm.querySelector('.vs-nav-mic-btn')) return;

        // Xóa nút mic tĩnh cũ (nếu có)
        var oldMic = searchForm.querySelector('.sp-voice-btn');
        if (oldMic) {
            oldMic.remove();
        }

        var input = searchForm.querySelector('input[type="text"]');
        if (!input) return;

        var micBtn = document.createElement('button');
        micBtn.type = 'button';
        micBtn.className = 'vs-nav-mic-btn';
        micBtn.setAttribute('aria-label', 'Tìm kiếm bằng giọng nói');
        micBtn.setAttribute('title', 'Tìm kiếm bằng giọng nói');
        micBtn.innerHTML = '<span class="material-icons-round">mic</span>';

        micBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            alert("Tính năng tìm kiếm bằng giọng nói hiện đang được bảo trì!");
        });

        // Insert vào cuối input container
        input.parentNode.insertBefore(micBtn, input.nextSibling);
        
        searchForm.style.display = 'flex';
        searchForm.style.alignItems = 'center';
        if (searchForm.className && typeof searchForm.className === 'string' && searchForm.className.includes('sp-search-box')) {
            micBtn.style.marginRight = '4px';
        }
    }

    function bindAllSearchForms() {
        // Chỉ inject cho Desktop header & Search page
        var forms = document.querySelectorAll('.nav-search-v2, .sp-search-box');
        forms.forEach(function(f) {
            injectMicButtonToForm(f);
        });
    }

    bindAllSearchForms();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAllSearchForms);
    } else {
        bindAllSearchForms();
    }

    setTimeout(bindAllSearchForms, 500);
    setTimeout(bindAllSearchForms, 1500);
})();