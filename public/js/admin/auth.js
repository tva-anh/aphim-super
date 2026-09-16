// Admin Authentication Service
class AdminAuthService {
    constructor() {
        // Don't auto-check on construction to prevent redirect loops
        // Pages will manually call checkAuth() if needed
    }

    // Check if admin is logged in
    isLoggedIn() {
        const aphimToken = localStorage.getItem('aphim_admin_token');
        const backendToken = localStorage.getItem('cinestream_admin_token');
        const localToken = typeof ADMIN_STORAGE_KEYS !== 'undefined' ? localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN) : null;
        return aphimToken !== null || backendToken !== null || localToken !== null;
    }

    // Login admin
    login(username, password) {
        if (typeof ADMIN_CONFIG !== 'undefined' && username === ADMIN_CONFIG.ADMIN_CREDENTIALS.username &&
            password === ADMIN_CONFIG.ADMIN_CREDENTIALS.password) {

            const token = btoa(JSON.stringify({
                username,
                timestamp: Date.now()
            }));

            localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN, token);
            return { success: true };
        }

        return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
    }

    // Logout admin
    logout() {
        // Remove tokens
        localStorage.removeItem('aphim_admin_token');
        localStorage.removeItem('aphim_admin_user');
        localStorage.removeItem('cinestream_admin_token');
        localStorage.removeItem('cinestream_admin_user');
        if (typeof ADMIN_STORAGE_KEYS !== 'undefined') localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
        if (!window.location.pathname.includes('/admin/login')) {
            window.location.href = '/admin/login';
        }
    }

    // Check authentication and redirect if needed
    checkAuth() {
        const currentPage = window.location.pathname;
        const isLoginPage = currentPage.includes('/admin/login');
        const isLoggedIn = this.isLoggedIn();

        if (!isLoggedIn && !isLoginPage) {
            window.location.href = '/admin/login';
        }
    }

    // Get admin info
    getAdminInfo() {
        const token = localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
        if (!token) return null;

        try {
            return JSON.parse(atob(token));
        } catch (e) {
            return null;
        }
    }
}

// Initialize Admin Auth Service
const adminAuthService = new AdminAuthService();
