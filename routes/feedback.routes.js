/**
 * =========================================================================
 * APHIM SUPER — FEEDBACK & BÁO LỖI PHIM API ROUTE
 * =========================================================================
 * POST /api/feedback  — Nhận dữ liệu từ form báo lỗi / liên hệ
 * GET  /api/feedbacks — Xem danh sách feedback (debug)
 * GET  /api/test-sheet — Test kết nối Google Sheet
 */

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

// Đường dẫn lưu backup local
const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'feedbacks.json');

/** Đảm bảo thư mục data tồn tại */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Đọc danh sách feedback */
function readFeedbacks() {
  ensureDataDir();
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/** Ghi thêm 1 feedback vào file */
function saveFeedback(data) {
  const list = readFeedbacks();
  list.push(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

/**
 * Gửi dữ liệu tới Google Apps Script Webhook.
 * Thử POST trước, nếu lỗi thì fallback GET.
 */
async function sendToGoogleSheet(data) {
  const WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBAPP_URL;
  if (!WEBHOOK_URL) {
    console.warn('[Feedback] ⚠️  GOOGLE_SHEET_WEBAPP_URL chưa được đặt trong .env');
    return { sent: false, reason: 'No WEBHOOK_URL' };
  }

  // --- Thử POST ---
  try {
    const res = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
      signal:  AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    const text = await res.text();
    console.log('[Feedback] POST response:', res.status, text.substring(0, 200));

    // Nếu trả về HTML nghĩa là bị redirect đăng nhập → thử GET
    if (text.trim().startsWith('<')) {
      throw new Error('Google trả về HTML (bị redirect), thử GET...');
    }
    return { sent: true, method: 'POST', status: res.status, body: text };
  } catch (postErr) {
    console.warn('[Feedback] POST failed:', postErr.message);
  }

  // --- Fallback GET ---
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined) params.set(k, String(v));
    }
    const getUrl = `${WEBHOOK_URL}?${params.toString()}`;
    const res    = await fetch(getUrl, {
      signal:  AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    const text = await res.text();
    console.log('[Feedback] GET response:', res.status, text.substring(0, 200));
    return { sent: true, method: 'GET', status: res.status, body: text };
  } catch (getErr) {
    console.error('[Feedback] GET cũng thất bại:', getErr.message);
    return { sent: false, reason: getErr.message };
  }
}

// ==========================================
// POST /api/feedback
// ==========================================
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    console.log('[Feedback] Nhận dữ liệu:', body);

    // Lưu backup local
    const record = { ...body, createdAt: new Date().toISOString() };
    saveFeedback(record);

    // Gửi lên Google Sheet
    const sheetResult = await sendToGoogleSheet(record);
    console.log('[Feedback] Kết quả Google Sheet:', sheetResult);

    return res.json({
      success: true,
      message: 'Đã ghi nhận phản hồi!',
      sheetResult,
    });
  } catch (err) {
    console.error('[Feedback] Lỗi server:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// GET /api/feedbacks  — xem danh sách (debug)
// ==========================================
router.get('/list', (req, res) => {
  const list = readFeedbacks();
  res.json({ success: true, count: list.length, data: list });
});

// ==========================================
// GET /api/feedback/test-sheet — kiểm tra kết nối
// ==========================================
router.get('/test-sheet', async (req, res) => {
  const WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBAPP_URL;
  if (!WEBHOOK_URL) {
    return res.json({ success: false, error: 'GOOGLE_SHEET_WEBAPP_URL chưa đặt trong .env' });
  }

  try {
    const r    = await fetch(WEBHOOK_URL, { signal: AbortSignal.timeout(10000) });
    const text = await r.text();
    const isOk = !text.trim().startsWith('<'); // HTML = lỗi redirect
    return res.json({
      success: isOk,
      status:  r.status,
      message: isOk ? text.substring(0, 300) : 'Google trả HTML → script chưa public "Anyone"',
      url:     WEBHOOK_URL,
    });
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});

module.exports = router;
