/**
 * Voice Search - High Performance Realtime Speech Recognition
 * Nâng cấp luồng nhận diện giọng nói tiếng Việt tức thì, streaming trực tiếp vào ô tìm kiếm
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
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: color 0.15s, background 0.15s, transform 0.15s;
            margin-left: 2px;
            z-index: 100;
            touch-action: manipulation;
            user-select: none;
            position: relative;
        }
        .vs-nav-mic-btn * {
            pointer-events: none;
        }
        .vs-nav-mic-btn:hover {
            color: #f2f20d;
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.08);
        }
        .vs-nav-mic-btn:active {
            transform: scale(0.92);
        }
        .vs-nav-mic-btn .material-icons-round {
            font-size: 20px;
            transition: color 0.15s ease;
        }
        /* 🔴 Trạng thái đang lắng nghe: nhấp nháy phát sáng đỏ cực nhạy */
        .vs-nav-mic-btn.is-listening {
            color: #ef4444 !important;
            background: rgba(239, 68, 68, 0.2) !important;
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4), 0 0 16px rgba(239, 68, 68, 0.5);
            animation: vsMicPulse 1s infinite alternate ease-in-out;
        }
        @keyframes vsMicPulse {
            0% { transform: scale(1); box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4), 0 0 12px rgba(239, 68, 68, 0.3); }
            100% { transform: scale(1.12); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.7), 0 0 24px rgba(239, 68, 68, 0.8); }
        }
        /* ── Tự động ẩn mic trùng trong Mobile Search Overlay ── */
        .mso-input-wrap .vs-nav-mic-btn {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var activeRecognition = null;
    var activeBtn = null;

    function showToast(msg) {
        var t = document.getElementById('asFavToast') || document.getElementById('globalToast');
        if (t) {
            t.textContent = msg;
            t.style.display = 'block';
            clearTimeout(t._timer);
            t._timer = setTimeout(function () { t.style.display = 'none'; }, 2200);
        } else {
            console.log('[VoiceSearch]', msg);
        }
    }

    function stopListening() {
        if (activeRecognition) {
            try { activeRecognition.stop(); } catch (e) {}
            activeRecognition = null;
        }
        if (activeBtn) {
            activeBtn.classList.remove('is-listening');
            activeBtn = null;
        }
    }

    function startVoiceSearch(btn, input, searchForm) {
        if (!SpeechRecognition) {
            showToast('⚠️ Trình duyệt chưa hỗ trợ nhận diện giọng nói Web Speech');
            return;
        }

        // Nếu đang nghe thì bấm lần nữa để dừng
        if (btn.classList.contains('is-listening')) {
            stopListening();
            return;
        }

        stopListening();

        try {
            var recognition = new SpeechRecognition();
            activeRecognition = recognition;
            activeBtn = btn;

            recognition.lang = 'vi-VN';
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            var originalPlaceholder = input.getAttribute('placeholder') || '';

            recognition.onstart = function () {
                btn.classList.add('is-listening');
                input.setAttribute('placeholder', '🎙️ Đang lắng nghe bạn nói...');
                input.focus();
            };

            recognition.onresult = function (event) {
                var transcript = '';
                var isFinal = false;

                for (var i = event.resultIndex; i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        isFinal = true;
                    }
                }

                if (transcript) {
                    input.value = transcript;
                    // Kích hoạt live-search tức thì
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }

                if (isFinal && transcript.trim()) {
                    stopListening();
                    input.setAttribute('placeholder', originalPlaceholder);
                    // Tự động submit sau 400ms để người dùng thấy rõ kết quả
                    setTimeout(function () {
                        if (searchForm && typeof searchForm.requestSubmit === 'function') {
                            searchForm.requestSubmit();
                        } else if (searchForm && typeof searchForm.submit === 'function') {
                            searchForm.submit();
                        }
                    }, 400);
                }
            };

            recognition.onerror = function (event) {
                console.warn('[VoiceSearch] Error:', event.error);
                stopListening();
                input.setAttribute('placeholder', originalPlaceholder);
                if (event.error === 'not-allowed') {
                    showToast('⚠️ Vui lòng cấp quyền Microphone để tìm kiếm bằng giọng nói');
                }
            };

            recognition.onend = function () {
                stopListening();
                input.setAttribute('placeholder', originalPlaceholder);
            };

            recognition.start();
        } catch (err) {
            console.error('[VoiceSearch] Start failed:', err);
            stopListening();
            input.setAttribute('placeholder', originalPlaceholder);
        }
    }

    function injectMicButtonToForm(searchForm) {
        if (!searchForm) return;
        if (searchForm.classList.contains('mso-input-wrap') || searchForm.querySelector('#msoVoiceBtn')) return;
        if (searchForm.querySelector('.vs-nav-mic-btn')) return;

        var oldMic = searchForm.querySelector('.sp-voice-btn');
        if (oldMic) oldMic.remove();

        var input = searchForm.querySelector('input[type="text"]') || searchForm.querySelector('input[type="search"]');
        if (!input) return;

        var micBtn = document.createElement('button');
        micBtn.type = 'button';
        micBtn.className = 'vs-nav-mic-btn';
        micBtn.setAttribute('aria-label', 'Tìm kiếm bằng giọng nói');
        micBtn.setAttribute('title', 'Tìm kiếm bằng giọng nói (Tiếng Việt)');
        micBtn.innerHTML = '<span class="material-icons-round">mic</span>';

        micBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            startVoiceSearch(micBtn, input, searchForm);
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
        var forms = document.querySelectorAll('.nav-search-v2, .sp-search-box, .as-top-search-form');
        forms.forEach(function (f) {
            injectMicButtonToForm(f);
        });
    }

    bindAllSearchForms();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAllSearchForms);
    } else {
        bindAllSearchForms();
    }

    setTimeout(bindAllSearchForms, 400);
    setTimeout(bindAllSearchForms, 1200);
})();