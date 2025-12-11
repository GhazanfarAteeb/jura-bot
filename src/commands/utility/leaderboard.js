import { EmbedBuilder } from 'discord.js';
import Level from '../../models/Level.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'View the server XP leaderboard',
    usage: 'leaderboard [page]',
    category: 'utility',
    cooldown: 10,
    
    async execute(message, args) {
        const guildId = message.guild.id;
        const page = parseInt(args[0]) || 1;
        const perPage = 10;
        
        try {
            // Get leaderboard
            const leaderboard = await Level.getLeaderboard(guildId, perPage * 10);
            
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
                    leaderboardText += `${GLYPHS.ARROW_RIGHT} Level ${user.level} • ${user.totalXP} Total XP\n\n`;
                } catch (error) {
                    console.error('Error fetching member:', error);
                }
            }
            
            // Find user's position
            const userPosition = leaderboard.findIndex(u => u.userId === message.author.id) + 1;
            
            const embed = new EmbedBuilder()
                .setTitle(`${GLYPHS.TROPHY} Server Leaderboard`)
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
