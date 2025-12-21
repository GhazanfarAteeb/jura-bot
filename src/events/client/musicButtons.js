import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const player = client.riffyManager.riffy.players.get(interaction.guild.id);

    if (interaction.customId === 'pause') {
      await interaction.deferUpdate();

      if (!player) return interaction.followUp({ content: `The player doesn't exist`, ephemeral: true });

      player.pause(true);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disconnect')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏺'),
          new ButtonBuilder()
            .setCustomId('play')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('▶'),
          new ButtonBuilder()
            .setCustomId('skip')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏭')
        );

      return await interaction.message.edit({ components: [row] });

    } else if (interaction.customId === 'play') {
      await interaction.deferUpdate();

      if (!player) return interaction.followUp({ content: `The player doesn't exist`, ephemeral: true });

      player.pause(false);

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

      return await interaction.message.edit({ components: [row] });

    } else if (interaction.customId === 'skip') {
      await interaction.deferUpdate();

      if (!player) return interaction.followUp({ content: `The player doesn't exist`, ephemeral: true });

      player.stop();

      return await interaction.followUp({ content: 'Skipped the current track', ephemeral: true });

    } else if (interaction.customId === 'disconnect') {
      await interaction.deferUpdate();

      if (!player) return interaction.followUp({ content: `The player doesn't exist`, ephemeral: true });

      player.destroy();

      return await interaction.followUp({ content: 'Disconnected from the voice channel', ephemeral: true });
    }
  }
};
