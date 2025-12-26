import { PermissionFlagsBits } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'addcoins',
    description: 'Award coins to a user (Admin only)',
    usage: 'addcoins <@user> <amount>',
    category: 'economy',
    aliases: ['awardcoins', 'givecoins'],
    permissions: [PermissionFlagsBits.Administrator],
    cooldown: 3,
    
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        try {
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[1]);
            
            if (!targetUser) {
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Please mention a user!\n\nUsage: \`${prefix}addcoins @user <amount>\``)]
                });
            }
            
            if (!amount || isNaN(amount) || amount <= 0) {
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Please provide a valid amount!\n\nUsage: \`${prefix}addcoins @user <amount>\``)]
                });
            }
            
            if (amount > 1000000) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Maximum amount is 1,000,000 coins per transaction!')]
                });
            }
            
            const guildConfig = await Guild.getGuild(guildId);
            const economy = await Economy.getEconomy(targetUser.id, guildId);
            
            await economy.addCoins(amount, `Admin award by ${message.author.username}`);
            await economy.save();
            
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            const embed = await successEmbed(guildId, `${coinEmoji} ${coinName.charAt(0).toUpperCase() + coinName.slice(1)} Awarded!`,
                `Successfully gave **${amount}** ${coinEmoji} ${coinName} to ${targetUser}!\n\n` +
                `**${targetUser.username}'s New Balance:** ${economy.coins} ${coinEmoji} ${coinName}`
            );
            
            await message.reply({ embeds: [embed] });
            
            // Notify the user
            try {
                await targetUser.send(
                    `🎉 You received **${amount}** ${coinEmoji} ${coinName} from an administrator in **${message.guild.name}**!\n` +
                    `New balance: ${economy.coins} ${coinEmoji} ${coinName}`
                );
            } catch (error) {
                // User has DMs disabled, ignore
            }
            
        } catch (error) {
            console.error('Error in addcoins command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while awarding coins. Please try again later.')]
            });
        }
    }
};
