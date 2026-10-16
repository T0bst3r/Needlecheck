import { Client, EmbedBuilder, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { generateDependencyReport } from "@discordjs/voice";
import { ArchipelagoClient } from "./ap.js";
import { commandData, handleCommand } from "./commands.js";
import { config } from "./config.js";
import { VoicePlayer } from "./player.js";
import { ProgressBoard } from "./progress.js";
import { albumByItemId, parseSlotCrate, starterIds, trackByLocationId } from "./slot.js";
import { deathSource, planTraps } from "./effects.js";

if (!config.discordToken) {
  console.error("DISCORD_TOKEN is required.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const runtime = {
  crate: [],
  unlocked: new Set(),
  played: new Set(),
  checked: new Set(),
  announceChannel: null,
  youtube: config.youtube,
  pendingItems: null,
  lastDeath: 0,
};

async function announce(text, track) {
  const channel =
    (config.announceChannelId && client.channels.cache.get(config.announceChannelId)) || runtime.announceChannel;
  if (!channel?.isTextBased?.()) {
    console.log(text);
    return;
  }
  const embed = new EmbedBuilder().setColor(0x8fa38a).setDescription(text.slice(0, 4000));
  if (track) embed.setTitle(track.name);
  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.warn("announce failed", err.message);
  }
}

function applyChecked(ids) {
  for (const id of ids) {
    runtime.checked.add(id);
    const track = trackByLocationId(runtime.crate, id);
    if (track) runtime.played.add(track.id);
  }
}

function applyItems(items, index) {
  if (index === 0) runtime.unlocked = new Set(starterIds(runtime.crate));
  for (const item of items) {
    const album = albumByItemId(runtime.crate, item.item);
    if (!album) continue;
    const fresh = !runtime.unlocked.has(album.id);
    runtime.unlocked.add(album.id);
    if (fresh && !album.starter) {
      announce(`Unlocked **${album.name}** — ${album.artist}. It is in the rotation.`).catch(() => {});
    }
  }
  const plan = planTraps(items, Math.random);
  if (!plan.groove && plan.speed == null && !plan.pauseMs) return;
  const notes = [];
  if (plan.groove) {
    player.forcePlayed = true;
    notes.push("Locked groove. The next song is one you already heard.");
  }
  if (plan.speed != null) notes.push(`Wrong speed. Playing at ${plan.speed.toFixed(2)}×.`);
  if (plan.pauseMs) notes.push(`Tonearm lift. Paused for ${Math.round(plan.pauseMs / 1000)} seconds.`);
  announce(notes.join("\n")).catch(() => {});
  if (plan.speed != null) {
    if (plan.pauseMs) player.pendingPauseMs = Math.max(player.pendingPauseMs, plan.pauseMs);
    player.applySpeed(plan.speed).catch((err) => console.error(err));
    return;
  }
  if (plan.pauseMs) player.pauseFor(plan.pauseMs);
}

let player;

const ap = new ArchipelagoClient({
  onStatus(status, detail) {
    console.log(`AP ${status}${detail ? ` ${detail}` : ""}`);
  },
  onSlot(data) {
    runtime.crate = parseSlotCrate(data);
    runtime.unlocked = new Set(starterIds(runtime.crate));
    runtime.played = new Set();
    runtime.checked = new Set();
    player.stop();
    if (runtime.pendingItems) {
      const pending = runtime.pendingItems;
      runtime.pendingItems = null;
      applyItems(pending.items, pending.index);
    }
    console.log(`Crate ${runtime.crate.length} albums from the room`);
  },
  onConnected({ checked }) {
    applyChecked(checked);
    announce(`Connected. ${checked.length} locations were already checked.`).catch(() => {});
  },
  onItems(items, index) {
    if (!runtime.crate.length) {
      runtime.pendingItems = { items, index };
      return;
    }
    applyItems(items, index);
  },
  onChecked(ids) {
    applyChecked(ids);
  },
  onPrint(text) {
    if (config.announceChannelId && text) announce(text).catch(() => {});
    else if (text) console.log(text);
  },
  onDeath(data) {
    const now = Date.now();
    if (now - runtime.lastDeath < 8000) return;
    runtime.lastDeath = now;
    const source = deathSource(data);
    const track = player.nowPlaying;
    if (!track) {
      announce(`Death from ${source}. Nothing is playing.`).catch(() => {});
      return;
    }
    player
      .restart()
      .then(() => announce(`Death from ${source}. Starting “${track.name}” over.`))
      .catch((err) => announce(`Death from ${source}, but the song did not restart. ${err.message}`));
  },
});

player = new VoicePlayer({
  getCrate: () => runtime.crate,
  isUnlocked: (albumId) => runtime.unlocked.has(albumId),
  isPlayed: (trackId) => runtime.played.has(trackId),
  getOptions: () => ({
    youtube: runtime.youtube,
    mediaRoot: config.mediaRoot,
    cookies: config.ytdlpCookies,
  }),
  log: (msg) => console.log(msg),
  uncheckedPercent: config.uncheckedPercent,
  onSkip(_track, message) {
    console.log(message);
  },
  onDuration() {
    progress.ping().catch(() => {});
  },
  async onTrackStart(track) {
    progress.ping().catch(() => {});
    const first = !runtime.played.has(track.id);
    runtime.played.add(track.id);
    if (!first) return;
    runtime.checked.add(track.locationId);
    if (ap.connected) ap.checkLocations([track.locationId]);
    await announce(`Listened. Checked ${track.locationName}.`, track);
  },
  async onIdle(message) {
    if (!message) return;
    await announce(message);
    progress.showSilence().catch(() => {});
  },
});

const progress = new ProgressBoard({ player });
player.onStopped = () => {
  progress.ping().catch(() => {});
};

client.once(Events.ClientReady, async (ready) => {
  console.log(`Needlecheck logged in as ${ready.user.tag}`);
  console.log(`Music folder ${config.mediaRoot}. YouTube ${runtime.youtube ? "on" : "off"}.`);
  console.log(generateDependencyReport());
  try {
    if (config.discordGuildId) {
      const guild = await ready.guilds.fetch(config.discordGuildId);
      await guild.commands.set(commandData);
      console.log(`Registered commands in ${guild.name}`);
    } else {
      await ready.application.commands.set(commandData);
      console.log("Registered global commands");
    }
  } catch (err) {
    console.error("Command registration failed:", err);
  }

  if (config.apHost && config.apSlot) {
    try {
      await ap.connect({
        host: config.apHost,
        port: config.apPort,
        slot: config.apSlot,
        password: config.apPassword,
        game: config.apGame,
      });
    } catch (err) {
      console.error("AP auto-connect failed:", err.message);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction, { runtime, player, ap, client, progress });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Something went wrong.";
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => {});
    else await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

function shutdown() {
  player.leave();
  ap.disconnect();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

client.login(config.discordToken).catch((err) => {
  console.error(err);
  process.exit(1);
});
