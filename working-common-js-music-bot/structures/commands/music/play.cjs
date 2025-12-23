const { Client, Message } = require("discord.js");

module.exports = {
  name: "play",
  aliases: ["p"],
  description: "Play a song or playlist",
  /**
   * @param {Client} client 
   * @param {Message} message 
   * @param {Array} args
   */
  run: async (client, message, args) => {
    if (!message.member.voice.channel) {
      return message.reply("You need to be in a voice channel to play music!");
    }

    if (!args.length) {
      return message.reply("Please provide a song name or URL!");
    }

    const query = args.join(" ");

    const player = client.riffy.createConnection({
      guildId: message.guild.id,
      voiceChannel: message.member.voice.channel.id,
      textChannel: message.channel.id,
      deaf: true,
    });

    const resolve = await client.riffy.resolve({ query: query, requester: message.member });
    const { loadType, tracks, playlistInfo } = resolve;

    if (loadType === 'playlist') {
      for (const track of resolve.tracks) {
        track.info.requester = message.member;
        player.queue.add(track);
      }

      await message.reply(`✅ Added **${tracks.length}** songs from **${playlistInfo.name}** playlist.`);

      if (!player.playing && !player.paused) return player.play();

    } else if (loadType === 'search' || loadType === 'track') {
      const track = tracks.shift();
      track.info.requester = message.member;

      player.queue.add(track);

      await message.reply(`✅ Added **${track.info.title}** to the queue.`);

      if (!player.playing && !player.paused) return player.play();

    } else {
      return message.reply("❌ No results found for your query.");
    }
  }
}
