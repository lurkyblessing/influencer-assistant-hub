export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform } = req.body;

  if (platform !== 'Instagram') {
    return res.status(400).json({ error: 'This endpoint is for Instagram sync only.' });
  }

  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('No Instagram Graph API token configured in environment variables.');
    }

    // Step 1: Get Facebook Pages linked to this user token
    const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      throw new Error(`Step 1 (Pages) Error: ${pagesData.error.message}`);
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook Pages found linked to this account. Ensure your IG is a Professional account linked to a FB Page.');
    }

    // Step 2: Find the linked instagram_business_account ID from the pages
    let igAccountId = null;
    for (const page of pagesData.data) {
      const igUrl = `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`;
      const igRes = await fetch(igUrl);
      const igData = await igRes.json();
      
      if (igData.instagram_business_account?.id) {
        igAccountId = igData.instagram_business_account.id;
        break;
      }
    }

    if (!igAccountId) {
      throw new Error('Could not find an Instagram Business/Creator account linked to any of your Facebook Pages.');
    }

    // Step 3: Fetch the media with deep metrics using the IG Account ID
    const mediaUrl = `https://graph.facebook.com/v20.0/${igAccountId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=${accessToken}`;
    
    const response = await fetch(mediaUrl);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Step 3 (Media) Error: ${data.error.message}`);
    }

    if (!data.data || data.data.length === 0) {
      return res.status(200).json({ posts: [] });
    }

    // Map Instagram data to Lumina Hub's schema
    const posts = data.data.slice(0, 5).map(item => {
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
        views: 0, // Views are highly restricted by Meta APIs for standard media endpoints
        likes: item.like_count || 0, 
        comments: item.comments_count || 0,
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
