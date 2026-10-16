import { parseUncheckedPercent } from "./queue.js";

function opt(name, fallback = "") {
  return (process.env[name] ?? "").trim() || fallback;
}

function flag(name) {
  const value = (process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export const config = {
  discordToken: opt("DISCORD_TOKEN"),
  discordClientId: opt("DISCORD_CLIENT_ID"),
  discordGuildId: opt("DISCORD_GUILD_ID"),
  apHost: opt("AP_HOST"),
  apPort: opt("AP_PORT", "38281"),
  apSlot: opt("AP_SLOT"),
  apPassword: opt("AP_PASSWORD"),
  apGame: opt("AP_GAME", "Needlecheck"),
  mediaRoot: opt("MEDIA_ROOT", "/music"),
  announceChannelId: opt("ANNOUNCE_CHANNEL_ID"),
  ytdlpCookies: opt("YTDLP_COOKIES"),
  youtube: flag("YOUTUBE"),
  uncheckedPercent: parseUncheckedPercent(process.env.UNCHECKED_PERCENT),
};
