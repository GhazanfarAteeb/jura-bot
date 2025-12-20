import Command from '../../structures/Command.js';
import { createQueueEmbed, createErrorEmbed } from '../utils/PlayerEmbeds.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import logger from '../../utils/logger.js';

export default class Queue extends Command {
  constructor(client) {
    super(client, {
      name: 'queue',
      description: 'Display the music queue with pagination',
      usage: 'queue [page]',
      category: 'Music',
      aliases: ['q', 'list'],
      cooldown: 3
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    const riffyManager = client.riffyManager;

    const player = riffyManager.getPlayer(message.guild.id);

    if (!player) {
      const embed = createErrorEmbed('No music is currently playing!');
      return message.reply({ embeds: [embed] });
    }

    const page = parseInt(args[0]) || 1;
    const pageSize = 10;
    const totalPages = Math.ceil(player.queue.length / pageSize) || 1;

    if (page < 1 || page > totalPages) {
      const embed = createErrorEmbed(`Invalid page number! Valid range: 1-${totalPages}`);
      return message.reply({ embeds: [embed] });
    }

    try {
      const embed = createQueueEmbed(player, client, page, pageSize);

      // Create pagination buttons
      const row = new ActionRowBuilder();

      if (totalPages > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`queue_first_${message.author.id}`)
            .setLabel('⏮️ First')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),

          new ButtonBuilder()
            .setCustomId(`queue_prev_${message.author.id}`)
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),

          new ButtonBuilder()
            .setCustomId(`queue_page_${message.author.id}`)
            .setLabel(`${page}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),

          new ButtonBuilder()
            .setCustomId(`queue_next_${message.author.id}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages),

          new ButtonBuilder()
            .setCustomId(`queue_last_${message.author.id}`)
            .setLabel('Last ⏭️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages)
        );
      }

      const components = totalPages > 1 ? [row] : [];
      const queueMessage = await message.reply({ embeds: [embed], components });

      // Collector for pagination buttons
      if (totalPages > 1) {
        const collector = queueMessage.createMessageComponentCollector({
          filter: i => i.user.id === message.author.id,
          time: 60000 // 1 minute
        });

        let currentPage = page;

        collector.on('collect', async interaction => {
          if (interaction.customId.startsWith('queue_first_')) {
            currentPage = 1;
          } else if (interaction.customId.startsWith('queue_prev_')) {
            currentPage = Math.max(1, currentPage - 1);
          } else if (interaction.customId.startsWith('queue_next_')) {
            currentPage = Math.min(totalPages, currentPage + 1);
          } else if (interaction.customId.startsWith('queue_last_')) {
            currentPage = totalPages;
          }

          const newEmbed = createQueueEmbed(player, client, currentPage, pageSize);

          // Update buttons
          row.components[0].setDisabled(currentPage === 1); // First
          row.components[1].setDisabled(currentPage === 1); // Previous
          row.components[2].setLabel(`${currentPage}/${totalPages}`); // Page
          row.components[3].setDisabled(currentPage === totalPages); // Next
          row.components[4].setDisabled(currentPage === totalPages); // Last

          await interaction.update({ embeds: [newEmbed], components: [row] });
        });

        collector.on('end', () => {
          row.components.forEach(button => button.setDisabled(true));
          queueMessage.edit({ components: [row] }).catch(() => { });
        });
      }
    } catch (error) {
      logger.error('[Queue Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while displaying the queue!');
      return message.reply({ embeds: [embed] });
    }
  }
}
