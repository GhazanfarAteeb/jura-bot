import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';

export default {
    name: 'balance',
    description: 'Check your coin balance',
    usage: 'balance [@user]',
    category: 'economy',
    aliases: ['bal', 'coins', 'money', 'wallet'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const targetUser = message.mentions.users.first() || message.author;
        const userId = targetUser.id;
        const guildId = message.guild.id;
        
        try {
            const economy = await Economy.getEconomy(userId, guildId);
            const guildConfig = await Guild.getGuild(guildId);
            
            // Get custom coin settings
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ 
                    name: targetUser.tag, 
                    iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle(`${coinEmoji} Balance`)
                .addFields(
                    { 
                        name: '💵 Wallet', 
                        value: `**${economy.coins.toLocaleString()}** ${coinName}`, 
                        inline: true 
                    },
                    { 
                        name: '🏦 Bank', 
                        value: `**${economy.bank.toLocaleString()}** ${coinName}`, 
                        inline: true 
                    },
                    { 
                        name: '💎 Total', 
                        value: `**${(economy.coins + economy.bank).toLocaleString()}** ${coinName}`, 
                        inline: true 
                    }
                )
                .setFooter({ text: `Total Earned: ${economy.stats.totalEarned.toLocaleString()} | Total Spent: ${economy.stats.totalSpent.toLocaleString()}` })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Balance command error:', error);
            message.reply('An error occurred while fetching balance. Please try again!');
        }
    }
};
