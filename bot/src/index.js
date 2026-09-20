import { Client, Events, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { config } from "./config.js";
import { ArchipelagoClient } from "./ap.js";
import { commandData, handleCommand } from "./commands.js";
import {
  albumByItemName,
  allTracks,
  loadCrateFile,
  loadState,
  saveState,
  starterIds,
  trackByLocationName,
} from "./crate.js";
import { VoicePlayer } from "./player.js";

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
  async persist() {
    await saveState(config.cratePath, {
      unlockedAlbumIds: this.unlocked,
      playedTrackIds: this.played,
      checkedLocationIds: this.checked,
    });
  },
};

function locationIdFor(track) {
  return ap.locationNameToId.get(track.locationName) ?? track.locationId;
}

function trackForLocationId(id) {
  for (const [name, locId] of ap.locationNameToId) {
    if (locId === id) {
      const t = trackByLocationName(runtime.crate, name);
      if (t) return t;
    }
  }
  return allTracks(runtime.crate).find((t) => t.locationId === id);
}

async function announce(text, track) {
  const channel =
    (config.announceChannelId && client.channels.cache.get(config.announceChannelId)) || runtime.announceChannel;
  if (!channel?.isTextBased?.()) {
    console.log(text);
    return;
  }
  const embed = new EmbedBuilder().setColor(0x8fa38a).setDescription(text);
  if (track?.artwork) embed.setThumbnail(track.artwork);
  if (track) embed.setTitle(track.name);
  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.warn("announce failed", err.message);
  }
}

const ap = new ArchipelagoClient({
  onStatus(status, detail) {
    console.log(`AP ${status}${detail ? ` ${detail}` : ""}`);
  },
  onConnected({ checked }) {
    for (const id of checked) {
      runtime.checked.add(id);
      const track = trackForLocationId(id);
      if (track) runtime.played.add(track.id);
    }
    runtime.persist().catch(() => {});
    announce(`Connected to Archipelago. ${checked.length} locations already checked.`).catch(() => {});
  },
  onItems(items, index) {
    const start = index === 0;
    if (start) {
      runtime.unlocked = new Set(starterIds(runtime.crate));
    }
    for (const it of items) {
      const name = ap.itemIdToName.get(it.item);
      if (!name?.startsWith("Album - ")) continue;
      const album = albumByItemName(runtime.crate, name);
      if (album && !runtime.unlocked.has(album.id)) {
        runtime.unlocked.add(album.id);
        announce(`Unlocked **${album.name}** — ${album.artist}. Added to rotation.`, album.tracks[0]).catch(() => {});
      } else if (album) {
        runtime.unlocked.add(album.id);
      }
    }
    runtime.persist().catch(() => {});
  },
  onPrint(text) {
    if (text) announce(text).catch(() => {});
  },
  onChecked(locations) {
    for (const id of locations) {
      runtime.checked.add(id);
      const track = trackForLocationId(id);
      if (track) runtime.played.add(track.id);
    }
    runtime.persist().catch(() => {});
  },
  onDataPackage() {},
});

const player = new VoicePlayer({
  getCrate: () => runtime.crate,
  isUnlocked: (albumId) => runtime.unlocked.has(albumId),
  isPlayed: (trackId) => runtime.played.has(trackId),
  log: (msg) => console.log(msg),
  async onTrackStart(track) {
    const first = !runtime.played.has(track.id);
    runtime.played.add(track.id);
    if (first) {
      const locId = locationIdFor(track);
      runtime.checked.add(locId);
      if (ap.connected) ap.checkLocations([locId]);
      await announce(`First play — checked ${track.locationName}.`, track);
    }
    await runtime.persist();
  },
});

client.once(Events.ClientReady, async (ready) => {
  console.log(`Needlecheck logged in as ${ready.user.tag}`);
  try {
    if (config.discordGuildId) {
      const guild = await ready.guilds.fetch(config.discordGuildId);
      await guild.commands.set(commandData);
      console.log(`Registered guild commands in ${guild.name}`);
    } else {
      await ready.application.commands.set(commandData);
      console.log("Registered global slash commands");
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
    await handleCommand(interaction, { runtime, player, ap, client });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Something went wrong.";
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => {});
    else await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
  }
});

async function main() {
  runtime.crate = await loadCrateFile(config.cratePath);
  const saved = await loadState(config.cratePath);
  runtime.unlocked = new Set(saved.unlockedAlbumIds.length ? saved.unlockedAlbumIds : starterIds(runtime.crate));
  runtime.played = new Set(saved.playedTrackIds);
  runtime.checked = new Set(saved.checkedLocationIds);
  console.log(`Crate ${runtime.crate.length} albums, ${allTracks(runtime.crate).length} tracks`);
  await client.login(config.discordToken);
}

function shutdown() {
  player.leave();
  ap.disconnect();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
