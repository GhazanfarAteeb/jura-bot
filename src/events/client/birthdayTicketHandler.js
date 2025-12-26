import { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Birthday, { BirthdayRequest } from '../../models/Birthday.js';
import Guild from '../../models/Guild.js';
import { createTicketEmbed, createTicketButtons, MONTH_NAMES } from '../../commands/community/requestbirthday.js';
import { successEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle Birthday Ticket buttons
    if (interaction.isButton() && interaction.customId.startsWith('bday_ticket_')) {
      return handleTicketButton(interaction, client);
    }

    // Handle Birthday Ticket modals
    if (interaction.isModalSubmit() && interaction.customId.startsWith('bday_ticket_modal_')) {
      return handleTicketModal(interaction, client);
    }
  }
};

/**
 * Check if user has staff permissions
 */
async function isStaff(interaction) {
  const guildConfig = await Guild.getGuild(interaction.guild.id, interaction.guild.name);
  
  return interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) ||
    interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
    (guildConfig.roles?.staffRoles && guildConfig.roles.staffRoles.some(roleId =>
      interaction.member.roles.cache.has(roleId)
    ));
}

/**
 * Handle birthday ticket button interactions
 */
async function handleTicketButton(interaction, client) {
  const parts = interaction.customId.split('_');
  // Format: bday_ticket_<action>_[param]_<requestId>
  const action = parts[2];
  const requestId = parts[parts.length - 1];

  // Check staff permissions for most actions
  if (!['user'].includes(action)) {
    if (!await isStaff(interaction)) {
      return interaction.reply({
        content: '❌ You need staff permissions to manage birthday tickets.',
        ephemeral: true
      });
    }
  }

  // Find the request
  const request = await BirthdayRequest.findOne({ requestId });
  if (!request) {
    return interaction.reply({
      content: '❌ This ticket no longer exists.',
      ephemeral: true
    });
  }

  switch (action) {
    case 'approve':
      return approveTicket(interaction, request, client);
    case 'reject':
      return showRejectModal(interaction, request);
    case 'note':
      return showNoteModal(interaction, request);
    case 'priority':
      const priority = parts[3]; // low, normal, high
      return updatePriority(interaction, request, priority, client);
    case 'user':
      return viewUser(interaction, request, client);
    case 'reopen':
      return reopenTicket(interaction, request, client);
    default:
      return interaction.reply({ content: '❌ Unknown action.', ephemeral: true });
  }
}

/**
 * Approve a birthday ticket
 */
