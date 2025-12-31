import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import Economy from '../../models/Economy.js';
import Level from '../../models/Level.js';
import Guild from '../../models/Guild.js';
import { infoEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'top',
    description: 'View server leaderboards with pagination',
    usage: 'top <coins|rep|level>',
    category: 'utility',
    aliases: ['leaderboards', 'rankings', 'lb'],
    cooldown: 5,
    slashCommand: true,
    
    async execute(message, args) {
        const guildId = message.guild.id;
        const type = args[0]?.toLowerCase() || 'coins';
        const perPage = 10;
        
        try {
            const guildConfig = await Guild.getGuild(guildId);
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            let leaderboard, title, formatEntry;
            
            switch(type) {
                case 'coins':
                case 'coin':
                case 'money':
                case 'balance':
                    leaderboard = await Economy.find({ guildId })
                        .sort({ coins: -1 })
                        .limit(100);
                    
                    title = `${coinEmoji} ${coinName.charAt(0).toUpperCase() + coinName.slice(1)} Leaderboard`;
                    formatEntry = (user, i) => {
                        const pos = i + 1;
                        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `\`#${pos}\``;
                        return `${medal} **${user.username || 'Unknown'}**\n${GLYPHS.ARROW_RIGHT} ${user.coins?.toLocaleString() || 0} ${coinEmoji} • Bank: ${user.bank?.toLocaleString() || 0} ${coinEmoji}\n`;
                    };
                    break;
                    
                case 'rep':
                case 'reputation':
                    leaderboard = await Economy.find({ guildId })
                        .sort({ reputation: -1 })
                        .limit(100);
                    
                    title = '⭐ Reputation Leaderboard';
                    formatEntry = (user, i) => {
                        const pos = i + 1;
                        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `\`#${pos}\``;
                        return `${medal} **${user.username || 'Unknown'}**\n${GLYPHS.ARROW_RIGHT} ${user.reputation?.toLocaleString() || 0} ⭐ reputation\n`;
                    };
                    break;
                    
                case 'level':
                case 'levels':
                case 'xp':
                case 'rank':
                    leaderboard = await Level.getLeaderboard(guildId, 100);
                    
                    title = '📊 Level Leaderboard';
                    formatEntry = (user, i) => {
                        const pos = i + 1;
                        const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `\`#${pos}\``;
                        return `${medal} **${user.username || 'Unknown'}**\n${GLYPHS.ARROW_RIGHT} Level ${user.level} • ${user.totalXP?.toLocaleString() || 0} Total XP\n`;
                    };
                    break;
                    
                default:
                    const prefix = await getPrefix(guildId);
                    const helpEmbed = await infoEmbed(guildId, 'Leaderboard Types',
                        `**Available Leaderboards:**\n\n` +
                        `${GLYPHS.ARROW_RIGHT} \`${prefix}top coins\` - Richest members\n` +
                        `${GLYPHS.ARROW_RIGHT} \`${prefix}top rep\` - Most reputable members\n` +
                        `${GLYPHS.ARROW_RIGHT} \`${prefix}top level\` - Highest level members\n\n` +
                        `**Usage:** \`${prefix}top <type>\`\n` +
                        `**Example:** \`${prefix}top coins\`\n\n` +
                        `*Use the arrow buttons to navigate pages!*`
                    );
                    return message.reply({ embeds: [helpEmbed] });
            }
            
            if (!leaderboard.length) {
                return message.reply({
                    embeds: [await infoEmbed(guildId, title, 'No data available yet!')]
                });
            }

            // Fetch usernames for all entries
            for (const user of leaderboard) {
                if (!user.username) {
                    try {
                        const member = await message.guild.members.fetch(user.userId).catch(() => null);
                        if (member) {
                            user.username = member.user.username;
                        }
                    } catch {
                        // Ignore fetch errors
                    }
                }
            }

            // Find user's position
            const userPosition = leaderboard.findIndex(u => u.userId === message.author.id) + 1;
            
            // Calculate pages
            const maxPage = Math.ceil(leaderboard.length / perPage);
            let currentPage = 1;

            // Function to generate embed for a specific page
            const generateEmbed = (page) => {
                const start = (page - 1) * perPage;
                const end = Math.min(start + perPage, leaderboard.length);
                
                let leaderboardText = '';
                for (let i = start; i < end; i++) {
                    leaderboardText += formatEntry(leaderboard[i], i);
                }

                return new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(leaderboardText || 'No data')
                    .setColor('#667eea')
                    .setFooter({ 
                        text: `Page ${page}/${maxPage}${userPosition ? ` • Your Rank: #${userPosition}` : ''} • ${leaderboard.length} total entries`
                    })
                    .setTimestamp();
            };

            // Function to generate buttons
            const generateButtons = (page, disabled = false) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('lb_first')
                            .setEmoji('⏮️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(disabled || page === 1),
                        new ButtonBuilder()
                            .setCustomId('lb_prev')
                            .setEmoji('◀️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(disabled || page === 1),
                        new ButtonBuilder()
                            .setCustomId('lb_page')
                            .setLabel(`${page}/${maxPage}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('lb_next')
                            .setEmoji('▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(disabled || page === maxPage),
                        new ButtonBuilder()
                            .setCustomId('lb_last')
                            .setEmoji('⏭️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(disabled || page === maxPage)
                    );
            };

            // Send initial message
            const reply = await message.reply({
                embeds: [generateEmbed(currentPage)],
                components: maxPage > 1 ? [generateButtons(currentPage)] : []
            });

            // Only add collector if there are multiple pages
            if (maxPage <= 1) return;

            // Create button collector
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000 // 2 minutes
            });

            collector.on('collect', async (interaction) => {
                // Only allow the command author to use buttons
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({
                        content: '❌ Only the person who used this command can navigate the leaderboard.',
                        ephemeral: true
                    });
                }

                switch (interaction.customId) {
                    case 'lb_first':
                        currentPage = 1;
                        break;
                    case 'lb_prev':
                        currentPage = Math.max(1, currentPage - 1);
                        break;
                    case 'lb_next':
                        currentPage = Math.min(maxPage, currentPage + 1);
                        break;
                    case 'lb_last':
                        currentPage = maxPage;
                        break;
                }

                await interaction.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [generateButtons(currentPage)]
                });
            });

            collector.on('end', async () => {
                // Disable buttons when collector expires
                try {
                    await reply.edit({
                        components: [generateButtons(currentPage, true)]
                    });
                } catch {
                    // Message may have been deleted
                }
            });
            
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to fetch leaderboard. Please try again later.')]
            });
        }
    }
};
