export default function handler(req, res) {
  const { platform, customClientId } = req.query;
  const baseUrl = process.env.REDIRECT_URI_BASE || `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  let authUrl = '';
  if (platform === 'TikTok') {
    const clientKey = customClientId || process.env.TIKTOK_CLIENT_KEY || 'lumina_key';
    authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=user.info.profile,video.list&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=TikTok`;
  } else if (platform === 'Instagram') {
    const clientId = customClientId || process.env.INSTAGRAM_CLIENT_ID || '1291322779824857';
    authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list&response_type=code&state=Instagram`;
  } else if (platform === 'YouTube') {
    const clientId = customClientId || process.env.YOUTUBE_CLIENT_ID || 'lumina_id';
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&state=YouTube&access_type=offline&prompt=consent`;
  } else if (platform === 'Pinterest') {
    const clientId = customClientId || process.env.PINTEREST_CLIENT_ID || 'lumina_id';
    authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=user_accounts:read&state=Pinterest`;
  } else if (platform === 'Twitter/X') {
    const clientId = customClientId || process.env.TWITTER_CLIENT_ID || 'lumina_id';
    authUrl = `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=users.read%20tweet.read&state=Twitter/X&code_challenge=challenge&code_challenge_method=plain`;
  }

  if (authUrl) {
    res.redirect(authUrl);
  } else {
    res.status(400).send(`Unsupported platform: ${platform}`);
  }
}
