import { ChannelType, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { allTracks } from "./slot.js";
import { playbackCounts } from "./media.js";

const ACCENT = 0xd0d4da;

export const commandData = [
  new SlashCommandBuilder().setName("join").setDescription("Join your voice channel and start the rotation"),
  new SlashCommandBuilder().setName("leave").setDescription("Leave voice"),
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play from the unlocked crate")
    .addStringOption((option) => option.setName("query").setDescription("Song or album name")),
  new SlashCommandBuilder().setName("pause").setDescription("Pause playback"),
  new SlashCommandBuilder().setName("resume").setDescription("Resume playback"),
  new SlashCommandBuilder().setName("skip").setDescription("Skip to the next track that can play"),
  new SlashCommandBuilder().setName("stop").setDescription("Stop playback"),
  new SlashCommandBuilder().setName("shuffle").setDescription("Toggle random rotation"),
  new SlashCommandBuilder().setName("np").setDescription("Now playing"),
  new SlashCommandBuilder()
    .setName("progress")
    .setDescription("Post a message that follows the current song, or remove it")
    .addBooleanOption((option) =>
      option.setName("enabled").setDescription("Turn the updating message on or off").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("crate")
    .setDescription("Show what this room unlocked")
    .addSubcommand((sub) => sub.setName("list").setDescription("Locked and unlocked albums")),
  new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect to an Archipelago room. Replaces the current room without a restart")
    .addStringOption((option) => option.setName("host").setDescription("Host, such as archipelago.gg").setRequired(true))
    .addStringOption((option) => option.setName("slot").setDescription("Slot name").setRequired(true))
    .addStringOption((option) => option.setName("port").setDescription("Port (default 38281)"))
    .addStringOption((option) => option.setName("password").setDescription("Room password"))
    .addStringOption((option) => option.setName("game").setDescription("Game name (default Needlecheck)")),
  new SlashCommandBuilder().setName("disconnect").setDescription("Disconnect from Archipelago"),
  new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("Turn the optional YouTube backend on or off")
    .addBooleanOption((option) => option.setName("enabled").setDescription("Play tracks whose source is a video id").setRequired(true)),
  new SlashCommandBuilder().setName("status").setDescription("Room, crate, and what can actually play"),
  new SlashCommandBuilder().setName("help").setDescription("How Needlecheck playback works"),
].map((command) => command.toJSON());

function embed(title, description) {
  return new EmbedBuilder().setColor(ACCENT).setTitle(title).setDescription(description.slice(0, 4000));
}

function npEmbed(track) {
  const via = track.source.kind === "file" ? track.source.path : "YouTube";
  return new EmbedBuilder()
    .setColor(0x8fa38a)
    .setTitle(track.name)
    .setDescription(`${track.artist}\n*${track.albumName}*\n${via}`);
}

function inVoice(interaction) {
  const channel = interaction.member?.voice?.channel;
  if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) return null;
  return channel;
}

export async function handleCommand(interaction, ctx) {
  const { runtime, player, ap, progress } = ctx;
  const name = interaction.commandName;

  if (name === "join") {
    const channel = inVoice(interaction);
    if (!channel) {
      await interaction.reply({ content: "Join a voice channel first.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!runtime.crate.length) {
      await interaction.reply({ content: "Connect to a room first. The crate comes from the seed, not from a file on the bot.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply();
    runtime.announceChannel = interaction.channel;
    await player.join(channel);
    try {
      await player.play();
      const track = player.nowPlaying;
      await interaction.editReply({
        content: `Joined ${channel.name}.`,
        embeds: track ? [npEmbed(track)] : [],
      });
    } catch (err) {
      await interaction.editReply(`Joined ${channel.name}. ${err.message}`);
    }
    return;
  }

  if (name === "leave") {
    player.leave();
    await interaction.reply("Left voice.");
    return;
  }

  if (name === "play") {
    const query = interaction.options.getString("query");
    await interaction.deferReply();
    if (!player.connection) {
      const channel = inVoice(interaction);
      if (!channel) {
        await interaction.editReply("Join a voice channel first, or use /join.");
        return;
      }
      await player.join(channel);
      runtime.announceChannel = interaction.channel;
    }
    if (query) {
      const hit = player.findUnlocked(query);
      if (!hit) {
        const locked = runtime.crate.find(
          (album) =>
            !runtime.unlocked.has(album.id) &&
            (album.name.toLowerCase().includes(query.toLowerCase()) || album.artist.toLowerCase().includes(query.toLowerCase())),
        );
        await interaction.editReply(
          locked ? `**${locked.name}** is in the crate, but its album item has not arrived.` : `Nothing unlocked matches “${query}”.`,
        );
        return;
      }
      await player.play(hit.id);
    } else {
      await player.play();
    }
    const track = player.nowPlaying;
    await interaction.editReply(track ? { embeds: [npEmbed(track)] } : "Nothing started.");
    return;
  }

  if (name === "pause") {
    player.pause();
    await interaction.reply("Paused.");
    return;
  }
  if (name === "resume") {
    player.resume();
    await interaction.reply("Resumed.");
    return;
  }
  if (name === "skip") {
    player.skip();
    await interaction.reply("Skipping.");
    return;
  }
  if (name === "stop") {
    player.stop();
    await interaction.reply("Stopped.");
    return;
  }
  if (name === "shuffle") {
    player.shuffle = !player.shuffle;
    await interaction.reply(player.shuffle ? "Random rotation on." : "Album order on.");
    return;
  }
  if (name === "np") {
    const track = player.nowPlaying;
    if (!track) {
      await interaction.reply("Silence.");
      return;
    }
    await interaction.reply({ embeds: [npEmbed(track)] });
    return;
  }

  if (name === "progress") {
    const enabled = interaction.options.getBoolean("enabled", true);
    if (enabled && !interaction.channel?.isTextBased?.()) {
      await interaction.reply({ content: "Use this in a channel where the bot can post.", flags: MessageFlags.Ephemeral });
      return;
    }
    await progress.setEnabled(enabled, interaction.channel);
    await interaction.reply({
      content: enabled ? "Progress message on. It updates every few seconds." : "Progress message off.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (name === "crate") {
    const lines = runtime.crate.map((album) => {
      const on = runtime.unlocked.has(album.id);
      const done = album.tracks.filter((track) => runtime.played.has(track.id)).length;
      const files = album.tracks.filter((track) => track.source.kind === "file").length;
      const videos = album.tracks.length - files;
      return `${on ? "unlocked" : "locked"}  **${album.name}** — ${album.artist}  ${done}/${album.tracks.length}${album.starter ? " · starter" : ""}\n${files} file${files === 1 ? "" : "s"}${videos ? `, ${videos} youtube` : ""}`;
    });
    const counts = playbackCounts(runtime.crate, runtime.youtube);
    await interaction.reply({
      embeds: [
        embed(
          "The crate",
          lines.length
            ? `${lines.join("\n")}\n\nPlayable now: ${counts.playable}. Files ${counts.file}. YouTube ${counts.youtube}${runtime.youtube ? " (on)" : " (off)"}.`
            : "No crate yet. /connect to the room that was generated from your YAML.",
        ),
      ],
    });
    return;
  }

  if (name === "connect") {
    await interaction.deferReply();
    const host = interaction.options.getString("host", true);
    const slot = interaction.options.getString("slot", true);
    const port = interaction.options.getString("port") || "38281";
    const password = interaction.options.getString("password") || "";
    const game = interaction.options.getString("game") || "Needlecheck";
    runtime.announceChannel = interaction.channel;
    await ap.connect({ host, port, slot, password, game });
    const counts = playbackCounts(runtime.crate, runtime.youtube);
    await interaction.editReply(
      `Connected to **${host}:${port}** as **${slot}**. ${runtime.crate.length} albums, ${counts.playable} playable right now${runtime.youtube ? "" : ` (${counts.youtube} waiting on YouTube)`}.`,
    );
    return;
  }

  if (name === "disconnect") {
    ap.disconnect();
    player.stop();
    runtime.crate = [];
    runtime.unlocked.clear();
    await interaction.reply("Disconnected. /connect joins a different room without restarting the bot.");
    return;
  }

  if (name === "youtube") {
    const enabled = interaction.options.getBoolean("enabled", true);
    runtime.youtube = enabled;
    await interaction.reply(
      enabled
        ? "YouTube is on. Tracks with a video id can play. This rebroadcasts that audio into the voice channel."
        : "YouTube is off. File tracks still play. Video tracks stay in the crate and are skipped.",
    );
    return;
  }

  if (name === "status") {
    const total = allTracks(runtime.crate).length;
    const counts = playbackCounts(runtime.crate, runtime.youtube);
    await interaction.reply({
      embeds: [
        embed(
          "Status",
          [
            ap.connected ? `Room: ${ap.endpoint}` : "Room: offline",
            `Albums ${runtime.unlocked.size}/${runtime.crate.length}`,
            `Checks ${runtime.checked.size}/${total}`,
            `Shuffle ${player.shuffle ? "on" : "off"}`,
            `Progress ${progress.enabled ? "on" : "off"}`,
            `Files ${counts.file} under the music folder`,
            `YouTube ${runtime.youtube ? "on" : "off"}${counts.youtube ? ` · ${counts.youtube} tracks` : ""}`,
          ].join("\n"),
        ),
      ],
    });
    return;
  }

  if (name === "help") {
    await interaction.reply({
      embeds: [
        embed(
          "Needlecheck",
          [
            "Late night on the multiworld.",
            "",
            "The crate is the one in the generated room. /connect reads it. Changing rooms is another /connect, not a restart.",
            "Files play from the music folder, at the path written in the YAML. YouTube is off until /youtube enabled:True or YOUTUBE=1.",
            "Album items unlock rotation. The first time a track actually starts, that location is checked.",
            "",
            "`/connect` `/join` `/play` `/skip` `/crate list` `/youtube` `/progress`",
          ].join("\n"),
        ),
      ],
    });
  }
}
