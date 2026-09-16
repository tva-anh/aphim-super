// Admin Dashboard Script - Modernized with Auto-discovery & Real-time hooks
let API_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api';
let SOCKET_URL = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : window.location.origin;
let socket;
let charts = {};
let dashboardData = null;

// Auto-discovery logic for API
async function discoverAPI() {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    // In production (aphim.io.vn), always prioritize the config URL
    if (host !== 'localhost' && host !== '127.0.0.1' && typeof API_CONFIG !== 'undefined') {
        API_URL = API_CONFIG.BACKEND_URL;
        SOCKET_URL = window.getBackendBaseURL();
        console.log(`🚀 Production Domain detected, using API: ${API_URL}`);
        updateConnectionStatus(true, API_URL);
        return API_URL;
    }

    const potentialUrls = [
        API_URL, // Try the one from config.js first
        `${protocol}//${host}:5000/api`,
        `http://localhost:5000/api`,
        `http://127.0.0.1:5000/api`
    ];

    for (const url of potentialUrls) {
        try {
            console.log(`🔍 Checking Dashboard API at: ${url}`);
            const resp = await fetch(`${url}/health`, { 
                method: 'GET',
                signal: AbortSignal.timeout(1500) 
            });
            if (resp.ok) {
                API_URL = url;
                if (url.includes(':5000')) SOCKET_URL = url.replace('/api', '');
                console.log(`✅ API Found & Selected: ${API_URL}`);
                updateConnectionStatus(true, url);
                return url;
            }
        } catch (e) { /* silent fail */ }
    }
    updateConnectionStatus(false);
    return API_URL;
}

document.addEventListener('DOMContentLoaded', async function () {
    if (checkAdminAuth()) {
        await discoverAPI();
        initSocket();
        loadDashboardStats();
        
        // Start a slow heartbeat for health status
        setInterval(checkHealth, 30000);
    }
});

function checkAdminAuth() {
    const tokenKey = (typeof ADMIN_STORAGE_KEYS !== 'undefined') ? ADMIN_STORAGE_KEYS.ADMIN_TOKEN : 'cinestream_admin_token';
    const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey) || localStorage.getItem('cinestream_admin_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return false;
    }
    return true;
}

