export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60');

  const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
  const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!TWITCH_CLIENT_ID) {
    return res.status(500).json({ error: 'API keys not configured' });
  }

  const twitchUsers = ['theburntpeanut','timthetatman','cloakzy','nickmercs','hutchmf','gingy','rogue'];

  try {
    const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
    const { access_token } = await tokenRes.json();

    const userQuery = twitchUsers.map(u => `user_login=${u}`).join('&');
    const [streamsRes, usersRes] = await Promise.all([
      fetch(`https://api.twitch.tv/helix/streams?${userQuery}`, { headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${access_token}` }}),
      fetch(`https://api.twitch.tv/helix/users?${userQuery}`, { headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${access_token}` }})
    ]);

    const { data: streams } = await streamsRes.json();
    const { data: users } = await usersRes.json();

    const result = twitchUsers.map(username => {
      const stream = streams?.find(s => s.user_login.toLowerCase() === username);
      const user = users?.find(u => u.login.toLowerCase() === username);
      let uptime = '—';
      if (stream?.started_at) {
        const mins = Math.floor((new Date() - new Date(stream.started_at)) / 60000);
        uptime = mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
      }
      return {
        username,
        displayName: stream?.user_name || user?.display_name || username,
        twitchLive: !!stream,
        twitchViewers: stream?.viewer_count || 0,
        game: stream?.game_name || '—',
        streamTitle: stream?.title || '—',
        thumbnail: stream?.thumbnail_url?.replace('{width}','440').replace('{height}','248') || '',
        profileImage: user?.profile_image_url || '',
        uptime,
      };
    });

    return res.status(200).json({ streamers: result, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
