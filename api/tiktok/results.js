export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { runId } = req.body;

  if (!runId) {
    return res.status(400).json({ error: 'runId is required to fetch Apify results.' });
  }

  try {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      throw new Error('Apify API token is not configured.');
    }

    // 1. Check the status of the run
    const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`;
    const statusReq = await fetch(statusUrl);
    const statusData = await statusReq.json();

    if (!statusReq.ok) {
      throw new Error('Failed to fetch Apify run status');
    }

    const status = statusData.data.status;
    
    // If not finished, return the status so the frontend can keep polling
    if (status !== 'SUCCEEDED') {
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Apify scraper failed with status: ${status}`);
      }
      return res.status(200).json({ status, posts: null });
    }

    // 2. If succeeded, fetch the dataset items
    const datasetId = statusData.data.defaultDatasetId;
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&format=json`;
    
    const datasetReq = await fetch(datasetUrl);
    const datasetItems = await datasetReq.json();

    if (!datasetReq.ok) {
      throw new Error('Failed to fetch dataset items from Apify');
    }

    if (!datasetItems || datasetItems.length === 0) {
      return res.status(200).json({ status: 'SUCCEEDED', posts: [] });
    }

    // Map Apify TikTok schema to Lumina Hub schema
    const posts = datasetItems.slice(0, 5).map(item => {
      // Different Apify actors use slightly different field names.
      // This is a robust mapping that tries to find standard fields.
      const views = item.playCount || item.views || item.diggCount || 0;
      const likes = item.diggCount || item.likes || 0;
      const comments = item.commentCount || item.comments || 0;
      const shares = item.shareCount || item.shares || 0;
      const caption = item.text || item.desc || item.title || 'TikTok Video';
      const videoId = item.id || item.videoMeta?.id || Math.random().toString(36).substr(2, 9);
      
      let dateObj = new Date();
      if (item.createTime) {
        try {
          dateObj = new Date(item.createTime * 1000); // Usually unix timestamp
        } catch (e) {}
      } else if (item.createdAt) {
        dateObj = new Date(item.createdAt);
      }

      const cleanCaption = caption.substring(0, 150) + (caption.length > 150 ? '...' : '');
      const dynamicTitle = caption.trim() ? (caption.length > 30 ? caption.substring(0, 30).trim() + '...' : caption.trim()) : 'TikTok Video';

      // Attempt to extract auto-generated subtitles or suggested keywords from the Apify dataset
      const transcript = item.videoMeta?.subtitle || (item.suggestedWords ? item.suggestedWords.join(' ') : '') || '';

      return {
        id: `p_tok_${videoId}`,
        title: dynamicTitle,
        platform: 'TikTok',
        date: dateObj.toISOString().split('T')[0],
        views: parseInt(views),
        likes: parseInt(likes),
        comments: parseInt(comments),
        shares: parseInt(shares),
        caption: cleanCaption,
        transcript: transcript,
        link: item.webVideoUrl || item.url || '',
        imageUrl: item.covers?.default || item.videoMeta?.coverUrl || item.imageUrl || ''
      };
    });

    return res.status(200).json({ status: 'SUCCEEDED', posts });

  } catch (err) {
    console.error('TikTok Apify Results Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch TikTok results' });
  }
}
