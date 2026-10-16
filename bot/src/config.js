import { parseUncheckedPercent } from "./queue.js";

function present(name) {
  return (process.env[name] ?? "").trim();
}

function opt(name, fallback = "") {
  return present(name) || fallback;
}

function flag(name) {
  const value = (process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export const config = {
  discordToken: opt("DISCORD_TOKEN"),
  discordClientId: opt("DISCORD_CLIENT_ID"),
  discordGuildId: opt("DISCORD_GUILD_ID"),
  apHost: present("AP_HOST"),
  apPort: present("AP_PORT"),
  apSlot: present("AP_SLOT"),
  apPassword: present("AP_PASSWORD"),
  apGame: present("AP_GAME"),
  mediaRoot: opt("MEDIA_ROOT", "/music"),
  announceChannelId: opt("ANNOUNCE_CHANNEL_ID"),
  ytdlpCookies: opt("YTDLP_COOKIES"),
  youtube: flag("YOUTUBE"),
  uncheckedPercent: parseUncheckedPercent(process.env.UNCHECKED_PERCENT),
};
