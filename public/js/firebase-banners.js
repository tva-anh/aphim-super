// Banner Firebase configuration (a-phim-config)
const firebaseConfigBanners = {
  apiKey: "AIzaSyCbI3KnCvfDQdFISYZ9qDj48D2yx-xjtkY",
  authDomain: "a-phim-config.firebaseapp.com",
  projectId: "a-phim-config",
  storageBucket: "a-phim-config.firebasestorage.app",
  messagingSenderId: "248477289615",
  appId: "1:248477289615:web:15b5e36fdfe4184f8974fa",
  measurementId: "G-8XBK7QGQ0F"
};

// Khởi tạo Firebase App với tên riêng biệt để không xung đột với các app khác
let bannerApp;
let bannerDb;

function initFirebaseBanners() {
    if (bannerApp && bannerDb) return true;
    if (typeof firebase === 'undefined') {
        console.warn("Firebase SDK chưa được tải (đang chờ...)");
        return false;
    }
    
    try {
        const existingApp = firebase.apps.find(a => a.name === "aphim-config-banners");
        if (existingApp) {
            bannerApp = existingApp;
        } else {
            bannerApp = firebase.initializeApp(firebaseConfigBanners, "aphim-config-banners");
        }
        bannerDb = bannerApp.firestore();
        return true;
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        return false;
    }
}

// Đưa ra global để hero-banner.js sử dụng
window.firebaseBanners = {
    // Push mảng banner lên Firebase
    syncToFirebase: async function(banners) {
        if (!initFirebaseBanners()) return;
        try {
            await bannerDb.collection("site_config").doc("hero_banners").set({
                list: banners,
                updatedAt: new Date().toISOString()
            });
            console.log("Successfully synced banners to Firebase.");
        } catch (e) {
            console.error("Error syncing to Firebase:", e);
        }
    },

    // Lắng nghe thay đổi banner realtime
    listen: function(callback) {
        // Nếu SDK chưa sẵn sàng, thử lại sau một chút
        if (!initFirebaseBanners()) {
            setTimeout(() => this.listen(callback), 100);
            return () => {};
        }
        
        return bannerDb.collection("site_config").doc("hero_banners").onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const data = docSnap.data();
                console.log("Firebase Banners Update Received!");
                callback(data.list || []);
            } else {
                console.log("No banner document found, passing empty list.");
                callback([]);
            }
        }, (error) => {
            console.error("Error listening to banners:", error);
        });
    }
};
