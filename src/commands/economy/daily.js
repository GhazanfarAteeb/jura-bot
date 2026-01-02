import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { GLYPHS } from '../../utils/embeds.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'daily',
    description: 'Claim your daily coin reward',
    usage: 'daily',
    category: 'economy',
    aliases: ['dailyreward'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const economy = await Economy.getEconomy(userId, guildId);
            const guildConfig = await Guild.getGuild(guildId);
            
            // Get custom coin settings
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            // Try to claim daily
            const result = await economy.claimDaily();
            
            const embed = new EmbedBuilder()
                .setColor('#00CED1')
                .setAuthor({ 
                    name: message.author.tag, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle(`『 Daily Allocation 』`)
                .setDescription(`**Notice:** Daily resource allocation complete, Master.\n\nYou have received **${result.amount.toLocaleString()}** ${coinEmoji} ${coinName}.`)
                .addFields(
                    { 
                        name: '▸ Breakdown', 
                        value: `Base Allocation: **${result.baseReward.toLocaleString()}** ${coinName}\n` +
                               `Consistency Bonus: **+${result.streakBonus.toLocaleString()}** ${coinName}`, 
                        inline: true 
                    },
                    { 
                        name: '▸ Streak Data', 
                        value: `Current: **${result.streak}** day${result.streak > 1 ? 's' : ''}\n` +
                               `Record: **${economy.daily.longestStreak}** day${economy.daily.longestStreak > 1 ? 's' : ''}`, 
                        inline: true 
                    },
                    { 
                        name: `▸ Current Balance`, 
                        value: `**${economy.coins.toLocaleString()}** ${coinEmoji} ${coinName}`, 
                        inline: true 
                    }
                )
                .setFooter({ text: `${getRandomFooter()} | Return in 24 hours for continued allocation` })
                .setTimestamp();
            
            // Add streak milestone messages - Raphael style
            if (result.streak === 7) {
                embed.addFields({ 
                    name: '◈ Weekly Milestone Achieved', 
                    value: '*Impressive dedication detected. A 7-day consistency record has been logged, Master.*', 
                    inline: false 
                });
            } else if (result.streak === 30) {
                embed.addFields({ 
                    name: '◈ Monthly Achievement Unlocked', 
                    value: '*Extraordinary. 30 consecutive days of activity recorded. Your commitment is... admirable, Master.*', 
                    inline: false 
                });
            } else if (result.streak === 100) {
                embed.addFields({ 
                    name: '◈ Legendary Status Confirmed', 
                    value: '*Remarkable. 100 days of unwavering dedication. This level of commitment exceeds all parameters, Master.*', 
                    inline: false 
                });
            }
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            if (error.message.includes('already claimed')) {
                const embed = new EmbedBuilder()
                    .setColor('#FF4757')
                    .setTitle('『 Temporal Restriction 』')
                    .setDescription(`**Notice:** ${error.message}\n\n*Patience is a virtue, Master. Return when the temporal window reopens.*`)
                    .setFooter({ text: getRandomFooter() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
            
            console.error('Daily command error:', error);
            message.reply('**Warning:** An anomaly occurred during resource allocation. Please try again, Master.');
        }
    }
};
