import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';

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
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ 
                    name: targetUser.tag, 
                    iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle('💰 Balance')
                .addFields(
                    { 
                        name: '💵 Wallet', 
                        value: `**${economy.coins.toLocaleString()}** coins`, 
                        inline: true 
                    },
                    { 
                        name: '🏦 Bank', 
                        value: `**${economy.bank.toLocaleString()}** coins`, 
                        inline: true 
                    },
                    { 
                        name: '💎 Total', 
                        value: `**${(economy.coins + economy.bank).toLocaleString()}** coins`, 
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
