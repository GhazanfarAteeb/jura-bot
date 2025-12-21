import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export default {
  name: 'trackStart',
  async execute(client, player, track) {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    // Delete previous now playing message if exists
    if (player.message) {
      await player.message.delete().catch(() => { });
    }

    // Create now playing embed
    const embed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle('Now Playing')
      .setDescription(`**[${track.info.title}](${track.info.uri})**`)
      .addFields([
        { name: 'Author', value: track.info.author || 'Unknown', inline: true },
        { name: 'Duration', value: formatTime(track.info.length), inline: true },
        { name: 'Requester', value: `${track.info.requester}`, inline: true }
      ])
      .setThumbnail(track.info.thumbnail);

    // Create control buttons
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

    // Send message and store reference
    const message = await channel.send({ embeds: [embed], components: [row] });
    player.message = message;
  }
};

function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
