import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'balance',
    description: 'Retrieve financial status report, Master',
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
            
            const isSelf = targetUser.id === message.author.id;
            const addressee = isSelf ? 'Master' : targetUser.username;
            
            const embed = new EmbedBuilder()
                .setColor('#00CED1')
                .setAuthor({ 
                    name: targetUser.tag, 
                    iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle(`『 Financial Report 』`)
                .setDescription(`**Analysis complete.** ${isSelf ? 'Your' : `${addressee}'s`} economic status retrieved.`)
                .addFields(
                    { 
                        name: '▸ Total Assets', 
                        value: `**${(economy.coins + economy.bank).toLocaleString()}** ${coinEmoji} ${coinName}`, 
                        inline: true 
                    }
                )
                .setFooter({ text: `${getRandomFooter()} | Earned: ${economy.stats.totalEarned.toLocaleString()} | Spent: ${economy.stats.totalSpent.toLocaleString()}` })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Balance command error:', error);
            message.reply('**Warning:** An anomaly occurred while retrieving financial data. Please try again, Master.');
        }
    }
};