async function approveTicket(interaction, request, client) {
  const guildId = request.guildId;
  const userId = request.userId;
  const { month, day, year } = request.requestedBirthday;

  // Find or create birthday
  let birthday = await Birthday.findOne({ guildId, userId });
  const targetUser = await client.users.fetch(userId).catch(() => null);

  if (birthday) {
    birthday.birthday = { month, day, year };
    birthday.source = 'request';
    birthday.setBy = interaction.user.id;
    birthday.verified = true;
    birthday.verifiedBy = interaction.user.id;
    birthday.verifiedAt = new Date();
    if (targetUser) birthday.username = targetUser.username;
  } else {
    birthday = new Birthday({
      guildId,
      userId,
      username: targetUser?.username,
      birthday: { month, day, year },
      source: 'request',
      setBy: interaction.user.id,
      verified: true,
      verifiedBy: interaction.user.id,
      verifiedAt: new Date()
    });
  }

  await birthday.save();

  // Update request status
  request.status = 'approved';
  request.reviewedBy = interaction.user.id;
  request.reviewedAt = new Date();
  await request.save();

  // Check if today is their birthday
  const today = new Date();
  const isBirthdayToday = month === (today.getMonth() + 1) && day === today.getDate();

  let celebrationSent = false;
  const guildConfig = await Guild.getGuild(guildId, interaction.guild.name);
  const birthdayChannel = guildConfig.features?.birthdaySystem?.channel || guildConfig.channels?.birthdayChannel;

  // Celebrate if it's their birthday today
  if (isBirthdayToday && birthdayChannel) {
    const alreadyCelebrated = birthday.lastCelebrated && 
      new Date(birthday.lastCelebrated).toDateString() === today.toDateString();
    
    if (!alreadyCelebrated) {
      try {
        const channel = interaction.guild.channels.cache.get(birthdayChannel);
        if (channel) {
          let celebrationMessage = guildConfig.features?.birthdaySystem?.message || '🎉 Happy Birthday {user}! 🎂';
          celebrationMessage = celebrationMessage.replace('{user}', `<@${userId}>`);

          const age = birthday.getAge();
          if (age && birthday.showAge) {
            celebrationMessage += `\n🎈 Turning ${age} today!`;
          }

          const celebrationEmbed = await successEmbed(guildId, 
            `${GLYPHS.SPARKLE} Birthday Celebration!`, 
            celebrationMessage
          );
          celebrationEmbed.setColor(0xFF69B4);
          
          if (targetUser) {
            celebrationEmbed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }));
          }

          await channel.send({ content: '@everyone', embeds: [celebrationEmbed] });
          
          birthday.lastCelebrated = new Date();
          birthday.notificationSent = true;
          await birthday.save();
          
          celebrationSent = true;
        }
      } catch (err) {
        console.error('Failed to send birthday celebration:', err);
      }
    }
  }

  // Try to DM the user
  if (targetUser) {
    try {
      const ticketNum = request.getFormattedTicketNumber();
      const dmEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`✅ Ticket ${ticketNum} Approved`)
        .setDescription(
          `Your birthday request in **${interaction.guild.name}** has been approved!\n\n` +
          `**Birthday:** ${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}\n` +
          `**Approved by:** ${interaction.user.tag}`
        )
        .setFooter({ text: 'Birthday Ticket System' })
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (err) {
      // User has DMs disabled
    }
  }

  // Update the ticket message
  const updatedEmbed = createTicketEmbed(request, targetUser, request.currentBirthday);
  const updatedButtons = createTicketButtons(request, false);

  let description = `Birthday has been set for <@${userId}>`;
  if (isBirthdayToday && celebrationSent) {
    description += '\n\n🎉 **It\'s their birthday today!** Celebration sent!';
  }

  await interaction.update({
    content: `✅ **Ticket Approved** by ${interaction.user.tag}`,
    embeds: [updatedEmbed],
    components: updatedButtons
  });
}

/**
 * Show reject modal
 */
async function showRejectModal(interaction, request) {
  const modal = new ModalBuilder()
    .setCustomId(`bday_ticket_modal_reject_${request.requestId}`)
    .setTitle('Reject Birthday Request');

  const reasonInput = new TextInputBuilder()
    .setCustomId('rejection_reason')
    .setLabel('Reason for rejection')
    .setPlaceholder('Enter a reason for rejecting this request...')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  await interaction.showModal(modal);
}

/**
 * Show add note modal
 */
async function showNoteModal(interaction, request) {
  const modal = new ModalBuilder()
    .setCustomId(`bday_ticket_modal_note_${request.requestId}`)
    .setTitle('Add Staff Note');

  const noteInput = new TextInputBuilder()
    .setCustomId('staff_note')
    .setLabel('Note')
    .setPlaceholder('Add a note to this ticket...')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(200)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
  await interaction.showModal(modal);
}

/**
 * Update ticket priority
 */
async function updatePriority(interaction, request, priority, client) {
  request.priority = priority;
  await request.save();

  const targetUser = await client.users.fetch(request.userId).catch(() => null);
  const updatedEmbed = createTicketEmbed(request, targetUser, request.currentBirthday);
  const updatedButtons = createTicketButtons(request, request.status === 'open');

  await interaction.update({
    embeds: [updatedEmbed],
    components: updatedButtons
  });
}

/**
 * View user info
 */
