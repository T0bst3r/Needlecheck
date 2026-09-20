function opt(name, fallback = "") {
  return (process.env[name] ?? "").trim() || fallback;
}

export const config = {
  discordToken: opt("DISCORD_TOKEN"),
  discordClientId: opt("DISCORD_CLIENT_ID"),
  discordGuildId: opt("DISCORD_GUILD_ID"),
  spotifyClientId: opt("SPOTIFY_CLIENT_ID"),
  spotifyClientSecret: opt("SPOTIFY_CLIENT_SECRET"),
  apHost: opt("AP_HOST"),
  apPort: opt("AP_PORT", "38281"),
  apSlot: opt("AP_SLOT"),
  apPassword: opt("AP_PASSWORD"),
  apGame: opt("AP_GAME", "Needlecheck"),
  cratePath: opt("CRATE_PATH", "/data/crate.json"),
  announceChannelId: opt("ANNOUNCE_CHANNEL_ID"),
  ytdlpCookies: opt("YTDLP_COOKIES"),
};

export function spotifyConfigured() {
  return Boolean(config.spotifyClientId && config.spotifyClientSecret);
}
