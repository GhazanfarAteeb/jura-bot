import { PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
  name: 'purge',
  description: 'Delete multiple messages',
  usage: '<amount> [@user]',
  aliases: ['clear', 'clean', 'delete'],
  permissions: {
    user: PermissionFlagsBits.ManageMessages,
    client: PermissionFlagsBits.ManageMessages
  },
  cooldown: 3,

  async execute(message, args) {
    if (!args[0]) {
      const embed = await errorEmbed(message.guild.id, 'Protocol Parameters',
        `**Notice:** Correct syntax required, Master.\n\`purge <amount> [@user]\``
      );
      return message.reply({ embeds: [embed] });
    }

    const amount = parseInt(args[0]);

    // Discord max is 100, but we fetch amount+1 to include the command message
    // So limit to 99 to avoid exceeding 100
    if (isNaN(amount) || amount < 1 || amount > 99) {
      const embed = await errorEmbed(message.guild.id, 'Invalid Quantity',
        `**Warning:** Value must be between 1 and 99, Master.`
      );
      return message.reply({ embeds: [embed] });
    }

    // Check if targeting specific user
    const targetUser = args[1] ? args[1].replace(/[<@!>]/g, '') : null;

    try {
      // Fetch messages (amount + 1 to include the command message)
      const messages = await message.channel.messages.fetch({ limit: amount + 1 });

      // Filter messages
      let toDelete;
      if (targetUser) {
        toDelete = messages.filter(m => m.author.id === targetUser);
      } else {
        toDelete = messages;
      }

      // Remove messages older than 14 days (Discord limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      toDelete = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);

      // Bulk delete
      const deleted = await message.channel.bulkDelete(toDelete, true);

      const embed = await successEmbed(message.guild.id, 'Data Purge Complete',
        `**Confirmed:** Removed **${deleted.size}** message records${targetUser ? ` from <@${targetUser}>` : ''}, Master.`
      );

      const reply = await message.channel.send({ embeds: [embed] });

      // Delete confirmation after 5 seconds
      setTimeout(() => reply.delete().catch(() => { }), 5000);

    } catch (error) {
      logger.error('Error purging messages:', error);
      const embed = await errorEmbed(message.guild.id, 'Purge Protocol Failed',
        `**Warning:** Unable to remove messages, Master. They may exceed the 14-day threshold.`
      );
      return message.reply({ embeds: [embed] });
    }
  }
};
