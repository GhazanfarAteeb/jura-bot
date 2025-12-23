const { Client, Message, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "queue",
  aliases: ["q"],
  description: "View the music queue",
  /**
   * @param {Client} client 
   * @param {Message} message 
   */
  run: async (client, message) => {
    const player = client.riffy.players.get(message.guild.id);

    if (!player) {
      return message.reply("Nothing is currently playing!");
    }

    const queue = player.queue;
    const current = player.current;

    if (!current) {
      return message.reply("The queue is empty!");
    }

    const embed = new EmbedBuilder()
      .setColor("#FF7A00")
      .setTitle("🎵 Music Queue")
      .setDescription(`**Now Playing:**\n[${current.info.title}](${current.info.uri}) - ${current.info.author}\nRequested by: ${current.info.requester}`)
      .setTimestamp();

    if (queue.length > 0) {
      const queueList = queue.slice(0, 10).map((track, i) =>
        `**${i + 1}.** [${track.info.title}](${track.info.uri}) - ${track.info.author}`
      ).join('\n');

      embed.addFields({
        name: `Up Next (${queue.length} song${queue.length > 1 ? 's' : ''})`,
        value: queueList + (queue.length > 10 ? `\n*...and ${queue.length - 10} more*` : '')
      });
    } else {
      embed.addFields({
        name: 'Up Next',
        value: 'No songs in queue'
      });
    }

    return message.reply({ embeds: [embed] });
  }
}
