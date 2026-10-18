const fs = require('fs');
const axios = require('axios');

const html = fs.readFileSync('scripts/narto_ep1.html', 'utf-8');

const match = html.match(/episodeItemsRaw\s*=\s*(\[[\s\S]*?\]);/);
if (match) {
    const episodes = JSON.parse(match[1]);
    console.log('Total episodes extracted:', episodes.length);
    console.log('Episode 1:', {
        number: episodes[0].number,
        title: episodes[0].title,
        play_url: episodes[0].play_url,
        thumb_url: episodes[0].thumb_url
    });
    console.log('Episode 2:', {
        number: episodes[1].number,
        title: episodes[1].title,
        play_url: episodes[1].play_url
    });
    console.log('Last Episode:', {
        number: episodes[episodes.length - 1].number,
        title: episodes[episodes.length - 1].title,
        play_url: episodes[episodes.length - 1].play_url
    });

    // Test first 3 episodes stream headers
    (async () => {
        for (let i = 0; i < 3; i++) {
            const ep = episodes[i];
            try {
                const res = await axios.get(ep.play_url, {
                    headers: { 'Range': 'bytes=0-100' }
                });
                console.log(`Episode ${ep.number} Stream Status:`, res.status, 'Type:', res.headers['content-type'], 'CORS:', res.headers['access-control-allow-origin']);
            } catch(e) {
                console.error(`Episode ${ep.number} error:`, e.message);
            }
        }
    })();
} else {
    console.log('No episodeItemsRaw match');
}
