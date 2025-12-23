const { Client, Message } = require("discord.js");

module.exports = {
  name: "resume",
  aliases: ["unpause"],
  description: "Resume the current playback",
  /**
   * @param {Client} client 
   * @param {Message} message 
   */
  run: async (client, message) => {
    if (!message.member.voice.channel) {
      return message.reply("You need to be in a voice channel!");
    }

    const player = client.riffy.players.get(message.guild.id);

    if (!player) {
      return message.reply("Nothing is currently playing!");
    }

    if (!player.paused) {
      return message.reply("The player is not paused!");
    }

    player.pause(false);
    return message.reply("▶️ Resumed the playback.");
  }
}
