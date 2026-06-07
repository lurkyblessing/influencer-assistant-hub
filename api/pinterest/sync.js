export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, handle } = req.body;

  if (platform !== 'Pinterest') {
    return res.status(400).json({ error: 'This endpoint is for Pinterest RSS sync only.' });
  }

  if (!handle) {
    return res.status(400).json({ error: 'Pinterest username handle is required.' });
  }

  try {
    const cleanHandle = handle.replace('@', '').trim();
    const rssUrl = `https://www.pinterest.com/${cleanHandle}/feed.rss`;

    const response = await fetch(rssUrl);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Pinterest user '${cleanHandle}' not found or has no public pins.`);
      }
      throw new Error(`Failed to fetch Pinterest feed. Status: ${response.status}`);
    }

    const xmlData = await response.text();

    // Very basic regex-based XML parsing to extract <item> blocks
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlData)) !== null) {
      const itemBlock = match[1];

      const titleMatch = itemBlock.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemBlock.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemBlock.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const descMatch = itemBlock.match(/<description>([\s\S]*?)<\/description>/);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Pinterest Pin';
      const link = linkMatch ? linkMatch[1].trim() : '';
      let pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
      
      // Convert standard RSS date format to YYYY-MM-DD
      try {
        pubDate = new Date(pubDate).toISOString().split('T')[0];
      } catch (e) {
        pubDate = new Date().toISOString().split('T')[0];
      }

      // Extract image from description if it exists (usually inside <img src="...">)
      const desc = descMatch ? descMatch[1] : '';
      const imgMatch = desc.match(/src="([^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : '';

      // We extract the Pin ID from the link to use as our unique ID
      const pinIdMatch = link.match(/\/pin\/(\d+)/);
      const pinId = pinIdMatch ? pinIdMatch[1] : Math.random().toString(36).substr(2, 9);

      items.push({
        id: `p_pin_${pinId}`,
        title: title,
        platform: 'Pinterest',
        date: pubDate,
        views: 0, // Pinterest RSS doesn't expose views publicly
        likes: 0, // No likes exposed in RSS
        comments: 0,
        shares: 0,
        caption: title,
        link: link,
        imageUrl: imageUrl
      });

      // Limit to 5 most recent pins to match the rest of the dashboard layout
      if (items.length >= 5) break;
    }

    if (items.length === 0) {
      throw new Error(`No recent pins found for user ${cleanHandle}.`);
    }

    return res.status(200).json({ posts: items });

  } catch (err) {
    console.error('Pinterest RSS Sync Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse Pinterest RSS feed' });
  }
}
