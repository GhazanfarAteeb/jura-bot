import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import Birthday, { BirthdayRequest } from '../../models/Birthday.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { createTicketEmbed, createTicketButtons, MONTH_NAMES } from './requestbirthday.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'approvebday',
  description: 'Approve a pending birthday request',
  usage: 'approvebday <request-id>',
  aliases: ['approvebirthday', 'bdayapprove'],
  category: 'community',
  permissions: [PermissionFlagsBits.ManageRoles],
  execute: async (message, args) => {
    const guildId = message.guild.id;

    // Check permissions
    const guildConfig = await Guild.getGuild(guildId, message.guild.name);
    const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageRoles) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      (guildConfig.roles.staffRoles && guildConfig.roles.staffRoles.some(roleId =>
        message.member.roles.cache.has(roleId)
      ));

    if (!isStaff) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'You need staff permissions to use this command!')]
      });
    }

    if (!args[0]) {
      const prefix = await getPrefix(guildId);
      return message.reply({
        embeds: [await errorEmbed(guildId, `Please provide a ticket number or ID!\n\nUsage: \`${prefix}approvebday <ticket-number>\`\n\nExamples:\n• \`${prefix}approvebday #0001\`\n• \`${prefix}approvebday 1\`\n\nUse \`${prefix}birthdayrequests\` to see open tickets.`)]
      });
    }

    const input = args[0].replace('#', '');

    try {
      // Find by ticket number or request ID
      let request;
      const inputAsNum = parseInt(input);
      
      if (!isNaN(inputAsNum)) {
        request = await BirthdayRequest.findOne({ guildId, ticketNumber: inputAsNum, status: 'open' });
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

      // Find or create birthday
      let birthday = await Birthday.findOne({ guildId, userId });
      const targetUser = await message.client.users.fetch(userId).catch(() => null);

      if (birthday) {
        birthday.birthday = { month, day, year };
        birthday.source = 'request';
        birthday.setBy = message.author.id;
        birthday.verified = true;
        birthday.verifiedBy = message.author.id;
        birthday.verifiedAt = new Date();
        if (targetUser) birthday.username = targetUser.username;
      } else {
        birthday = new Birthday({
          guildId,
          userId,
          username: targetUser?.username,
          birthday: { month, day, year },
          source: 'request',
          setBy: message.author.id,
          verified: true,
          verifiedBy: message.author.id,
          verifiedAt: new Date()
        });
      }

      await birthday.save();

      // Update request status
      request.status = 'approved';
      request.reviewedBy = message.author.id;
      request.reviewedAt = new Date();
      await request.save();

      // Check if today is their birthday
      const today = new Date();
      const isBirthdayToday = month === (today.getMonth() + 1) && day === today.getDate();
      
      let celebrationSent = false;
      const birthdayChannel = guildConfig.features.birthdaySystem?.channel || guildConfig.channels?.birthdayChannel;

      // Celebrate if it's their birthday today
      if (isBirthdayToday && birthdayChannel) {
        const alreadyCelebrated = birthday.lastCelebrated && 
          new Date(birthday.lastCelebrated).toDateString() === today.toDateString();
        
        if (!alreadyCelebrated) {
          try {
            const channel = message.guild.channels.cache.get(birthdayChannel);
            if (channel) {
              let celebrationMessage = guildConfig.features.birthdaySystem?.message || '🎉 Happy Birthday {user}! 🎂';
              celebrationMessage = celebrationMessage.replace('{user}', `<@${userId}>`);

              const age = birthday.getAge();
              if (age && birthday.showAge) {
                celebrationMessage += `\n🎈 Turning ${age} today!`;
              }

              const celebrationEmbed = await successEmbed(guildId, 
                `${GLYPHS.SPARKLE} Birthday Celebration!`, 
                celebrationMessage
              );
              celebrationEmbed.setColor('#FF69B4');
              
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
                content: `✅ **Ticket Approved** by ${message.author.tag}`,
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
          const ticketNum = request.getFormattedTicketNumber();
          const dmEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`✅ Ticket ${ticketNum} Approved`)
            .setDescription(
              `Your birthday request in **${message.guild.name}** has been approved!\n\n` +
              `**Birthday:** ${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}\n` +
              `**Approved by:** ${message.author.tag}`
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
      let description = `${GLYPHS.SUCCESS} Ticket ${ticketNumStr} approved!\n\n` +
        `**User:** ${targetUser?.tag || userId}\n` +
        `**Birthday:** ${dateStr}`;

      if (isBirthdayToday) {
        description += '\n\n🎉 **It\'s their birthday today!**';
        if (celebrationSent) {
          description += `\n📢 Celebration sent to <#${birthdayChannel}>`;
        }
      }

      const embed = await successEmbed(guildId, '✅ Request Approved', description);
      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error approving birthday request:', error);
      message.reply({
        embeds: [await errorEmbed(guildId, 'Failed to approve request. Please try again.')]
      });
    }
  }
};
