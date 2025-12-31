import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Level from '../../models/Level.js';
import Guild from '../../models/Guild.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'View server leaderboards (xp, coins, rep, or level)',
  usage: 'leaderboard [type] [page]',
  category: 'utility',
  cooldown: 10,

  async execute(message, args) {
    const guildId = message.guild.id;

    // Determine leaderboard type
    const validTypes = ['coins', 'level', 'lvl', 'messages', 'xp', 'rep', 'reputation'];
    let type = 'level'; // default to level
    let page = 1;

    if (args[0] && validTypes.includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
      // Normalize type
      if (type === 'lvl') type = 'level';
      if (type === 'reputation') type = 'rep';
      page = parseInt(args[1]) || 1;
    } else {
      page = parseInt(args[0]) || 1;
    }

    const perPage = 10;

    try {
      let leaderboard;
      let title;
      let typeLabel;

      // Get guild config for coin settings
      const guildConfig = await Guild.getGuild(guildId);
      const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
      const coinName = guildConfig.economy?.coinName || 'coins';

      // Get appropriate leaderboard based on type
      if (type === 'coins') {
        const Economy = (await import('../../models/Economy.js')).default;
        leaderboard = await Economy.find({ guildId, coins: { $gt: 0 } })
          .sort({ coins: -1 })
          .limit(perPage * 10)
          .lean();
        title = `${coinEmoji} ${coinName.charAt(0).toUpperCase() + coinName.slice(1)} Leaderboard`;
        typeLabel = 'coins';
      } else if (type === 'rep') {
        const Economy = (await import('../../models/Economy.js')).default;
        leaderboard = await Economy.find({ guildId, reputation: { $gt: 0 } })
          .sort({ reputation: -1 })
          .limit(perPage * 10)
          .lean();
        title = '⭐ Reputation Leaderboard';
        typeLabel = 'rep';
      } else if (type === 'messages') {
        const Economy = (await import('../../models/Economy.js')).default;
        leaderboard = await Economy.find({ guildId, 'stats.messagesCount': { $gt: 0 } })
          .sort({ 'stats.messagesCount': -1 })
          .limit(perPage * 10)
          .lean();
        title = '💬 Messages Leaderboard';
        typeLabel = 'messages';
      } else if (type === 'level') {
        // Level-based leaderboard (sorted by level first, then XP)
        leaderboard = await Level.find({ guildId, level: { $gt: 0 } })
          .sort({ level: -1, xp: -1 })
          .limit(perPage * 10)
          .lean();
        title = '🏆 Level Leaderboard';
        typeLabel = 'level';
      } else {
        // xp (default) - sorted by totalXP
        leaderboard = await Level.getLeaderboard(guildId, perPage * 10);
        title = '✨ XP Leaderboard';
        typeLabel = 'xp';
      }

      const totalEntries = leaderboard.length;

      if (!leaderboard.length) {
        const embed = await infoEmbed(guildId, title,
          'No one is on the leaderboard yet! Start chatting to earn XP and levels.'
        );

        // Still show disabled pagination buttons
        const row = createPaginationRow(1, 1, type, true);
        return message.reply({ embeds: [embed], components: [row] });
      }

      // Calculate pages
      const maxPage = Math.ceil(leaderboard.length / perPage);
      const currentPage = Math.max(1, Math.min(page, maxPage));
      const start = (currentPage - 1) * perPage;
      const end = start + perPage;

      // Create leaderboard embed
      const embed = await createLeaderboardEmbed(
        message, leaderboard, start, end, type, title,
        currentPage, maxPage, totalEntries, coinEmoji, coinName, guildConfig
      );

      // Create pagination buttons (always show, disabled if only 1 page)
      const row = createPaginationRow(currentPage, maxPage, type);

      const reply = await message.reply({ embeds: [embed], components: [row] });

      // Create collector for pagination
      const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 120000 // 2 minutes
      });

      collector.on('collect', async (i) => {
        const [action, , newPage] = i.customId.split('_');

        if (action === 'lb') {
          const targetPage = parseInt(newPage);
          const newStart = (targetPage - 1) * perPage;
          const newEnd = newStart + perPage;

          const newEmbed = await createLeaderboardEmbed(
            message, leaderboard, newStart, newEnd, type, title,
            targetPage, maxPage, totalEntries, coinEmoji, coinName, guildConfig
          );

          const newRow = createPaginationRow(targetPage, maxPage, type);

          await i.update({ embeds: [newEmbed], components: [newRow] });
        }
      });

      collector.on('end', async () => {
        // Disable all buttons when collector ends
        const disabledRow = createPaginationRow(currentPage, maxPage, type, true);
        await reply.edit({ components: [disabledRow] }).catch(() => { });
      });

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      const { errorEmbed } = await import('../../utils/embeds.js');
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Leaderboard Error', 'Failed to fetch leaderboard. Please try again later.')]
      });
    }
  }
};

