import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Birthday, { BirthdayRequest } from '../../models/Birthday.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

// Simple ID generator
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Month names for display
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Create the ticket embed for a birthday request
 */
function createTicketEmbed(request, user, currentBirthday = null) {
  const { month, day, year } = request.requestedBirthday;
  const dateStr = `${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}`;
  const ticketNum = request.getFormattedTicketNumber();
  
  // Status colors and icons
  const statusConfig = {
    open: { color: 0xFEE75C, emoji: '🎫', text: 'Open' },
    approved: { color: 0x57F287, emoji: '✅', text: 'Approved' },
    rejected: { color: 0xED4245, emoji: '❌', text: 'Rejected' },
    cancelled: { color: 0x95A5A6, emoji: '🚫', text: 'Cancelled' }
  };
  
  const status = statusConfig[request.status] || statusConfig.open;
  
  const embed = new EmbedBuilder()
    .setColor(status.color)
    .setAuthor({ 
      name: `Birthday Request ${ticketNum}`, 
      iconURL: user?.displayAvatarURL({ dynamic: true }) 
    })
    .setTitle(`${status.emoji} ${status.text}`)
    .setThumbnail(user?.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 Requester', value: `${user?.tag || 'Unknown'}\n<@${request.userId}>`, inline: true },
      { name: '🎂 Requested Birthday', value: dateStr, inline: true },
      { name: '📋 Status', value: `${status.emoji} ${status.text}`, inline: true }
    );

  // Current birthday if exists
  if (currentBirthday) {
    const currDate = `${MONTH_NAMES[currentBirthday.month - 1]} ${currentBirthday.day}${currentBirthday.year ? `, ${currentBirthday.year}` : ''}`;
    embed.addFields({ name: '📅 Current Birthday', value: currDate, inline: true });
  } else {
    embed.addFields({ name: '📅 Current Birthday', value: '*Not set*', inline: true });
  }

  // Priority
  const priorityEmoji = { low: '🟢', normal: '🟡', high: '🔴' };
  embed.addFields({ 
    name: '⚡ Priority', 
    value: `${priorityEmoji[request.priority] || '🟡'} ${(request.priority || 'normal').charAt(0).toUpperCase() + (request.priority || 'normal').slice(1)}`, 
    inline: true 
  });

  // Reason
  embed.addFields({ 
    name: '📝 Reason', 
    value: request.reason || 'No reason provided', 
    inline: false 
  });

  // If reviewed, show reviewer info
  if (request.status !== 'open' && request.reviewedBy) {
    embed.addFields({ 
      name: '👮 Reviewed By', 
      value: `<@${request.reviewedBy}>`, 
      inline: true 
    });
    embed.addFields({ 
      name: '🕐 Reviewed At', 
      value: `<t:${Math.floor(new Date(request.reviewedAt).getTime() / 1000)}:R>`, 
      inline: true 
    });
  }

  // Rejection reason if rejected
  if (request.status === 'rejected' && request.rejectionReason) {
    embed.addFields({ 
      name: '❌ Rejection Reason', 
      value: request.rejectionReason, 
      inline: false 
    });
  }

  // Staff notes
  if (request.staffNotes && request.staffNotes.length > 0) {
    const notesText = request.staffNotes.slice(-3).map(n => 
      `• ${n.note} - <@${n.staffId}>`
    ).join('\n');
    embed.addFields({ name: '📌 Staff Notes', value: notesText, inline: false });
  }

  embed.setFooter({ 
    text: `Ticket ID: ${request.requestId} • Created` 
  });
  embed.setTimestamp(request.createdAt);

  return embed;
}

/**
 * Create buttons for the ticket
 */
