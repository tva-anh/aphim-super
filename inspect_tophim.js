const axios = require('axios');

async function test() {
  const res = await axios.get('https://tophim.vip/phim/100-ngay-lua-doi-phan-1', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = res.data;
  console.log('Includes iframe:', html.includes('<iframe'));
  const iframes = html.match(/<iframe[^>]+src="([^"]+)"/gi);
  console.log('Iframes:', iframes);

  // Tìm __NEXT_DATA__
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    const json = JSON.parse(nextMatch[1]);
    const movie = json.props?.pageProps?.movie || json.props?.pageProps?.data;
    console.log('Movie keys:', Object.keys(movie || {}));
    const ep1 = movie?.episodes?.[0]?.server_data?.[0];
    console.log('Tophim ep1:', ep1);
  }
}
test().then(() => process.exit(0));
