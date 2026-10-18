/**
 * scripts/translate-titles.js
 * Tu dong dich title phim ngan tu tieng Trung sang tieng Viet bang Gemini AI
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAb8RN6IajsuCBtlRdyinQkL_-AFiSkgnn4wpVmfeA1CGLS31og';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function translateTitle(chineseTitle) {
    try {
        const prompt = `Dịch tên phim ngắn Trung Quốc sau sang tiếng Việt tự nhiên, súc tích (dưới 60 ký tự). CHỈ trả về tên phim đã dịch, KHÔNG giải thích:

"${chineseTitle}"

Ví dụ:
- "四宝来袭爹地太难缠" -> "Tứ Bảo Lai Tập: Ba Ba Quá Khó Chiều"
- "萌宝来袭妈咪快接招" -> "Manh Bảo Đến Rồi: Mẹ Ơi Nhanh Tay"
`;

        const res = await axios.post(`${GEMINI_API}?key=${GEMINI_API_KEY}`, {
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }]
        }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            let translated = res.data.candidates[0].content.parts[0].text.trim();
            // Remove quotes if present
            translated = translated.replace(/^["']|["']$/g, '');
            return translated;
        }

        return null;
    } catch (err) {
        console.error(`  Loi dich "${chineseTitle}":`, err.message);
        return null;
    }
}

async function translateAllTitles() {
    console.log('Bat dau dich title phim ngan sang tieng Viet...\n');
    
    // Load seeds
    if (!fs.existsSync(SEEDS_PATH)) {
        console.error('Khong tim thay file seeds!');
        return;
    }

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf-8'));
    const allDramas = [...(seeds.rank || []), ...(seeds.catalog || [])];
    
    console.log(`Tong so phim: ${allDramas.length}\n`);

    let translated = 0;
    let skipped = 0;

    for (let i = 0; i < allDramas.length; i++) {
        const drama = allDramas[i];
        const progress = `[${i + 1}/${allDramas.length}]`;

        // Skip if already Vietnamese
        if (drama.title && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(drama.title)) {
            console.log(`${progress} SKIP: ${drama.title} (da dich)`);
            skipped++;
            continue;
        }

        console.log(`${progress} Dang dich: ${drama.title}`);

        const vietnameseTitle = await translateTitle(drama.title);
        
        if (vietnameseTitle) {
            drama.title = vietnameseTitle;
            console.log(`${progress} -> ${vietnameseTitle}`);
            translated++;
        } else {
            console.log(`${progress} -> LOI (giu nguyen)`);
        }

        // Delay to avoid rate limit (1.5s between requests)
        if (i < allDramas.length - 1) {
            await delay(1500);
        }
    }

    // Save updated seeds
    if (seeds.rank) seeds.rank = allDramas.slice(0, seeds.rank.length);
    if (seeds.catalog) seeds.catalog = allDramas.slice(seeds.rank ? seeds.rank.length : 0);
    seeds.timestamp = Date.now();
    seeds.updatedAt = new Date().toISOString();

    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seeds, null, 2), 'utf-8');

    console.log(`\n\nHOAN TAT!`);
    console.log(`Da dich: ${translated} phim`);
    console.log(`Bo qua: ${skipped} phim (da tieng Viet)`);
    console.log(`Tong: ${allDramas.length} phim`);
}

// Run
translateAllTitles().catch(console.error);