/**
 * Music Button Interaction Handler
 * Handles button clicks for music controls
 */

import Event from '../../structures/Event.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

class MusicButtonHandler extends Event {
  constructor(client, file) {
    super(client, file, {
      name: 'interactionCreate'
    });
  }

  async run(interaction) {
    // Only handle button interactions
    if (!interaction.isButton()) return;

    // Only handle music buttons
    if (!interaction.customId.startsWith('music_')) return;

    const player = this.client.riffy?.players.get(interaction.guildId);

    // Check if player exists
    if (!player) {
      return interaction.reply({
        content: '**Warning:** No active audio session detected, Master.',
        ephemeral: true
      });
    }

    // Check if user is in voice channel
    const memberChannel = interaction.member?.voice?.channelId;
    const clientChannel = interaction.guild?.members?.me?.voice?.channelId;

    if (!memberChannel) {
      return interaction.reply({
        content: '**Warning:** Voice channel presence required for this function, Master.',
        ephemeral: true
      });
    }

    if (clientChannel && memberChannel !== clientChannel) {
      return interaction.reply({
        content: '**Warning:** Voice channel synchronization required, Master. Please join my current channel.',
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    try {
      switch (interaction.customId) {
        case 'music_pause':
          await this.handlePause(interaction, player);
          break;
        case 'music_play':
          await this.handleResume(interaction, player);
          break;
        case 'music_skip':
          await this.handleSkip(interaction, player);
          break;
        case 'music_disconnect':
          await this.handleDisconnect(interaction, player);
          break;
        case 'music_shuffle':
          await this.handleShuffle(interaction, player);
          break;
        case 'music_loop':
          await this.handleLoop(interaction, player);
          break;
      }
    } catch (error) {
      this.client.logger.error('Error handling music button:', error);
      await interaction.followUp({
        content: '**Error:** Processing failure detected. Please retry, Master.',
        ephemeral: true
      });
    }
  }

  async handlePause(interaction, player) {
    player.pause(true);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_disconnect')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏹️'),
        new ButtonBuilder()
          .setCustomId('music_play')
          .setStyle(ButtonStyle.Success)
          .setEmoji('▶️'),
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

    await interaction.message.edit({ components: [row] });
  }

  async handleResume(interaction, player) {
    player.pause(false);

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

    await interaction.message.edit({ components: [row] });
  }

  async handleSkip(interaction, player) {
    player.stop();

    await interaction.followUp({
      content: '⏭️ Skipped the current track.',
      ephemeral: true
    });
  }

  async handleDisconnect(interaction, player) {
    player.destroy();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_disconnect')
          .setStyle(ButtonStyle.Danger)
          .setLabel('Disconnected')
          .setEmoji('⏹️')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_pause')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏸️')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏭️')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_shuffle')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔀')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_loop')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔁')
          .setDisabled(true)
      );

    await interaction.message.edit({ components: [row] });
  }

  async handleShuffle(interaction, player) {
    if (player.queue.length < 2) {
      return interaction.followUp({
        content: '**Notice:** Insufficient queue entries for randomization, Master.',
        ephemeral: true
      });
    }

    // Shuffle the queue
    for (let i = player.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
    }

    await interaction.followUp({
      content: '🔀 Queue shuffled!',
      ephemeral: true
    });
  }

  async handleLoop(interaction, player) {
    // Toggle loop modes: none -> track -> queue -> none
    if (!player.loop || player.loop === 'none') {
      player.setLoop('track');
      await interaction.followUp({
        content: '🔂 Looping current track.',
        ephemeral: true
      });
    } else if (player.loop === 'track') {
      player.setLoop('queue');
      await interaction.followUp({
        content: '🔁 Looping entire queue.',
        ephemeral: true
      });
    } else {
      player.setLoop('none');
      await interaction.followUp({
        content: '➡️ Loop disabled.',
        ephemeral: true
      });
    }
  }
}

export default MusicButtonHandler;
