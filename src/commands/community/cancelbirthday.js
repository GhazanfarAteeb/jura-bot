import { EmbedBuilder } from 'discord.js';
import { BirthdayRequest } from '../../models/Birthday.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { createTicketEmbed, createTicketButtons } from './requestbirthday.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'cancelbirthday',
  description: 'Cancel your pending birthday request',
  usage: 'cancelbirthday',
  aliases: ['cancelbday', 'cancelticket'],
  category: 'community',
  execute: async (message, args) => {
    const guildId = message.guild.id;
    const userId = message.author.id;

    try {
      // Find user's open request
      const request = await BirthdayRequest.findOne({
        userId,
        guildId,
        status: 'open'
      });

      if (!request) {
        return message.reply({
          embeds: [await infoEmbed(guildId, 'No Open Ticket',
            'You don\'t have an open birthday request to cancel.')]
        });
      }

      const ticketNum = request.getFormattedTicketNumber();

      // Update status
      request.status = 'cancelled';
      request.reviewedAt = new Date();
      await request.save();

      // Update ticket message if it exists
      if (request.ticketMessageId && request.ticketChannelId) {
        try {
          const channel = message.guild.channels.cache.get(request.ticketChannelId);
          if (channel) {
            const ticketMsg = await channel.messages.fetch(request.ticketMessageId).catch(() => null);
            if (ticketMsg) {
              const updatedEmbed = createTicketEmbed(request, message.author, request.currentBirthday);
              const updatedButtons = createTicketButtons(request, false);
              
              await ticketMsg.edit({
                content: `🚫 **Ticket Cancelled** by user`,
                embeds: [updatedEmbed],
                components: updatedButtons
              });
            }
          }
        } catch (err) {
          console.error('Failed to update ticket message:', err);
        }
      }

      const prefix = await getPrefix(guildId);
      const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle(`🚫 Ticket Cancelled ${ticketNum}`)
        .setDescription(
          `Your birthday request has been cancelled.\n\n` +
          `You can submit a new request anytime using \`${prefix}requestbirthday\`.`
        )
        .setFooter({ text: 'Birthday Ticket System' })
        .setTimestamp();

      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error cancelling birthday request:', error);
      message.reply({
        embeds: [await errorEmbed(guildId, 'Failed to cancel request. Please try again.')]
      });
    }
  }
};
