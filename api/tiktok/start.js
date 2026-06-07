export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, handle } = req.body;

  if (platform !== 'TikTok') {
    return res.status(400).json({ error: 'This endpoint is for TikTok sync only.' });
  }

  try {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      throw new Error('Apify API token is not configured in the environment.');
    }

    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;

    // Trigger Apify Actor (clockworks/tiktok-profile-scraper is the official stable scraper)
    const runUrl = `https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/runs?token=${apifyToken}`;
    
    const runReq = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: [cleanHandle],
        resultsPerPage: 5,
        downloadVideos: false
      })
    });

    const runData = await runReq.json();

    if (!runReq.ok) {
      throw new Error(runData.error?.message || 'Failed to start Apify actor');
    }

    // Return the run ID to the frontend so it can poll for results
    return res.status(200).json({ 
      runId: runData.data.id,
      status: runData.data.status 
    });

  } catch (err) {
    console.error('TikTok Apify Start Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to trigger Apify scraper' });
  }
}
