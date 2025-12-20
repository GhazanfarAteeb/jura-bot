import { createPlayerButtons, createNowPlayingEmbed } from '../../music/utils/PlayerEmbeds.js';
import logger from '../../utils/logger.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // Handle button interactions for music player
    if (interaction.isButton()) {
      const { customId, guild, member, channel } = interaction;

      // Music player buttons
      if (customId.startsWith('music_')) {
        const riffyManager = client.riffyManager;
        const player = riffyManager?.getPlayer(guild.id);

        if (!player) {
          return interaction.reply({
            content: '❌ No music is currently playing!',
            ephemeral: true
          });
        }

        // Check if user is in voice channel
        const memberVoiceChannel = member.voice.channel;
        const botVoiceChannel = guild.members.cache.get(client.user.id)?.voice.channel;

        if (!memberVoiceChannel || memberVoiceChannel.id !== botVoiceChannel?.id) {
          return interaction.reply({
            content: '❌ You need to be in the same voice channel as me to use player controls!',
            ephemeral: true
          });
        }

        try {
          switch (customId) {
            case 'music_pause':
              player.pause(!player.paused);
              await interaction.reply({
                content: player.paused ? '⏸️ Paused' : '▶️ Resumed',
                ephemeral: true
              });

              // Update buttons
              const newButtons = createPlayerButtons(player);
              await interaction.message.edit({ components: [newButtons] });
              break;

            case 'music_skip':
              if (!player.current) {
                return interaction.reply({
                  content: '❌ No track is currently playing!',
                  ephemeral: true
                });
              }

              const skippedTrack = player.current.info.title;
              player.stop();

              await interaction.reply({
                content: `⏭️ Skipped: **${skippedTrack}**`,
                ephemeral: true
              });
              break;

            case 'music_previous':
              await interaction.reply({
                content: '⏮️ Previous track feature coming soon!',
                ephemeral: true
              });
              break;

            case 'music_stop':
              player.destroy();

              await interaction.reply({
                content: '⏹️ Stopped playback and cleared queue',
                ephemeral: true
              });

              // Disable all buttons
              const disabledButtons = createPlayerButtons(player, true);
              await interaction.message.edit({ components: [disabledButtons] });
              break;

            case 'music_loop':
              let newLoop;
              if (player.loop === 'none' || !player.loop) {
                newLoop = 'track';
                player.setLoop('track');
              } else if (player.loop === 'track') {
                newLoop = 'queue';
                player.setLoop('queue');
              } else {
                newLoop = 'none';
                player.setLoop('none');
              }

              const loopEmoji = newLoop === 'track' ? '🔂' : newLoop === 'queue' ? '🔁' : '➡️';
              const loopText = newLoop === 'track' ? 'Track' : newLoop === 'queue' ? 'Queue' : 'Off';

              await interaction.reply({
                content: `${loopEmoji} Loop: **${loopText}**`,
                ephemeral: true
              });

              // Update buttons
              const updatedButtons = createPlayerButtons(player);
              await interaction.message.edit({ components: [updatedButtons] });
              break;

            default:
              await interaction.reply({
                content: '❌ Unknown button interaction!',
                ephemeral: true
              });
          }
        } catch (error) {
          logger.error('[Button Interaction] Error:', error);

          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '❌ An error occurred while processing your request!',
              ephemeral: true
            });
          }
        }
      }

      // Queue pagination buttons
      if (customId.startsWith('queue_')) {
        // Handled in queue command
        return;
      }
    }
  }
};
