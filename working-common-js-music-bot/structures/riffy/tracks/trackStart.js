const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Bloom } = require("musicard");
const client = require("../../client")

client.riffy.on('trackStart', async (player, track) => {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('disconnect')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏺'),

      new ButtonBuilder()
        .setCustomId('pause')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏸'),

      new ButtonBuilder()
        .setCustomId('skip')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏭')
    );

  const channel = client.channels.cache.get(player.textChannel);

  function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  const musicLength = track.info.length;
  const formattedLength = formatTime(Math.round(musicLength / 1000));
  const [minutesStr, secondsStr] = formattedLength.split(":");
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);
  const totalMilliseconds = (minutes * 60 + seconds) * 1000;

  //disabling buttons when the song ends
  const rowDisabled = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('disconnect')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏺')
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId('pause')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏸')
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId('skip')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏭')
        .setDisabled(true)
    );

  try {
    const musicard = await Bloom({
      thumbnailImage: track.info.thumbnail,
      backgroundColor: "#070707",
      progress: 0,
      progressColor: "#FF7A00",
      progressBarColor: "#5F2D00",
      name: track.info.title,
      nameColor: "#FFFFFF",
      author: track.info.author,
      authorColor: "#696969",
      startTime: "0:00",
      endTime: formattedLength,
      timeColor: "#FFFFFF"
    });

    const msg = await channel
      .send({
        files: [{ attachment: musicard, name: 'musicard.png' }],
        components: [row]
      })
      .then((x) => (player.message = x));

    // Auto-disable buttons when track ends
    setTimeout(() => {
      if (msg && !msg.deleted) {
        msg.edit({ components: [rowDisabled] }).catch(() => {});
      }
    }, totalMilliseconds);

  } catch (error) {
    console.error('Error creating musicard:', error);
    // Fallback to text message if musicard fails
    const msg = await channel
      .send({
        content: `🎵 Now Playing: **${track.info.title}** by **${track.info.author}** [${formattedLength}]`,
        components: [row]
      })
      .then((x) => (player.message = x));

    setTimeout(() => {
      if (msg && !msg.deleted) {
        msg.edit({ components: [rowDisabled] }).catch(() => {});
      }
    }, totalMilliseconds);
  }
});