// Create leaderboard embed
async function createLeaderboardEmbed(message, leaderboard, start, end, type, title, currentPage, maxPage, totalEntries, coinEmoji, coinName, guildConfig) {
  const medals = ['🥇', '🥈', '🥉'];
  let leaderboardText = '';

  for (let i = start; i < Math.min(end, leaderboard.length); i++) {
    const user = leaderboard[i];
    const position = i + 1;
    const medal = position <= 3 ? medals[position - 1] : `#${position}`;

    try {
      const member = await message.guild.members.fetch(user.userId).catch(() => null);
      const username = member ? member.user.username : user.username || 'Unknown User';

      leaderboardText += `${medal} **${username}**\n`;

      // Display different stats based on type
      if (type === 'coins') {
        leaderboardText += `${GLYPHS.ARROW_RIGHT} ${(user.coins || 0).toLocaleString()} ${coinEmoji}\n\n`;
      } else if (type === 'rep') {
        leaderboardText += `${GLYPHS.ARROW_RIGHT} ${(user.reputation || 0).toLocaleString()} ⭐ reputation\n\n`;
      } else if (type === 'messages') {
        leaderboardText += `${GLYPHS.ARROW_RIGHT} ${(user.stats?.messagesCount || 0).toLocaleString()} messages\n\n`;
      } else if (type === 'level') {
        leaderboardText += `${GLYPHS.ARROW_RIGHT} Level **${user.level || 0}** • ${(user.xp || 0).toLocaleString()} XP\n\n`;
      } else {
        // xp
        leaderboardText += `${GLYPHS.ARROW_RIGHT} ${(user.totalXP || 0).toLocaleString()} ✨ XP • Level ${user.level || 0}\n\n`;
      }
    } catch (error) {
      console.error('Error fetching member:', error);
    }
  }

  // Find user's position
  const userPosition = leaderboard.findIndex(u => u.userId === message.author.id) + 1;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(leaderboardText || 'No data available.')
    .setColor(guildConfig?.embedStyle?.color || '#667eea')
    .setThumbnail(message.guild.iconURL({ dynamic: true }))
    .setFooter({
      text: `Page ${currentPage}/${maxPage}${userPosition ? ` • Your Rank: #${userPosition}` : ''} • ${totalEntries} total entries`
    })
    .setTimestamp();

  return embed;
}

// Create pagination buttons row
function createPaginationRow(currentPage, maxPage, type, forceDisabled = false) {
  const firstDisabled = forceDisabled || currentPage <= 1;
  const prevDisabled = forceDisabled || currentPage <= 1;
  const nextDisabled = forceDisabled || currentPage >= maxPage;
  const lastDisabled = forceDisabled || currentPage >= maxPage;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_${type}_1`)
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(firstDisabled),
    new ButtonBuilder()
      .setCustomId(`lb_${type}_${currentPage - 1}`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(prevDisabled),
    new ButtonBuilder()
      .setCustomId(`lb_page_info`)
      .setLabel(`${currentPage}/${maxPage}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`lb_${type}_${currentPage + 1}`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(nextDisabled),
    new ButtonBuilder()
      .setCustomId(`lb_${type}_${maxPage}`)
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(lastDisabled)
  );
}