async function viewUser(interaction, request, client) {
  const targetUser = await client.users.fetch(request.userId).catch(() => null);
  const member = await interaction.guild.members.fetch(request.userId).catch(() => null);

  if (!targetUser) {
    return interaction.reply({
      content: '❌ Could not fetch user information.',
      ephemeral: true
    });
  }

  // Get user's birthday history
  const birthday = await Birthday.findOne({ 
    guildId: request.guildId, 
    userId: request.userId 
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 User', value: `${targetUser.tag}\n<@${targetUser.id}>`, inline: true },
      { name: '🆔 ID', value: targetUser.id, inline: true },
      { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true }
    );

  if (member) {
    embed.addFields({
      name: '📥 Joined Server',
      value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
      inline: true
    });
  }

  if (birthday) {
    const { month, day, year } = birthday.birthday;
    embed.addFields({
      name: '🎂 Current Birthday',
      value: `${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}`,
      inline: true
    });
    embed.addFields({
      name: '📋 Source',
      value: birthday.source || 'Unknown',
      inline: true
    });
  } else {
    embed.addFields({
      name: '🎂 Current Birthday',
      value: '*Not set*',
      inline: true
    });
  }

  // Previous requests
  const previousRequests = await BirthdayRequest.find({
    guildId: request.guildId,
    userId: request.userId
  }).sort({ createdAt: -1 }).limit(5);

  if (previousRequests.length > 1) {
    const historyText = previousRequests.slice(0, 5).map(r => {
      const statusEmoji = { open: '🎫', approved: '✅', rejected: '❌', cancelled: '🚫' };
      return `${statusEmoji[r.status] || '❓'} ${r.getFormattedTicketNumber()} - ${r.status}`;
    }).join('\n');
    embed.addFields({ name: '📜 Request History', value: historyText, inline: false });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Reopen a ticket
 */
async function reopenTicket(interaction, request, client) {
  if (request.status === 'approved') {
    return interaction.reply({
      content: '❌ Cannot reopen an approved ticket.',
      ephemeral: true
    });
  }

  request.status = 'open';
  request.reviewedBy = null;
  request.reviewedAt = null;
  request.rejectionReason = null;
  request.staffNotes.push({
    staffId: interaction.user.id,
    note: 'Ticket reopened',
    createdAt: new Date()
  });
  await request.save();

  const targetUser = await client.users.fetch(request.userId).catch(() => null);
  const updatedEmbed = createTicketEmbed(request, targetUser, request.currentBirthday);
  const updatedButtons = createTicketButtons(request, true);

  await interaction.update({
    content: `🔄 **Ticket Reopened** by ${interaction.user.tag}`,
    embeds: [updatedEmbed],
    components: updatedButtons
  });
}

/**
 * Handle ticket modal submissions
 */
async function handleTicketModal(interaction, client) {
  const parts = interaction.customId.split('_');
  const action = parts[3]; // reject or note
  const requestId = parts[4];

  const request = await BirthdayRequest.findOne({ requestId });
  if (!request) {
    return interaction.reply({
      content: '❌ This ticket no longer exists.',
      ephemeral: true
    });
  }

  const targetUser = await client.users.fetch(request.userId).catch(() => null);

  switch (action) {
    case 'reject': {
      const reason = interaction.fields.getTextInputValue('rejection_reason');
      
      request.status = 'rejected';
      request.reviewedBy = interaction.user.id;
      request.reviewedAt = new Date();
      request.rejectionReason = reason;
      await request.save();

      // DM the user
      if (targetUser) {
        try {
          const ticketNum = request.getFormattedTicketNumber();
          const dmEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`❌ Ticket ${ticketNum} Rejected`)
            .setDescription(
              `Your birthday request in **${interaction.guild.name}** has been rejected.\n\n` +
              `**Reason:** ${reason}\n` +
              `**Rejected by:** ${interaction.user.tag}\n\n` +
              `If you believe this was a mistake, please contact server staff.`
            )
            .setFooter({ text: 'Birthday Ticket System' })
            .setTimestamp();
          await targetUser.send({ embeds: [dmEmbed] });
        } catch (err) {
          // User has DMs disabled
        }
      }

      const updatedEmbed = createTicketEmbed(request, targetUser, request.currentBirthday);
      const updatedButtons = createTicketButtons(request, false);

      await interaction.update({
        content: `❌ **Ticket Rejected** by ${interaction.user.tag}`,
        embeds: [updatedEmbed],
        components: updatedButtons
      });
      break;
    }

    case 'note': {
      const note = interaction.fields.getTextInputValue('staff_note');
      
      request.staffNotes.push({
        staffId: interaction.user.id,
        note: note,
        createdAt: new Date()
      });
      await request.save();

      const updatedEmbed = createTicketEmbed(request, targetUser, request.currentBirthday);
      const updatedButtons = createTicketButtons(request, request.status === 'open');

      await interaction.update({
        embeds: [updatedEmbed],
        components: updatedButtons
      });
      break;
    }

    default:
      return interaction.reply({ content: '❌ Unknown action.', ephemeral: true });
  }
}
