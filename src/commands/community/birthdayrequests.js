import { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BirthdayRequest } from '../../models/Birthday.js';
import Guild from '../../models/Guild.js';
import { errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { MONTH_NAMES } from './requestbirthday.js';

export default {
  name: 'birthdayrequests',
  description: 'View birthday tickets',
  usage: 'birthdayrequests [open|all|approved|rejected]',
  aliases: ['bdayrequests', 'bdaytickets', 'birthdaytickets'],
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

    const filter = args[0]?.toLowerCase() || 'open';
    const validFilters = ['open', 'all', 'approved', 'rejected', 'cancelled'];
    
    if (!validFilters.includes(filter)) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 
          `Invalid filter! Use: \`${validFilters.join('`, `')}\``)]
      });
    }

    try {
      const query = filter === 'all' 
        ? { guildId } 
        : { guildId, status: filter };

      const requests = await BirthdayRequest.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(25);

      // Count stats
      const stats = await BirthdayRequest.aggregate([
        { $match: { guildId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const statCounts = { open: 0, approved: 0, rejected: 0, cancelled: 0 };
      stats.forEach(s => { statCounts[s._id] = s.count; });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎫 Birthday Ticket Dashboard')
        .setDescription(
          `**Status Filters:**\n` +
          `🎫 Open: **${statCounts.open}** | ` +
          `✅ Approved: **${statCounts.approved}** | ` +
          `❌ Rejected: **${statCounts.rejected}** | ` +
          `🚫 Cancelled: **${statCounts.cancelled}**\n\n` +
          `Currently showing: **${filter.toUpperCase()}** (${requests.length} tickets)`
        );

      if (requests.length === 0) {
        embed.addFields({
          name: '📭 No Tickets',
          value: `No ${filter} birthday tickets found.`,
          inline: false
        });
      } else {
        const priorityOrder = { high: 1, normal: 2, low: 3 };
        const sortedRequests = requests.sort((a, b) => 
          (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
        );

        for (const request of sortedRequests.slice(0, 10)) {
          const user = await message.client.users.fetch(request.userId).catch(() => null);
          const { month, day, year } = request.requestedBirthday;
          const dateStr = `${MONTH_NAMES[month - 1]} ${day}${year ? `, ${year}` : ''}`;
          const ticketNum = request.getFormattedTicketNumber();
          
          const statusEmoji = { open: '🎫', approved: '✅', rejected: '❌', cancelled: '🚫' };
          const priorityEmoji = { low: '🟢', normal: '🟡', high: '🔴' };
          
          let fieldValue = `**Birthday:** ${dateStr}\n` +
            `**Status:** ${statusEmoji[request.status] || '❓'} ${request.status}\n` +
            `**Priority:** ${priorityEmoji[request.priority] || '🟡'} ${request.priority || 'normal'}`;

          if (request.status !== 'open' && request.reviewedBy) {
            fieldValue += `\n**Reviewer:** <@${request.reviewedBy}>`;
          }

          if (request.staffNotes && request.staffNotes.length > 0) {
            fieldValue += `\n**Notes:** ${request.staffNotes.length}`;
          }

          embed.addFields({
            name: `${ticketNum} - ${user?.tag || 'Unknown User'}`,
            value: fieldValue,
            inline: true
          });
        }

        if (requests.length > 10) {
          embed.addFields({
            name: '📄 More Tickets',
            value: `And ${requests.length - 10} more...`,
            inline: false
          });
        }
      }

      embed.setFooter({ text: `Use !birthdayrequests <open|approved|rejected|all> to filter` });
      embed.setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('bday_list_open')
            .setLabel(`Open (${statCounts.open})`)
            .setEmoji('🎫')
            .setStyle(filter === 'open' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('bday_list_approved')
            .setLabel(`Approved (${statCounts.approved})`)
            .setEmoji('✅')
            .setStyle(filter === 'approved' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('bday_list_rejected')
            .setLabel(`Rejected (${statCounts.rejected})`)
            .setEmoji('❌')
            .setStyle(filter === 'rejected' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('bday_list_all')
            .setLabel('All')
            .setEmoji('📋')
            .setStyle(filter === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

      message.reply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Error fetching birthday tickets:', error);
      message.reply({
        embeds: [await errorEmbed(guildId, 'Failed to fetch birthday tickets.')]
      });
    }
  }
};