async function checkHealth() {
    try {
        const resp = await fetch(`${API_URL}/health`);
        updateConnectionStatus(resp.ok, API_URL);
    } catch (e) {
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(isOnline, url = '') {
    const statusDot = document.getElementById('apiStatusDot');
    const statusText = document.getElementById('apiStatusText');
    if (!statusDot || !statusText) return;

    if (isOnline) {
        statusDot.style.background = '#10b981';
        statusDot.classList.add('online');
        statusText.textContent = 'API Connected';
        statusText.title = `Connected to ${url}`;
    } else {
        statusDot.style.background = '#ef4444';
        statusText.textContent = 'API Offline';
        statusDot.classList.remove('online');
    }
}

// --- Real-time Socket.io Integration ---
function initSocket() {
    try {
        if (socket) socket.disconnect();
        
        socket = io(SOCKET_URL, {
            path: '/socket.io/',
            transports: ['polling', 'websocket']
        });
        
        socket.on('connect', () => {
            console.log('✅ Connected to Dashboard Realtime Server');
            updateConnectionStatus(true, API_URL);
        });

        socket.on('new_activity', (activity) => {
            console.log('🚀 Real-time Activity:', activity);
            addNewActivityUI(activity);
            loadDashboardStats(true); // Refresh stats on any activity
        });

        socket.on('disconnect', () => {
            console.warn('❌ Disconnected from Realtime Server');
        });
    } catch (e) {
        console.error('Socket.io Error:', e);
    }
}

// --- Data Loading ---
async function loadDashboardStats(silent = false) {
    try {
        const statusText = document.getElementById('apiStatusText');
        const tokenKey = (typeof ADMIN_STORAGE_KEYS !== 'undefined') ? ADMIN_STORAGE_KEYS.ADMIN_TOKEN : 'cinestream_admin_token';
        const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey) || localStorage.getItem('cinestream_admin_token');
        
        console.log(`📊 Fetching stats from: ${API_URL}/dashboard/stats`);
        const response = await fetch(`${API_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('📊 Dashboard Data Received:', result.data);
                dashboardData = result.data; // Store for details
                updateOverviewUI(result.data.overview, result.data.topSpending);
                renderCharts(result.data.charts);
                renderRecentActivities(result.data.recentActivities);
                if (statusText) statusText.textContent = 'API Connected & Data Loaded';
            }
        } else {
            console.error('Failed to load stats:', response.status);
            if (statusText) statusText.textContent = `API Error: ${response.status}`;
        }
    } catch (error) {
        console.error('loadDashboardStats Error:', error);
        const statusText = document.getElementById('apiStatusText');
        if (statusText) statusText.textContent = `Conn Error: ${error.message}`;
    }
}

function updateOverviewUI(overview, topSpending) {
    if (!overview) return;
    const { totalUsers, totalMovies, globalMovieCount, totalRevenue, growth } = overview;
    
    // Update main numbers with animation
    if (totalUsers !== undefined) animateValue('totalUsers', totalUsers);
    if (totalRevenue !== undefined) document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    
    // New metrics
    if (growth && growth.spentXu !== undefined) animateValue('totalSpentXu', growth.spentXu);
    
    if (topSpending && topSpending.length > 0) {
        const topEl = document.getElementById('topSpentName');
        if (topEl) topEl.textContent = topSpending[0].name;
    }

    // Membership count - using real data from backend
    if (overview.membership) {
        const premiumCount = (overview.membership.premium || 0) + (overview.membership.family || 0);
        animateValue('premiumCount', premiumCount);
    }

    // Update top hero welcome numbers
    const heroMovies = document.getElementById('heroTotalMovies');
    const heroUsers = document.getElementById('heroTotalUsers');
    if (heroMovies && totalMovies !== undefined) heroMovies.textContent = totalMovies.toLocaleString();
    if (heroUsers && totalUsers !== undefined) heroUsers.textContent = totalUsers.toLocaleString();

    // Growth Badges
    if (growth) {
        if (growth.users !== undefined) updateGrowthBadge('totalUsersChange', growth.users);
        if (growth.revenue !== undefined) updateGrowthBadge('totalRevenueChange', growth.revenue);
    }
}

function updateGrowthBadge(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const isPositive = value >= 0;
    el.textContent = (isPositive ? '+' : '') + value + '%';
    el.className = `stat-badge ${isPositive ? 'positive' : 'negative'}`;
}

// --- Charting ---
function renderCharts(chartData) {
    if (!chartData) return;
    renderLineChart('revenueChart', chartData.revenue.labels, chartData.revenue.data, '#10b981');
    renderLineChart('viewsChart', chartData.views.labels, chartData.views.data, '#6366f1');

    // Sparklines for visual pulse
    renderSparkline('usersSparkline', [30, 45, 35, 50, 65, 60, 75], '#3b82f6');
    renderSparkline('revenueSparkline', [40, 60, 50, 80, 70, 100, 110], '#10b981');
    renderSparkline('spentXuSparkline', [20, 40, 60, 45, 80, 95, 85], '#fbbf24');
    renderSparkline('topCategorySparkline', [10, 20, 15, 30, 25, 40, 35], '#a78bfa');
    renderSparkline('membershipSparkline', [5, 10, 15, 12, 20, 25, 22], '#ec4899');
}

function renderLineChart(id, labels, data, color) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: color + '15',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
            }
        }
    });
}

function renderSparkline(id, data, color) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: new Array(data.length).fill(''),
            datasets: [{
                data: data,
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

// --- Activities ---
function renderRecentActivities(activities) {
    const container = document.getElementById('recentActivities');
    if (!container) return;
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 30px; color: var(--text-muted);">Hệ thống chưa có hoạt động mới</div>';
        return;
    }
    container.innerHTML = activities.map(act => createActivityHTML(act)).join('');
    if (window.lucide) lucide.createIcons();
}

function createActivityHTML(act) {
    const time = new Date(act.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(act.time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `
        <div class="activity-card-new ${act.type}">
            <div style="width:40px; height:40px; border-radius:10px; background:var(--${act.color}-bg); color:var(--${act.color}); display:flex; align-items:center; justify-content:center; flex-shrink: 0;">
                <i data-lucide="${act.icon}"></i>
            </div>
            <div style="flex:1; min-width:0">
                <p style="font-size: 13px; color: var(--text-primary); line-height: 1.5; margin-bottom: 4px;">${act.message}</p>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size: 11px; color: var(--text-muted);"><i data-lucide="clock" style="width:10px; height:10px; display:inline-block; margin-right:3px"></i>${time} - ${date}</span>
                    ${act.user ? `<span style="font-size: 10px; background: var(--surface-3); padding: 1px 6px; border-radius: 4px; color: var(--text-secondary)">${act.user.name}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function addNewActivityUI(activity) {
    const container = document.getElementById('recentActivities');
    if (!container) return;
    
    // Remove placeholder empty state if exists
    if (container.innerHTML.includes('chưa có hoạt động mới')) container.innerHTML = '';

    const div = document.createElement('div');
    div.innerHTML = createActivityHTML(activity);
    const newEl = div.firstElementChild;
    newEl.style.opacity = '0';
    newEl.style.transform = 'translateY(-10px)';
    
    container.insertBefore(newEl, container.firstChild);
    setTimeout(() => {
        newEl.style.transition = 'all 0.4s ease';
        newEl.style.opacity = '1';
        newEl.style.transform = 'translateY(0)';
        if (window.lucide) lucide.createIcons();
    }, 50);

    if (container.children.length > 20) container.removeChild(container.lastChild);
}

// --- Utilities ---
function animateValue(id, endValue) {
    const obj = document.getElementById(id);
    if (!obj) return;
    const currentText = obj.textContent.replace(/,/g, '');
    const startValue = parseInt(currentText) || 0;
    if (startValue === endValue) {
        obj.textContent = endValue.toLocaleString();
        return;
    }
    const duration = 1200;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (endValue - startValue) + startValue);
        obj.textContent = current.toLocaleString();
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

// --- Detail Modal ---
window.showStatDetail = function(type) {
    const overlay = document.getElementById('statsDetailOverlay');
    const title = document.getElementById('detailModalTitle');
    const body = document.getElementById('detailModalBody');
    if (!overlay || !dashboardData) return;

    overlay.style.display = 'flex';
    body.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    setTimeout(() => {
        switch(type) {
            case 'users':
                title.textContent = 'Phân tích người dùng';
                body.innerHTML = `
                    <div class="detail-item"><span>Tổng đăng ký</span><strong>${dashboardData.overview.totalUsers}</strong></div>
                    <div class="detail-item"><span>Tăng trưởng tháng</span><strong>+${dashboardData.overview.growth.users}%</strong></div>
                    <div class="detail-item"><span>Hoạt động hôm nay</span><strong>${Math.floor(dashboardData.overview.totalUsers * 0.4)}</strong></div>
                `;
                break;
            case 'revenue':
                title.textContent = 'Chi tiết doanh thu';
                body.innerHTML = `
                    <div class="detail-item"><span>Tổng doanh thu tháng</span><strong>${formatCurrency(dashboardData.overview.totalRevenue)}</strong></div>
                    <div class="detail-item"><span>Tăng trưởng</span><strong>+${dashboardData.overview.growth.revenue}%</strong></div>
                    <div style="margin-top:20px; font-size:12px; color:var(--text-muted);">Gần đây:</div>
                    ${(dashboardData.recentActivities || []).filter(a => a.type === 'payment').slice(0, 5).map(p => `
                        <div class="detail-item" style="font-size:11px;">
                            <span>${p.message}</span>
                            <strong>${new Date(p.time).toLocaleDateString()}</strong>
                        </div>
                    `).join('')}
                `;
                break;
            case 'spentXu':
                title.textContent = 'Phân tích Xu tiêu thụ';
                body.innerHTML = `
                    <div class="detail-item"><span>Tổng Xu đã tiêu</span><strong>${dashboardData.overview.growth.spentXu.toLocaleString()} Xu</strong></div>
                    <div class="detail-item"><span>Trung bình mỗi user</span><strong>${Math.floor(dashboardData.overview.growth.spentXu / dashboardData.overview.totalUsers).toLocaleString()} Xu</strong></div>
                `;
                break;
            case 'topCategories':
                title.textContent = 'Hạng mục tiêu thụ chính';
                body.innerHTML = (dashboardData.topSpending || []).map(cat => `
                    <div class="detail-item">
                        <div>
                            <div style="font-weight:700;">${cat.name}</div>
                            <div style="font-size:10px; color:var(--text-muted);">${cat.count} giao dịch</div>
                        </div>
                        <strong style="color:#fbbf24">${cat.value.toLocaleString()} Xu</strong>
                    </div>
                `).join('') || '<p>Chưa có dữ liệu</p>';
                break;
            case 'membership':
                title.textContent = 'Thống kê Hội viên';
                const m = dashboardData.overview.membership || { premium: 0, family: 0, free: 0 };
                const totalM = m.premium + m.family + m.free || 1;
                const convRate = Math.round(((m.premium + m.family) / totalM) * 100);
                body.innerHTML = `
                    <div class="detail-item"><span>Gói Premium (4K)</span><strong style="color:#fbbf24">${m.premium.toLocaleString()}</strong></div>
                    <div class="detail-item"><span>Gói Family (👨‍👩‍👧‍👦)</span><strong style="color:#a855f7">${m.family.toLocaleString()}</strong></div>
                    <div class="detail-item"><span>Tài khoản Free</span><strong>${m.free.toLocaleString()}</strong></div>
                    <div class="detail-item"><span>Tỷ lệ chuyển đổi</span><strong>${convRate}%</strong></div>
                `;
                break;
        }
        if (window.lucide) lucide.createIcons();
    }, 300);
}