function createTicketButtons(request, isOpen = true) {
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  if (isOpen) {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`bday_ticket_approve_${request.requestId}`)
        .setLabel('Approve')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`bday_ticket_reject_${request.requestId}`)
        .setLabel('Reject')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`bday_ticket_note_${request.requestId}`)
        .setLabel('Add Note')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Secondary)
    );

    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`bday_ticket_priority_low_${request.requestId}`)
        .setLabel('Low')
        .setEmoji('🟢')
        .setStyle((request.priority || 'normal') === 'low' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bday_ticket_priority_normal_${request.requestId}`)
        .setLabel('Normal')
        .setEmoji('🟡')
        .setStyle((request.priority || 'normal') === 'normal' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bday_ticket_priority_high_${request.requestId}`)
        .setLabel('High')
        .setEmoji('🔴')
        .setStyle((request.priority || 'normal') === 'high' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bday_ticket_user_${request.requestId}`)
        .setLabel('View User')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
  } else {
    // Closed ticket - only show reopen button
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`bday_ticket_reopen_${request.requestId}`)
        .setLabel('Reopen')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(request.status === 'approved'),
      new ButtonBuilder()
        .setCustomId(`bday_ticket_user_${request.requestId}`)
        .setLabel('View User')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1];
  }
}

export default {
  name: 'requestbirthday',
  description: 'Request to set or change your birthday (requires staff approval)',
  usage: 'requestbirthday <month> <day> [year] [reason]',
  aliases: ['bdayrequest', 'birthdayrequest'],
  category: 'community',
  cooldown: 60, // 1 minute cooldown to prevent spam
  execute: async (message, args) => {
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (args.length < 2) {
      const prefix = await getPrefix(guildId);
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Please provide your birthday!\n\n' +
          `Usage: \`${prefix}requestbirthday <month> <day> [year] [reason]\`\n\n` +
          'Examples:\n' +
          `• \`${prefix}requestbirthday 12 25\` - December 25th\n` +
          `• \`${prefix}requestbirthday 12 25 2000\` - December 25th, 2000\n` +
          `• \`${prefix}requestbirthday 12 25 2000 My birthday was entered incorrectly\``)]
      });
    }

    const month = parseInt(args[0]);
    const day = parseInt(args[1]);
    let year = null;
    let reason = null;

    // Check if third arg is a year or start of reason
    if (args[2]) {
      const potentialYear = parseInt(args[2]);
      if (!isNaN(potentialYear) && potentialYear >= 1900 && potentialYear <= new Date().getFullYear()) {
        year = potentialYear;
        reason = args.slice(3).join(' ') || null;
      } else {
        reason = args.slice(2).join(' ');
      }
    }

    // Validate month (1-12)
    if (isNaN(month) || month < 1 || month > 12) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid month! Please use 1-12.')]
      });
    }

    // Validate day (1-31)
    if (isNaN(day) || day < 1 || day > 31) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid day! Please use 1-31.')]
      });
    }

    // Check if date exists
    const testDate = new Date(year || 2000, month - 1, day);
    if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid date! This day doesn\'t exist in this month.')]
      });
    }

    try {
      // Check for existing open request
      const existingRequest = await BirthdayRequest.findOne({
        userId,
        guildId,
        status: 'open'
      });

      if (existingRequest) {
        const ticketNum = existingRequest.getFormattedTicketNumber();
        const prefix = await getPrefix(guildId);
        return message.reply({
          embeds: [await errorEmbed(guildId, `You already have an open ticket (${ticketNum})!\n\n` +
            `Requested: **${existingRequest.requestedBirthday.month}/${existingRequest.requestedBirthday.day}` +
            `${existingRequest.requestedBirthday.year ? `/${existingRequest.requestedBirthday.year}` : ''}**\n\n` +
            'Please wait for staff to review your request.\n' +
            `Use \`${prefix}cancelbirthday\` to cancel your request.`)]
        });
      }

      // Check current birthday
      const currentBirthday = await Birthday.findOne({ userId, guildId });
      const dateStr = `${month}/${day}${year ? `/${year}` : ''}`;

      // If same as current birthday
      if (currentBirthday && 
          currentBirthday.birthday.month === month && 
          currentBirthday.birthday.day === day &&
          currentBirthday.birthday.year === year) {
        return message.reply({
          embeds: [await infoEmbed(guildId, 'Already Set', 
            'This is already your registered birthday!')]
        });
      }

      // Get next ticket number
      const ticketNumber = await BirthdayRequest.getNextTicketNumber(guildId);

      // Create the request
      const request = new BirthdayRequest({
        ticketNumber,
        requestId: generateRequestId(),
        userId,
        guildId,
        requestedBirthday: { month, day, year },
        currentBirthday: currentBirthday ? currentBirthday.birthday : null,
        reason: reason || 'No reason provided',
        status: 'open',
        priority: 'normal'
      });

      await request.save();

      const ticketNum = request.getFormattedTicketNumber();

      // Notify staff if there's a staff channel configured
      const guildConfig = await Guild.getGuild(guildId, message.guild.name);
      const staffChannel = guildConfig.channels?.staffChannel || guildConfig.channels?.logChannel;

      if (staffChannel) {
        try {
          const channel = message.guild.channels.cache.get(staffChannel);
          if (channel) {
            const ticketEmbed = createTicketEmbed(request, message.author, currentBirthday?.birthday);
            const buttons = createTicketButtons(request, true);
            
            const ticketMsg = await channel.send({ 
              content: `📬 **New Birthday Request** ${ticketNum}`,
              embeds: [ticketEmbed], 
              components: buttons 
            });
            
            // Save message reference for updates
            request.ticketMessageId = ticketMsg.id;
            request.ticketChannelId = channel.id;
            await request.save();
          }
        } catch (err) {
          console.error('Failed to create birthday ticket:', err);
        }
      }

      // Confirm to user
      const prefix = await getPrefix(guildId);
      const confirmEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`🎫 Ticket Created ${ticketNum}`)
        .setDescription(
          `Your birthday request has been submitted!\n\n` +
          `**Ticket Number:** ${ticketNum}\n` +
          `**Requested Birthday:** ${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}\n` +
          `**Reason:** ${reason || 'No reason provided'}\n\n` +
          `You will be notified when staff reviews your request.\n` +
          `Use \`${prefix}cancelbirthday\` to cancel this request.`
        )
        .setFooter({ text: 'Birthday Ticket System' })
        .setTimestamp();

      message.reply({ embeds: [confirmEmbed] });

    } catch (error) {
      console.error('Error creating birthday ticket:', error);
      message.reply({
        embeds: [await errorEmbed(guildId, 'Failed to create ticket. Please try again.')]
      });
    }
  }
};

// Export helper functions for use in button handler
export { createTicketEmbed, createTicketButtons, MONTH_NAMES };
