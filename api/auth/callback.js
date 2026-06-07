const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  const platform = state || 'Unknown';

  if (error) {
    return sendResponse(res, platform, null, null, `Error from platform: ${error}`);
  }

  if (!code) {
    return sendResponse(res, platform, null, null, 'No authorization code received.');
  }

  const baseUrl = process.env.REDIRECT_URI_BASE || `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  let accessToken = null;
  let handle = null;

  try {
    if (platform === 'TikTok' && process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET) {
      const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });
      const data = await resp.json();
      accessToken = data.access_token;
      
      // Fetch handle using access token
      const profileResp = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const profileData = await profileResp.json();
      handle = profileData.data?.user?.display_name || profileData.data?.user?.username || 'TikTokUser';
    } 
    else if (platform === 'Instagram' && process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
      const resp = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.INSTAGRAM_CLIENT_ID,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code
        })
      });
      const data = await resp.json();
      accessToken = data.access_token;
      
      // Fetch handle
      const profileResp = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`);
      const profileData = await profileResp.json();
      handle = profileData.username || 'InstagramUser';
    }
    else if (platform === 'YouTube' && (process.env.YOUTUBE_CLIENT_ID || GOOGLE_CLIENT_ID) && (process.env.YOUTUBE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET)) {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.YOUTUBE_CLIENT_ID || GOOGLE_CLIENT_ID,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });
      const data = await resp.json();
      accessToken = data.access_token;
      
      // Fetch channel name using YouTube API
      const channelResp = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const channelData = await channelResp.json();
      handle = channelData.items?.[0]?.snippet?.title || 'YouTubeChannel';
    }
    else {
      // Missing environment variables or unsupported platform
      throw new Error(`Integration configuration for ${platform} is incomplete. Missing API Keys.`);
    }

    return sendResponse(res, platform, handle, accessToken, null);
  } catch (err) {
    console.error('Exchange failed:', err);
    // Explicitly return an error if connection fails rather than faking it
    return sendResponse(res, platform, null, null, err.message || 'Authentication failed. Invalid API credentials.');
  }
}

function sendResponse(res, platform, handle, accessToken, error) {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lumina Hub Authentication</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #1e1919;
          color: #efebe7;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .container {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 2.5rem;
          max-width: 400px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #cf5c78;
          animation: spin 1s linear infinite;
          margin: 0 auto 1.5rem auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { margin-bottom: 0.5rem; font-weight: 700; }
        p { color: #b5b5b5; font-size: 0.9rem; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h2>${error ? 'Authentication Error' : 'Connecting Account...'}</h2>
        <p>${error ? error : `Successfully authenticated with ${platform}! Closing window and updating Lumina Hub dashboard...`}</p>
      </div>
      <script>
        const messageData = {
          type: 'OAUTH_CALLBACK',
          status: '${error ? 'error' : 'success'}',
          platform: '${platform}',
          handle: '${handle || ''}',
          token: '${accessToken || ''}',
          error: '${error || ''}'
        };
        
        // Post message to the main Lumina Hub app window
        if (window.opener) {
          window.opener.postMessage(messageData, "*");
        } else {
          console.error("Parent window not found");
        }
        
        // Close the popup window after brief delay
        setTimeout(() => {
          window.close();
        }, 1500);
      </script>
    </body>
    </html>
  `);
}
