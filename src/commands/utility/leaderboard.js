import { EmbedBuilder } from 'discord.js';
import Level from '../../models/Level.js';
import Guild from '../../models/Guild.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'View server leaderboards (coins, level, or messages)',
  usage: 'leaderboard [type] [page]',
  category: 'utility',
  cooldown: 10,

  async execute(message, args) {
    const guildId = message.guild.id;

    // Determine leaderboard type
    const validTypes = ['coins', 'level', 'messages', 'xp'];
    let type = 'level'; // default
    let page = 1;

    if (args[0] && validTypes.includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
      page = parseInt(args[1]) || 1;
    } else {
      page = parseInt(args[0]) || 1;
    }

    const perPage = 10;

    try {
      let leaderboard;
      let title;
      
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
      } else if (type === 'messages') {
        const Economy = (await import('../../models/Economy.js')).default;
        leaderboard = await Economy.find({ guildId, 'stats.messagesCount': { $gt: 0 } })
          .sort({ 'stats.messagesCount': -1 })
          .limit(perPage * 10)
          .lean();
        title = '💬 Messages Leaderboard';
      } else {
        // level or xp
        leaderboard = await Level.getLeaderboard(guildId, perPage * 10);
        title = '📊 Level Leaderboard';
      }

      if (!leaderboard.length) {
        const embed = await infoEmbed(guildId, 'Leaderboard',
          'No one has gained XP yet! Start chatting to earn XP and levels.'
        );
        return message.reply({ embeds: [embed] });
      }

      // Calculate pages
      const maxPage = Math.ceil(leaderboard.length / perPage);
      const currentPage = Math.max(1, Math.min(page, maxPage));
      const start = (currentPage - 1) * perPage;
      const end = start + perPage;

      // Create leaderboard text
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
            leaderboardText += `${GLYPHS.ARROW_RIGHT} ${(user.coins || 0).toLocaleString()} ${coinEmoji} ${coinName}\n\n`;
          } else if (type === 'messages') {
            leaderboardText += `${GLYPHS.ARROW_RIGHT} ${(user.stats?.messagesCount || 0).toLocaleString()} messages\n\n`;
          } else {
            leaderboardText += `${GLYPHS.ARROW_RIGHT} Level ${user.level || 0} • ${(user.totalXP || 0).toLocaleString()} XP\n\n`;
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
        .setColor('#667eea')
        .setFooter({
          text: `Page ${currentPage}/${maxPage}${userPosition ? ` • Your Rank: #${userPosition}` : ''} • Type: ${type}`
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      const { errorEmbed } = await import('../../utils/embeds.js');
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Leaderboard Error', 'Failed to fetch leaderboard. Please try again later.')]
      });
    }
  }
};
