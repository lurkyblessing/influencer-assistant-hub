export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, handle } = req.body;

  if (platform !== 'Instagram') {
    return res.status(400).json({ error: 'This endpoint is for Instagram sync only.' });
  }

  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('No Instagram Graph API token configured in environment variables.');
    }

    // Fetch user media from Instagram Graph API
    // The master token allows us to fetch the profile it is linked to directly via 'me/media'
    const graphUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${accessToken}`;
    
    const response = await fetch(graphUrl);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Instagram API returned an error.');
    }

    if (!data.data || data.data.length === 0) {
      return res.status(200).json({ posts: [] });
    }

    // Map Instagram data to Lumina Hub's schema
    const posts = data.data.slice(0, 5).map(item => {
      // Clean up caption or provide a default if empty
      const cleanCaption = item.caption ? item.caption.substring(0, 150) + (item.caption.length > 150 ? '...' : '') : 'Instagram Post';
      
      let dateObj = new Date();
      if (item.timestamp) {
        try {
          dateObj = new Date(item.timestamp);
        } catch (e) {}
      }
      
      return {
        id: `p_ins_${item.id}`,
        title: `${item.media_type === 'VIDEO' ? 'Reel/Video' : 'Post'} from Instagram`,
        platform: 'Instagram',
        date: dateObj.toISOString().split('T')[0],
        views: 0, // Basic Display API does not return views or likes unfortunately
        likes: 0, 
        comments: 0,
        shares: 0,
        caption: cleanCaption,
        link: item.permalink || '',
        imageUrl: item.media_type !== 'VIDEO' ? item.media_url : '' // For video we could use thumbnail_url if requested
      };
    });

    return res.status(200).json({ posts });

  } catch (err) {
    console.error('Instagram Sync Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync with Instagram Graph API' });
  }
}
