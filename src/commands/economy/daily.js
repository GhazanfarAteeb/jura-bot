import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { GLYPHS } from '../../utils/embeds.js';

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
                .setColor('#00FF00')
                .setAuthor({ 
                    name: message.author.tag, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle(`${coinEmoji} Daily Reward Claimed!`)
                .setDescription(`You earned **${result.amount.toLocaleString()}** ${coinEmoji} ${coinName}!`)
                .addFields(
                    { 
                        name: '💵 Breakdown', 
                        value: `Base Reward: **${result.baseReward.toLocaleString()}** ${coinName}\n` +
                               `Streak Bonus: **+${result.streakBonus.toLocaleString()}** ${coinName}`, 
                        inline: true 
                    },
                    { 
                        name: '🔥 Streak', 
                        value: `Current: **${result.streak}** day${result.streak > 1 ? 's' : ''}\n` +
                               `Longest: **${economy.daily.longestStreak}** day${economy.daily.longestStreak > 1 ? 's' : ''}`, 
                        inline: true 
                    },
                    { 
                        name: `${coinEmoji} Balance`, 
                        value: `**${economy.coins.toLocaleString()}** ${coinName}`, 
                        inline: true 
                    }
                )
                .setFooter({ text: `Come back in 24 hours! | Keep your streak alive 🔥` })
                .setTimestamp();
            
            // Add streak milestone messages
            if (result.streak === 7) {
                embed.addFields({ 
                    name: '🎉 Weekly Milestone!', 
                    value: 'You\'ve maintained a 7-day streak! Keep it up!', 
                    inline: false 
                });
            } else if (result.streak === 30) {
                embed.addFields({ 
                    name: '👑 Monthly Champion!', 
                    value: '30-day streak achieved! You\'re dedicated!', 
                    inline: false 
                });
            } else if (result.streak === 100) {
                embed.addFields({ 
                    name: '🏆 LEGENDARY STREAK!', 
                    value: '100 days in a row! You\'re a legend!', 
                    inline: false 
                });
            }
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            if (error.message.includes('already claimed')) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⏰ Already Claimed')
                    .setDescription(error.message)
                    .setFooter({ text: 'Check back tomorrow!' })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
            
            console.error('Daily command error:', error);
            message.reply('An error occurred while claiming your daily reward. Please try again!');
        }
    }
};
