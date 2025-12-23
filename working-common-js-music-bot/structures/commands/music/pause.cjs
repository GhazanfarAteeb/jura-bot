const { Client, Message } = require("discord.js");

module.exports = {
  name: "pause",
  description: "Pause the current playback",
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

    if (player.paused) {
      return message.reply("The player is already paused!");
    }

    player.pause(true);
    return message.reply("⏸️ Paused the playback.");
  }
}
