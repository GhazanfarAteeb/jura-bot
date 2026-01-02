/**
 * Music Track Start Event Handler
 * Sends now playing message with buttons when a track starts
 */

import Event from '../../structures/Event.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

class MusicTrackStart extends Event {
  constructor(client, file) {
    super(client, file, {
      name: 'musicTrackStart'
    });
  }

  async run(player, track) {
    try {
      const channel = this.client.channels.cache.get(player.textChannel);
      if (!channel) return;

      // Create control buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('music_disconnect')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏹️'),
          new ButtonBuilder()
            .setCustomId('music_pause')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏸️'),
          new ButtonBuilder()
            .setCustomId('music_skip')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏭️'),
          new ButtonBuilder()
            .setCustomId('music_shuffle')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔀'),
          new ButtonBuilder()
            .setCustomId('music_loop')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔁')
        );

      // Format duration
      const formatDuration = (ms) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#00CED1')
        .setAuthor({ name: '『 Audio Playback Initiated 』' })
        .setTitle(track.info.title)
        .setURL(track.info.uri)
        .setThumbnail(track.info.thumbnail || track.info.artworkUrl || null)
        .addFields(
          { name: '▸ Duration', value: formatDuration(track.info.length), inline: true },
          { name: '▸ Author', value: track.info.author || 'Unknown', inline: true },
          { name: '▸ Requested By', value: track.info.requester?.toString() || 'Unknown', inline: true }
        )
        .setTimestamp();

      // Delete previous message if exists
      if (player.message) {
        try {
          await player.message.delete();
        } catch (e) {
          // Message already deleted
        }
      }

      // Send new message
      const msg = await channel.send({
        embeds: [embed],
        components: [row]
      });

      // Store message reference in player
      player.message = msg;

    } catch (error) {
      this.client.logger.error('Error in musicTrackStart event:', error);
    }
  }
}

export default MusicTrackStart;
