import { Events } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Only handle AFK dismiss buttons
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('afk_dismiss_')) return;

    // Extract the user ID from the custom ID
    const userId = interaction.customId.replace('afk_dismiss_', '');

    // Only allow the mentioned user to dismiss
    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: '❌ Only the person who returned from AFK can dismiss this message.',
        ephemeral: true
      });
    }

    // Delete the message
    try {
      await interaction.message.delete();
    } catch (error) {
      // Message might already be deleted
      await interaction.reply({
        content: '✅ Message dismissed!',
        ephemeral: true
      }).catch(() => {});
    }
  }
};
