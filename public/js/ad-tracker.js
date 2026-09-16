/*!
 * A Phim Ad Tracker v1.0
 * Nhúng vào MỌI trang có banner DT99
 * Tự động bắt click → log lên Firebase aphim-partner-analytics
 *
 * CÁCH DÙNG: Thêm attribute vào thẻ <a> của banner:
 *   <a href="https://dt56789.com/"
 *      data-ap-banner="true"
 *      data-ap-slot="header-top"
 *      data-ap-name="Banner DT99"
 *      target="_blank">...</a>
 */
(function () {
    'use strict';

    var TRACKER_CFG = {
        apiKey: "AIzaSyDwOueSgntfwSWgFKRJaIyvrIcw7X5Eedg",
        authDomain: "aphim-partner-analytics.firebaseapp.com",
        projectId: "aphim-partner-analytics",
        storageBucket: "aphim-partner-analytics.firebasestorage.app",
        messagingSenderId: "546197076852",
        appId: "1:546197076852:web:31aa2ee015028b3fb18a21"
    };
    var APP_NAME = 'ap-tracker';

    function getDB() {
        if (typeof firebase === 'undefined') return null;
        var app = firebase.apps.find(function(a) { return a.name === APP_NAME; });
        if (!app) app = firebase.initializeApp(TRACKER_CFG, APP_NAME);
        return app.firestore();
    }

    function isMobile() {
        return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    }

    function dateKey(d) { return d.toISOString().slice(0, 10); }

    function logClick(bannerEl) {
        var db = getDB();
        if (!db) return;

        var now = new Date();
        var dk = dateKey(now);
        var slot = bannerEl.dataset.apSlot || 'unknown';
        var bname = bannerEl.dataset.apName || 'Banner';
        var dest = bannerEl.href || bannerEl.dataset.apDest || '';
        var device = isMobile();

        // Raw event log
        db.collection('dt99_clicks').add({
            ts: now.getTime(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            pageUrl: location.href,
            pagePath: location.pathname,
            pageTitle: document.title,
            bannerSlot: slot,
            bannerName: bname,
            destinationUrl: dest,
            device: device,
            dateKey: dk,
            hourKey: now.getHours(),
            minuteKey: now.getMinutes()
        }).catch(function () {});

        // Daily aggregation doc  
        var inc = firebase.firestore.FieldValue.increment(1);
        var dayData = {
            dateKey: dk,
            total: inc,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        };
        dayData['banner_' + slot] = inc;
        dayData['hour_' + now.getHours()] = inc;
        dayData['device_' + device] = inc;
        var pageKey = location.pathname.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
        dayData['page_' + pageKey] = inc;

        db.collection('dt99_daily').doc(dk).set(dayData, { merge: true }).catch(function () {});
    }

    function attachBanner(el) {
        if (el.dataset.apTracked) return;
        el.dataset.apTracked = '1';
        el.addEventListener('click', function () { logClick(this); }, { passive: true });
    }

    function scanBanners() {
        document.querySelectorAll('[data-ap-banner]').forEach(attachBanner);
    }

    function init() {
        if (typeof firebase === 'undefined') { setTimeout(init, 600); return; }
        scanBanners();
        // Watch for dynamic banners
        var obs = new MutationObserver(scanBanners);
        obs.observe(document.body, { childList: true, subtree: true });
        console.log('[AP Tracker v1] ✓ Active on', location.pathname);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
