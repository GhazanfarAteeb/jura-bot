import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { BirthdayRequest } from '../../models/Birthday.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { createTicketEmbed, createTicketButtons, MONTH_NAMES } from './requestbirthday.js';

export default {
  name: 'rejectbday',
  description: 'Reject an open birthday ticket',
  usage: 'rejectbday <ticket-number> [reason]',
  aliases: ['rejectbirthday', 'bdayreject', 'denybday'],
  category: 'community',
  permissions: [PermissionFlagsBits.ManageRoles],
  execute: async (message, args) => {
    const guildId = message.guild.id;

    // Check permissions
    const guildConfig = await Guild.getGuild(guildId, message.guild.name);
    const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageRoles) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      (guildConfig.roles?.staffRoles && guildConfig.roles.staffRoles.some(roleId =>
        message.member.roles.cache.has(roleId)
      ));

    if (!isStaff) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'You need staff permissions to use this command!')]
      });
    }

    if (!args[0]) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Please provide a ticket number!\n\nUsage: `!rejectbday <ticket-number> [reason]`\n\nExamples:\n• `!rejectbday #0001 Invalid date`\n• `!rejectbday 1 Please provide proof`\n\nUse `!birthdayrequests` to see open tickets.')]
      });
    }

    const input = args[0].replace('#', '');
    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      // Find by ticket number or request ID
      let request;
      const ticketNum = parseInt(input);
      
      if (!isNaN(ticketNum)) {
        request = await BirthdayRequest.findOne({ guildId, ticketNumber: ticketNum, status: 'open' });
      }
      
      if (!request) {
        request = await BirthdayRequest.findOne({
          guildId,
          status: 'open',
          requestId: { $regex: `^${input}`, $options: 'i' }
        });
      }

      if (!request) {
        return message.reply({
          embeds: [await errorEmbed(guildId, 'Could not find an open ticket with that number/ID!')]
        });
      }

      const userId = request.userId;
      const { month, day, year } = request.requestedBirthday;

      // Update request status
      request.status = 'rejected';
      request.reviewedBy = message.author.id;
      request.reviewedAt = new Date();
      request.rejectionReason = reason;
      await request.save();

      const targetUser = await message.client.users.fetch(userId).catch(() => null);

      // Update ticket message if exists
      if (request.ticketMessageId && request.ticketChannelId) {
        try {
          const ticketChannel = message.guild.channels.cache.get(request.ticketChannelId);
          if (ticketChannel) {
            const ticketMsg = await ticketChannel.messages.fetch(request.ticketMessageId).catch(() => null);
            if (ticketMsg) {
              const updatedEmbed = createTicketEmbed(request, targetUser, request.currentBirthday);
              const updatedButtons = createTicketButtons(request, false);
              await ticketMsg.edit({
                content: `❌ **Ticket Rejected** by ${message.author.tag}`,
                embeds: [updatedEmbed],
                components: updatedButtons
              });
            }
          }
        } catch (err) {
          console.error('Failed to update ticket message:', err);
        }
      }

      // Try to DM the user
      if (targetUser) {
        try {
          const ticketNumStr = request.getFormattedTicketNumber();
          const dmEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`❌ Ticket ${ticketNumStr} Rejected`)
            .setDescription(
              `Your birthday request in **${message.guild.name}** has been rejected.\n\n` +
              `**Requested Birthday:** ${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}\n` +
              `**Reason:** ${reason}\n` +
              `**Rejected by:** ${message.author.tag}\n\n` +
              `If you believe this was a mistake, please contact server staff.`
            )
            .setFooter({ text: 'Birthday Ticket System' })
            .setTimestamp();
          await targetUser.send({ embeds: [dmEmbed] });
        } catch (err) {
          // User has DMs disabled
        }
      }

      // Confirm to staff
      const ticketNumStr = request.getFormattedTicketNumber();
      const dateStr = `${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}`;
      const embed = await successEmbed(guildId, `❌ Ticket ${ticketNumStr} Rejected`,
        `${GLYPHS.SUCCESS} Birthday ticket rejected!\n\n` +
        `**User:** ${targetUser?.tag || userId}\n` +
        `**Requested Birthday:** ${dateStr}\n` +
        `**Reason:** ${reason}`
      );

      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error rejecting birthday ticket:', error);
      message.reply({
        embeds: [await errorEmbed(guildId, 'Failed to reject ticket. Please try again.')]
      });
    }
  }
};
