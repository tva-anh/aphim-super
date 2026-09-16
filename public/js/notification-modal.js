// Notification Modal System with Multiple Options
(function () {
    const MODAL_STORAGE_KEY = 'aphim_notification_seen';
    const DONATION_CONFIRMED_KEY = 'aphim_donation_confirmed';
    const VISIT_COUNT_KEY = 'aphim_visit_count';

    // Configuration
    const CONFIG = {
        enabled: false, // TẮT thông báo - đã có quảng cáo

        // Option 1: Time-based (hours) - Show modal again after X hours
        showAfterHours: 24, // Show modal again after 24 hours (1 ngày)

        // Option 2: Visit count-based
        showEveryNVisits: 4, // Show modal every 4 visits

        // Option 3: Hide for N days after donation confirmation
        hideDaysAfterDonation: 4, // Random 3-5 days, using 4 as middle

        // Choose which method to use: 'time', 'visits', 'both', 'donation', 'hours'
        method: 'hours' // Show every 24 hours (1 ngày)
    };

    // Check if this is first time visitor
    function isFirstTimeVisitor() {
        return !localStorage.getItem(VISIT_COUNT_KEY);
    }

    // Increment visit count
    function incrementVisitCount() {
        let visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0') + 1;
        localStorage.setItem(VISIT_COUNT_KEY, visits.toString());
        return visits;
    }

    // Check if user confirmed donation recently
    function hasRecentDonation() {
        const donationData = localStorage.getItem(DONATION_CONFIRMED_KEY);
        if (!donationData) return false;

        try {
            const data = JSON.parse(donationData);
            const daysSince = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);

            // Random between 3-5 days
            const hideDays = CONFIG.hideDaysAfterDonation + Math.random() - 0.5; // 3.5 to 4.5 days

            return daysSince < hideDays;
        } catch (e) {
            return false;
        }
    }

    // Check if modal should be shown based on time (hours)
    function shouldShowByTime() {
        const lastSeen = localStorage.getItem(MODAL_STORAGE_KEY);

        if (!lastSeen) {
            return true;
        }

        const lastSeenTime = parseInt(lastSeen);
        const now = Date.now();
        const hoursPassed = (now - lastSeenTime) / (1000 * 60 * 60);

        return hoursPassed >= CONFIG.showAfterHours;
    }

    // Check if modal should be shown based on time (days) - legacy
    function shouldShowByDays() {
        const lastSeen = localStorage.getItem(MODAL_STORAGE_KEY);

        if (!lastSeen) {
            return true;
        }

        const lastSeenDate = new Date(parseInt(lastSeen));
        const now = new Date();
        const daysDiff = Math.floor((now - lastSeenDate) / (1000 * 60 * 60 * 24));

        return daysDiff >= (CONFIG.showAfterDays || 7);
    }

    // Check if modal should be shown based on visit count
    function shouldShowByVisits() {
        const visits = incrementVisitCount();
        return visits % CONFIG.showEveryNVisits === 0;
    }

    // Main check function
    function shouldShowModal() {
        // Priority 1: First time visitor - always show
        if (isFirstTimeVisitor()) {
            console.log('Modal shown: First time visitor');
            incrementVisitCount(); // Initialize visit count
            return true;
        }

        // Priority 2: Check if user donated recently
        if (hasRecentDonation()) {
            console.log('Modal hidden: User donated recently');
            return false;
        }

        // Check based on configured method
        switch (CONFIG.method) {
            case 'hours':
                // Show based on hours passed
                return shouldShowByTime();

            case 'days':
                // Show based on days passed (legacy)
                return shouldShowByDays();

            case 'visits':
                return shouldShowByVisits();

            case 'both':
                // Show if EITHER condition is met
                return shouldShowByTime() || shouldShowByVisits();

            case 'donation':
                // Only show if no recent donation (already checked above)
                return true;

            default:
                return shouldShowByTime();
        }
    }

    // Fetch total donation amount and recent supporter
    async function fetchDonationData() {
        try {
            // Determine API URL based on environment
            let API_URL;

            if (window.API_CONFIG && window.API_CONFIG.BACKEND_URL) {
                API_URL = window.API_CONFIG.BACKEND_URL;
            } else if (window.getBackendBaseURL && typeof window.getBackendBaseURL === 'function') {
                API_URL = window.getBackendBaseURL() + '/api';
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                API_URL = 'http://localhost:5000/api';
            } else {
                API_URL = 'https://a-phim-production-eba6.up.railway.app/api';
            }

            console.log('Fetching donation data from:', API_URL);

            // Fetch both statistics and recent supporters in parallel
            const [statsResponse, recentResponse] = await Promise.all([
                fetch(`${API_URL}/supporters/statistics`),
                fetch(`${API_URL}/supporters/recent?limit=1`)
            ]);

            const statsData = await statsResponse.json();
            const recentData = await recentResponse.json();

            return {
                totalAmount: (statsData.success && statsData.statistics) ? statsData.statistics.verifiedAmount || 0 : 0,
                latestSupporter: (recentData.success && recentData.supporters && recentData.supporters.length > 0) ? recentData.supporters[0] : null
            };
        } catch (error) {
            console.error('Error fetching donation data:', error);
            return {
                totalAmount: 0,
                latestSupporter: null
            };
        }
    }

    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN').format(amount);
    }

    // Format date time
    function formatDateTime(dateString) {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${hours}:${minutes} ${day}/${month}/${year}`;
    }

    // Create and show modal
    async function createModal() {
        // Preload fonts to avoid FOUT (Flash of Unstyled Text)
        if (!document.querySelector('link[href*="Material+Symbols+Outlined"]')) {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        // Fetch donation data
        const { totalAmount, latestSupporter } = await fetchDonationData();

        // Build latest supporter HTML
        let latestSupporterHTML = '';
        if (latestSupporter) {
            const initials = latestSupporter.name.substring(0, 2).toUpperCase();
            latestSupporterHTML = `
                <div class="w-full mb-4 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-green-500/10 border border-green-500/30 rounded-xl p-3 shadow-[0_0_25px_rgba(34,197,94,0.1)] backdrop-blur-sm">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-sm font-bold text-white shadow-lg flex-shrink-0">
                            ${initials}
                        </div>
                        <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <p class="text-white text-sm font-bold truncate">${latestSupporter.name}</p>
                            <p class="text-green-400 text-sm font-bold whitespace-nowrap">+${formatCurrency(latestSupporter.amount)} VNĐ</p>
                        </div>
                        <span class="material-symbols-outlined text-green-400 text-xl animate-pulse flex-shrink-0">favorite</span>
                    </div>
                    ${latestSupporter.message ? `
                    <div class="bg-white/5 rounded-lg p-2 mt-2">
                        <div class="flex gap-2">
                            <span class="text-gray-400 text-xs font-semibold whitespace-nowrap">Lời nhắn:</span>
                            <p class="text-gray-300 text-xs italic line-clamp-2 flex-1">"${latestSupporter.message}"</p>
                        </div>
                    </div>` : ''}
                    <div class="mt-2 text-[10px] text-gray-400 flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">schedule</span>
                            <span>Người ủng hộ mới nhất</span>
                        </div>
                        <span class="text-green-400 font-medium">${formatDateTime(latestSupporter.createdAt)}</span>
                    </div>
                </div>
            `;
        }

        const modalHTML = `
            <div id="welcome-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-lg" style="display: none;">
                <div class="relative w-full max-w-sm sm:max-w-md lg:max-w-lg bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-primary/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 shadow-[0_0_60px_rgba(242,242,13,0.15)] overflow-hidden group ring-1 ring-white/5 animate-fade-in max-h-[95vh] overflow-y-auto">
                    <!-- Animated background effects -->
                    <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                    <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s;"></div>
                    
                    <div class="relative z-10 flex flex-col items-center text-center">
                        <!-- Icon with glow effect -->
                        <div class="relative mb-4">
                            <div class="absolute inset-0 bg-gradient-to-br from-primary/30 to-red-500/30 rounded-2xl blur-lg animate-pulse"></div>
                            <div class="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 via-yellow-500/20 to-red-500/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(242,242,13,0.3)]">
                                <span class="material-symbols-outlined text-primary text-3xl sm:text-4xl font-light drop-shadow-[0_0_10px_rgba(242,242,13,0.8)] animate-pulse">volunteer_activism</span>
                            </div>
                        </div>
                        
                        <!-- Title -->
                        <h2 class="text-xl sm:text-2xl lg:text-3xl font-black mb-4 bg-gradient-to-r from-primary via-yellow-400 to-primary bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(242,242,13,0.5)] animate-gradient">
                            NUÔI WEB APHIM
                        </h2>
                        
                        <!-- Donation Stats Card -->
                        <div class="w-full mb-4 bg-gradient-to-br from-primary/10 via-yellow-500/5 to-primary/10 border border-primary/30 rounded-xl p-3 sm:p-4 shadow-[0_0_25px_rgba(242,242,13,0.1)] backdrop-blur-sm">
                            <div class="flex items-center justify-center gap-2 mb-1">
                                <span class="material-symbols-outlined text-primary text-lg sm:text-xl animate-pulse">payments</span>
                                <span class="text-gray-300 text-xs sm:text-sm font-semibold uppercase tracking-wide">Tổng tiền đã ủng hộ</span>
                            </div>
                            <div class="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-primary via-yellow-300 to-primary bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(242,242,13,0.6)]" id="total-donation-amount">
                                ${formatCurrency(totalAmount)} VNĐ
                            </div>
                            <div class="mt-1 text-[10px] sm:text-xs text-gray-400 flex items-center justify-center gap-1">
                                <span class="material-symbols-outlined text-green-400 text-xs">verified</span>
                                <span>Cập nhật thời gian thực</span>
                            </div>
                        </div>
                        
                        <!-- Latest Supporter Card -->
                        ${latestSupporterHTML}
                        
                        <!-- Message Box -->
                        <div class="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 mb-4 shadow-inner backdrop-blur-sm">
                            <p class="text-gray-200 leading-relaxed text-xs sm:text-sm font-light text-justify">
                                Để duy trì server phục vụ mọi người xem phim không quảng cáo, mình rất mong nhận được sự ủng hộ từ các bạn. Mọi người có thể mua gói hoặc ủng hộ để giúp duy trì website và cộng đồng xem phim chất lượng. Cảm ơn tất cả!
                            </p>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex flex-col gap-2.5 w-full">
                            <a href="pricing.html" class="group/btn px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary via-yellow-400 to-primary hover:from-yellow-400 hover:via-primary hover:to-yellow-400 text-black font-bold rounded-lg shadow-[0_0_25px_rgba(242,242,13,0.4)] hover:shadow-[0_0_40px_rgba(242,242,13,0.7)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 w-full uppercase tracking-wide text-xs sm:text-sm relative overflow-hidden">
                                <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700"></span>
                                <span class="material-symbols-outlined relative z-10 text-lg">shopping_cart</span>
                                <span class="relative z-10">Mua Gói</span>
                            </a>
                            <a href="support.html" class="group/btn px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 via-red-600 to-red-500 hover:from-red-600 hover:via-red-500 hover:to-red-600 text-white font-bold rounded-lg shadow-[0_0_25px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.7)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 w-full uppercase tracking-wide text-xs sm:text-sm relative overflow-hidden">
                                <span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700"></span>
                                <span class="material-symbols-outlined animate-pulse relative z-10 text-lg">favorite</span>
                                <span class="relative z-10">Ủng Hộ</span>
                            </a>
                            <button id="modal-close-btn" class="px-5 sm:px-6 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-lg border border-white/20 hover:border-white/40 transition-all cursor-pointer text-center w-full tracking-wide text-xs sm:text-sm uppercase backdrop-blur-sm">
                                Đã Hiểu
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fade-in {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out;
            }
            @keyframes pulse-slow {
                0%, 100% {
                    opacity: 0.3;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.5;
                    transform: scale(1.05);
                }
            }
            .animate-pulse-slow {
                animation: pulse-slow 4s ease-in-out infinite;
            }
            @keyframes gradient {
                0%, 100% {
                    background-position: 0% 50%;
                }
                50% {
                    background-position: 100% 50%;
                }
            }
            .animate-gradient {
                background-size: 200% auto;
                animation: gradient 3s ease infinite;
            }
        `;
        document.head.appendChild(style);

        // Show modal
        const modal = document.getElementById('welcome-modal');
        modal.style.display = 'flex';

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Close button handler
        document.getElementById('modal-close-btn').addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Close modal
    function closeModal() {
        const modal = document.getElementById('welcome-modal');
        modal.style.display = 'none';
        document.body.style.overflow = '';

        // Save to localStorage
        localStorage.setItem(MODAL_STORAGE_KEY, Date.now().toString());
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function () {
        // Kiểm tra enabled trước
        if (!CONFIG.enabled) {
            console.log('Notification modal disabled');
            return;
        }

        if (shouldShowModal()) {
            // Delay showing modal slightly for better UX
            setTimeout(createModal, 500);
        }
    });

    // Debug function (can be called from console)
    window.aphimDebugModal = function () {
        console.log('Modal Configuration:', CONFIG);
        console.log('Is first time visitor:', isFirstTimeVisitor());

        const lastSeen = localStorage.getItem(MODAL_STORAGE_KEY);
        console.log('Last seen:', lastSeen);

        if (lastSeen) {
            const hoursPassed = (Date.now() - parseInt(lastSeen)) / (1000 * 60 * 60);
            const daysPassed = hoursPassed / 24;
            console.log(`Time passed: ${hoursPassed.toFixed(2)} hours (${daysPassed.toFixed(2)} days)`);
        }

        console.log('Visit count:', localStorage.getItem(VISIT_COUNT_KEY));
        console.log('Donation confirmed:', localStorage.getItem(DONATION_CONFIRMED_KEY));
        console.log('Should show:', shouldShowModal());
        console.log('Has recent donation:', hasRecentDonation());
    };

    // Reset function for testing
    window.aphimResetModal = function () {
        localStorage.removeItem(MODAL_STORAGE_KEY);
        localStorage.removeItem(DONATION_CONFIRMED_KEY);
        localStorage.removeItem(VISIT_COUNT_KEY);
        console.log('Modal data reset. Reload page to see modal.');
    };
})();
