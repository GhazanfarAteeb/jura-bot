import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Level from '../../models/Level.js';
import Guild from '../../models/Guild.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'top',
    description: 'View server leaderboards',
    usage: 'top <coins|rep|level> [page]',
    category: 'utility',
    aliases: ['leaderboards', 'rankings'],
    cooldown: 10,
    
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const type = args[0]?.toLowerCase() || 'coins';
        const page = parseInt(args[1]) || 1;
        const perPage = 10;
        
        try {
            const guildConfig = await Guild.getGuild(guildId);
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            
            let leaderboard, title, emoji, formatEntry;
            
            switch(type) {
                case 'coins':
                case 'coin':
                case 'money':
                case 'balance':
                    leaderboard = await Economy.find({ guildId })
                        .sort({ coins: -1 })
                        .limit(perPage * 10);
                    
                    title = `${coinEmoji} Coin Leaderboard`;
                    emoji = coinEmoji;
                    formatEntry = (user, i) => {
                        const pos = i + 1;
                        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;
                        return `${medal} **${user.username || 'Unknown'}**\n${GLYPHS.ARROW_RIGHT} ${user.coins} ${coinEmoji} • Bank: ${user.bank} ${coinEmoji}\n`;
                    };
                    break;
                    
                case 'rep':
                case 'reputation':
                    leaderboard = await Economy.find({ guildId })
                        .sort({ reputation: -1 })
                        .limit(perPage * 10);
                    
                    title = '⭐ Reputation Leaderboard';
                    emoji = '⭐';
                    formatEntry = (user, i) => {
                        const pos = i + 1;
                        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;
                        return `${medal} **${user.username || 'Unknown'}**\n${GLYPHS.ARROW_RIGHT} ${user.reputation || 0} ⭐ reputation\n`;
                    };
                    break;
                    
                case 'level':
                case 'levels':
                case 'xp':
                case 'rank':
                    leaderboard = await Level.getLeaderboard(guildId, perPage * 10);
                    
                    title = '📊 Level Leaderboard';
                    emoji = '🏆';
                    formatEntry = (user, i) => {
                        const pos = i + 1;
                        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;
                        return `${medal} **${user.username || 'Unknown'}**\n${GLYPHS.ARROW_RIGHT} Level ${user.level} • ${user.totalXP} Total XP\n`;
                    };
                    break;
                    
                default:
                    const helpEmbed = await infoEmbed(guildId, 'Leaderboard Types',
                        `**Available Leaderboards:**\n\n` +
                        `${GLYPHS.ARROW_RIGHT} \`!top coins\` - Richest members\n` +
                        `${GLYPHS.ARROW_RIGHT} \`!top rep\` - Most reputable members\n` +
                        `${GLYPHS.ARROW_RIGHT} \`!top level\` - Highest level members\n\n` +
                        `**Usage:** \`!top <type> [page]\`\n` +
                        `**Example:** \`!top coins 2\``
                    );
                    return message.reply({ embeds: [helpEmbed] });
            }
            
            if (!leaderboard.length) {
                return message.reply({
                    embeds: [await infoEmbed(guildId, title, 'No data available yet!')]
                });
            }
            
            // Calculate pages
            const maxPage = Math.ceil(leaderboard.length / perPage);
            const currentPage = Math.max(1, Math.min(page, maxPage));
            const start = (currentPage - 1) * perPage;
            const end = start + perPage;
            
            // Create leaderboard text
            let leaderboardText = '';
            
            for (let i = start; i < Math.min(end, leaderboard.length); i++) {
                const user = leaderboard[i];
                
                // Fetch username if not stored
                if (!user.username) {
                    try {
                        const member = await message.guild.members.fetch(user.userId).catch(() => null);
                        if (member) {
                            user.username = member.user.username;
                        }
                    } catch (error) {
                        // Ignore fetch errors
                    }
                }
                
                leaderboardText += formatEntry(user, i);
            }
            
            // Find user's position
            const userPosition = leaderboard.findIndex(u => u.userId === message.author.id) + 1;
            
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(leaderboardText)
                .setColor('#667eea')
                .setFooter({ 
                    text: `Page ${currentPage}/${maxPage}${userPosition ? ` • Your Rank: #${userPosition}` : ''}`
                })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            const { errorEmbed } = await import('../../utils/embeds.js');
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to fetch leaderboard. Please try again later.')]
            });
        }
    }
};
