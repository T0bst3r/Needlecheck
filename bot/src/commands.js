import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";
import { config, spotifyConfigured } from "./config.js";
import { allTracks, hydrateCrate, saveCrateFile, serializeCrate, starterIds } from "./crate.js";
import { lookupCatalog, searchCatalog } from "./itunes.js";

const ACCENT = 0xd0d4da;
const CHECK = 0x8fa38a;

export const commandData = [
  new SlashCommandBuilder().setName("join").setDescription("Join your voice channel and start the rotation"),
  new SlashCommandBuilder().setName("leave").setDescription("Leave voice"),
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play from the unlocked crate")
    .addStringOption((o) => o.setName("query").setDescription("Song or album name")),
  new SlashCommandBuilder().setName("pause").setDescription("Pause playback"),
  new SlashCommandBuilder().setName("resume").setDescription("Resume playback"),
  new SlashCommandBuilder().setName("skip").setDescription("Skip to the next unlocked track"),
  new SlashCommandBuilder().setName("stop").setDescription("Stop playback"),
  new SlashCommandBuilder().setName("shuffle").setDescription("Toggle random rotation"),
  new SlashCommandBuilder().setName("np").setDescription("Now playing"),
  new SlashCommandBuilder().setName("queue").setDescription("Show the upcoming queue"),
  new SlashCommandBuilder()
    .setName("crate")
    .setDescription("Inspect or edit the album crate")
    .addSubcommand((s) => s.setName("list").setDescription("Locked vs unlocked albums"))
    .addSubcommand((s) =>
      s
        .setName("search")
        .setDescription("Search Spotify (or the public catalog) for albums")
        .addStringOption((o) => o.setName("query").setDescription("Artist or album").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add an album from search (use the id from /crate search)")
        .addStringOption((o) => o.setName("id").setDescription("Album id, e.g. sp:…").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("starter")
        .setDescription("Mark an album as sphere-0 starter")
        .addStringOption((o) => o.setName("name").setDescription("Album name").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove an album from the crate")
        .addStringOption((o) => o.setName("name").setDescription("Album name").setRequired(true)),
    ),
  new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect to an Archipelago room")
    .addStringOption((o) => o.setName("host").setDescription("Host (archipelago.gg or IP)").setRequired(true))
    .addStringOption((o) => o.setName("slot").setDescription("Slot name").setRequired(true))
    .addStringOption((o) => o.setName("port").setDescription("Port (default 38281)"))
    .addStringOption((o) => o.setName("password").setDescription("Room password"))
    .addStringOption((o) => o.setName("game").setDescription("Game name (default Needlecheck)")),
  new SlashCommandBuilder().setName("disconnect").setDescription("Disconnect from Archipelago"),
  new SlashCommandBuilder().setName("status").setDescription("Crate, checks, and room status"),
  new SlashCommandBuilder().setName("help").setDescription("How Needlecheck works"),
].map((c) => c.toJSON());

function embed(title, description, color = ACCENT) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description);
}

function npEmbed(track, extra = "") {
  const e = new EmbedBuilder()
    .setColor(CHECK)
    .setTitle(track.name)
    .setDescription(`${track.artist}\n*${track.albumName}*${extra ? `\n${extra}` : ""}`);
  if (track.artwork) e.setThumbnail(track.artwork);
  return e;
}

export async function handleCommand(interaction, ctx) {
  const { runtime, player, ap } = ctx;
  const name = interaction.commandName;

  if (name === "join") {
    const channel = interaction.member?.voice?.channel;
    if (!channel || channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
      await interaction.reply({ content: "Join a voice channel first.", ephemeral: true });
      return;
    }
    await interaction.deferReply();
    await player.join(channel);
    runtime.announceChannel = interaction.channel;
    try {
      await player.play();
      const track = player.nowPlaying;
      await interaction.editReply({
        content: `Joined ${channel.name}.`,
        embeds: track ? [npEmbed(track, "Late night on the multiworld.")] : [],
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
    try {
      if (!player.connection) {
        const channel = interaction.member?.voice?.channel;
        if (!channel) {
          await interaction.editReply("Join a voice channel first, or use /join.");
          return;
        }
        await player.join(channel);
      }
      if (query) {
        const hit = player.findUnlocked(query);
        if (!hit) {
          const locked = runtime.crate.find(
            (a) =>
              !runtime.unlocked.has(a.id) &&
              (a.name.toLowerCase().includes(query.toLowerCase()) || a.artist.toLowerCase().includes(query.toLowerCase())),
          );
          await interaction.editReply(
            locked
              ? `**${locked.name}** is in the crate but still locked behind its Archipelago item.`
              : `Nothing unlocked matches “${query}”.`,
          );
          return;
        }
        await player.play(hit.id);
      } else {
        await player.play();
      }
      const track = player.nowPlaying;
      await interaction.editReply({ embeds: track ? [npEmbed(track)] : [] });
    } catch (err) {
      await interaction.editReply(err.message);
    }
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
    await interaction.reply(player.shuffle ? "Random rotation on." : "Album order rotation on.");
    return;
  }
  if (name === "np") {
    const t = player.nowPlaying;
    if (!t) {
      await interaction.reply("Silence on the channel.");
      return;
    }
    await interaction.reply({ embeds: [npEmbed(t, runtime.played.has(t.id) ? "" : "First play — sending a check.")] });
    return;
  }
  if (name === "queue") {
    const names = player.queue
      .map((id) => allTracks(runtime.crate).find((t) => t.id === id)?.name)
      .filter(Boolean);
    await interaction.reply(
      names.length ? `Queue: ${names.join(" · ")}` : "Queue is empty. Rotation picks from unlocked albums.",
    );
    return;
  }

  if (name === "crate") {
    const sub = interaction.options.getSubcommand();
    if (sub === "list") {
      const lines = runtime.crate.map((a) => {
        const on = runtime.unlocked.has(a.id);
        const done = a.tracks.filter((t) => runtime.played.has(t.id)).length;
        return `${on ? "unlocked" : "locked"}  **${a.name}** — ${a.artist}  ${done}/${a.tracks.length}${a.starter ? " · starter" : ""}`;
      });
      await interaction.reply({
        embeds: [embed("The crate", lines.join("\n") || "Crate is empty.")],
      });
      return;
    }
    if (sub === "search") {
      await interaction.deferReply({ ephemeral: true });
      const query = interaction.options.getString("query", true);
      try {
        const { source, hits } = await searchCatalog(query);
        if (!hits.length) {
          await interaction.editReply("No albums matched.");
          return;
        }
        const lines = hits.map((h) => `• **${h.name}** — ${h.artist}${h.year ? ` (${h.year})` : ""}\n  \`${h.id}\``);
        await interaction.editReply({
          embeds: [
            embed(
              source === "spotify" ? "Spotify results" : "Catalog results",
              `${lines.join("\n")}\n\nAdd with \`/crate add id:<id>\`.\nEditing the crate does **not** change an already-generated seed — download a new apworld from the station.`,
            ),
          ],
        });
      } catch (err) {
        await interaction.editReply(err.message);
      }
      return;
    }
    if (sub === "add") {
      await interaction.deferReply();
      const id = interaction.options.getString("id", true);
      try {
        if (runtime.crate.some((a) => a.id === id)) {
          await interaction.editReply("That album is already in the crate.");
          return;
        }
        const raw = await lookupCatalog(id);
        runtime.crate = hydrateCrate(serializeCrate([...runtime.crate, raw]));
        for (const sid of starterIds(runtime.crate)) runtime.unlocked.add(sid);
        await saveCrateFile(config.cratePath, runtime.crate);
        await runtime.persist();
        await interaction.editReply(
          `Added **${raw.name}** — ${raw.artist} (${raw.tracks.length} tracks). Rebuild and generate the apworld before connecting to a new seed.`,
        );
      } catch (err) {
        await interaction.editReply(err.message);
      }
      return;
    }
    if (sub === "starter") {
      const q = interaction.options.getString("name", true).toLowerCase();
      const album = runtime.crate.find((a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q));
      if (!album) {
        await interaction.reply({ content: "No matching album.", ephemeral: true });
        return;
      }
      runtime.crate = runtime.crate.map((a) => ({ ...a, starter: a.id === album.id }));
      runtime.unlocked.add(album.id);
      await saveCrateFile(config.cratePath, runtime.crate);
      await runtime.persist();
      await interaction.reply(`**${album.name}** is the sphere-0 starter.`);
      return;
    }
    if (sub === "remove") {
      const q = interaction.options.getString("name", true).toLowerCase();
      const album = runtime.crate.find((a) => a.name.toLowerCase().includes(q));
      if (!album) {
        await interaction.reply({ content: "No matching album.", ephemeral: true });
        return;
      }
      runtime.crate = hydrateCrate(serializeCrate(runtime.crate.filter((a) => a.id !== album.id)));
      runtime.unlocked.delete(album.id);
      await saveCrateFile(config.cratePath, runtime.crate);
      await runtime.persist();
      await interaction.reply(`Removed **${album.name}**.`);
      return;
    }
  }

  if (name === "connect") {
    await interaction.deferReply();
    const host = interaction.options.getString("host", true);
    const slot = interaction.options.getString("slot", true);
    const port = interaction.options.getString("port") || "38281";
    const password = interaction.options.getString("password") || "";
    const game = interaction.options.getString("game") || "Needlecheck";
    try {
      await ap.connect({ host, port, slot, password, game });
      await interaction.editReply(`Connected to **${host}:${port}** as **${slot}** (${game}).`);
    } catch (err) {
      await interaction.editReply(`Connect failed: ${err.message}`);
    }
    return;
  }

  if (name === "disconnect") {
    ap.disconnect();
    await interaction.reply("Disconnected from Archipelago.");
    return;
  }

  if (name === "status") {
    const total = allTracks(runtime.crate).length;
    const lines = [
      `Room: ${ap.connected ? "connected" : "offline"}`,
      `Albums ${runtime.unlocked.size}/${runtime.crate.length}`,
      `Checks ${runtime.checked.size}/${total}`,
      `Shuffle ${player.shuffle ? "on" : "off"}`,
      spotifyConfigured() ? "Catalog: Spotify" : "Catalog: public fallback (set Spotify credentials for better results)",
    ];
    await interaction.reply({ embeds: [embed("Status", lines.join("\n"))] });
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
            "Build the crate in the **station** (Spotify search) and download the apworld — there are no album options in Archipelago.",
            "Received album items unlock rotation. The first play of each song is a location check.",
            "",
            "`/join` `/play` `/skip` `/crate list` `/connect`",
            "Audio is resolved from public sources. Spotify is used for metadata only.",
          ].join("\n"),
        ),
      ],
    });
  }
}
