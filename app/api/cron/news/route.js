import { db } from '@/lib/db';

const RSS_FEEDS = [
  { name: 'CoinDesk',      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'Decrypt',       url: 'https://decrypt.co/feed' },
  { name: 'Bitcoin.com',   url: 'https://news.bitcoin.com/feed/' },
  { name: 'CryptoNews',    url: 'https://cryptonews.com/news/feed/' },
  { name: 'The Block',     url: 'https://www.theblock.co/rss.xml' },
];

function parseRSS(xml, sourceName) {
  const articles = [];
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  items.slice(0, 10).forEach(item => {
    const get = (tag) => {
      const m = item.match(new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>|<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>'));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    const url   = (get('link') || item.match(/<link>([^<]*)<\/link>/)?.[1] || '').trim();
    const pub   = get('pubDate') || get('dc:date');
    const desc  = get('description').replace(/<[^>]+>/g, '').slice(0, 200);
    const imgM  = item.match(/url="([^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i) || item.match(/<img[^>]*src="([^"]+)"/i);
    const image = imgM ? imgM[1] : '';
    if (title && url) {
      articles.push({
        source: sourceName, title: title.slice(0, 300), url,
        image_url: image, summary: desc,
        published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      });
    }
  });
  return articles;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allArticles = [];
  const failed = [];

  await Promise.allSettled(RSS_FEEDS.map(async feed => {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 CryptoClassroom RSS Reader' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const articles = parseRSS(await res.text(), feed.name);
      allArticles.push(...articles);
    } catch (e) { failed.push({ feed: feed.name, error: e.message }); }
  }));

  if (allArticles.length > 0)
    await db.from('news_articles').upsert(allArticles, { onConflict: 'url', ignoreDuplicates: true });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.from('news_articles').delete().lt('fetched_at', cutoff);

  return Response.json({ success: true, fetched: allArticles.length, failed });
}
