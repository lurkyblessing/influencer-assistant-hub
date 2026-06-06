export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, handle, accessToken, apiKey } = req.body;

  if (platform !== 'YouTube') {
    return res.status(400).json({ error: 'Only YouTube sync is supported in this strict mode.' });
  }

  try {
    let channelId = handle;
    const authHeader = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
    
    // Fallback: If they provided an API key (e.g. from settings)
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    if (!accessToken && !apiKey) {
      throw new Error('No valid YouTube API Key or OAuth Access Token provided. Cannot fetch actual data.');
    }

    // Attempt to search for the channel if it's a handle
    if (handle.startsWith('@') || handle.length > 0) {
      const q = encodeURIComponent(handle);
      const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${q}${keyParam}`, { headers: authHeader });
      const searchData = await searchRes.json();
      
      if (searchData.error) {
        throw new Error(searchData.error.message || 'YouTube API error');
      }

      if (searchData.items && searchData.items.length > 0) {
        channelId = searchData.items[0].id.channelId;
      } else {
        throw new Error(`Could not find channel for handle: ${handle}`);
      }
    }

    // Fetch latest videos for the channel
    const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5${keyParam}`, { headers: authHeader });
    const videoData = await videoRes.json();

    if (videoData.error) {
      throw new Error(videoData.error.message || 'YouTube API error');
    }

    if (!videoData.items || videoData.items.length === 0) {
      return res.status(200).json({ posts: [] });
    }

    const videoIds = videoData.items.map(item => item.id.videoId).join(',');

    // Fetch video statistics
    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}${keyParam}`, { headers: authHeader });
    const statsData = await statsRes.json();

    const posts = videoData.items.map((item, index) => {
      const stats = statsData.items[index]?.statistics || { viewCount: 0, likeCount: 0, commentCount: 0 };
      
      return {
        id: `p_yt_${item.id.videoId}`,
        title: item.snippet.title,
        platform: 'YouTube',
        date: item.snippet.publishedAt.split('T')[0],
        views: parseInt(stats.viewCount || 0),
        likes: parseInt(stats.likeCount || 0),
        comments: parseInt(stats.commentCount || 0),
        shares: 0, // YouTube API doesn't expose shares publicly
        caption: item.snippet.description
      };
    });

    return res.status(200).json({ posts });
  } catch (err) {
    console.error('YouTube Sync Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to connect to YouTube API' });
  }
}
