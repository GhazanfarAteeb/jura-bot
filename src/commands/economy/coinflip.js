import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { COINFLIP_MIN, COINFLIP_MAX } from '../../utils/gameConfig.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'coinflip',
    description: 'Flip a coin and bet on the outcome!',
    usage: 'coinflip <amount> <heads|tails>',
    category: 'economy',
    aliases: ['cf', 'flip'],
    cooldown: 5,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const amount = parseInt(args[0]);
            const choice = args[1]?.toLowerCase();
            
            if (!amount || isNaN(amount)) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `Please provide a valid bet amount!\n\n` +
                        `Usage: \`!coinflip <amount> <heads|tails>\`\n` +
                        `Example: \`!coinflip 100 heads\``
                    )]
                });
            }
            
            if (!choice || (choice !== 'heads' && choice !== 'h' && choice !== 'tails' && choice !== 't')) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `Please choose heads or tails!\n\n` +
                        `Usage: \`!coinflip <amount> <heads|tails>\`\n` +
                        `Example: \`!coinflip 100 heads\``
                    )]
                });
            }
            
            if (amount < COINFLIP_MIN) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Minimum bet is **${COINFLIP_MIN}** coins!`)]
                });
            }
            
            if (amount > COINFLIP_MAX) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Maximum bet is **${COINFLIP_MAX}** coins!`)]
                });
            }
            
            const guildConfig = await Guild.getGuild(guildId);
            const economy = await Economy.getEconomy(userId, guildId);
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            
            if (economy.coins < amount) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `You don't have enough ${coinEmoji}!\n\n` +
                        `**Your Balance:** ${economy.coins} ${coinEmoji}\n` +
                        `**Bet Amount:** ${amount} ${coinEmoji}`
                    )]
                });
            }
            
            // Normalize choice
            const userChoice = (choice === 'h' || choice === 'heads') ? 'heads' : 'tails';
            
            // Flip the coin
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = result === userChoice;
            
            // Update balance
            if (won) {
                await economy.addCoins(amount, 'Coinflip win');
                economy.gamblingWins = (economy.gamblingWins || 0) + 1;
            } else {
                await economy.removeCoins(amount, 'Coinflip loss');
                economy.gamblingLosses = (economy.gamblingLosses || 0) + 1;
            }
            economy.gamblingTotal = (economy.gamblingTotal || 0) + amount;
            await economy.save();
            
            const embed = new EmbedBuilder()
                .setTitle('🪙 Coinflip!')
                .setDescription(
                    `**Your Choice:** ${userChoice.charAt(0).toUpperCase() + userChoice.slice(1)}\n` +
                    `**Result:** ${result.charAt(0).toUpperCase() + result.slice(1)}\n\n` +
                    `**${won ? '✅ YOU WON!' : '❌ YOU LOST!'}**\n\n` +
                    `**${won ? '+' : '-'}${amount}** ${coinEmoji}\n` +
                    `**New Balance:** ${economy.coins} ${coinEmoji}`
                )
                .setColor(won ? '#00ff00' : '#ff0000')
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `Gambling Stats: ${economy.gamblingWins || 0}W / ${economy.gamblingLosses || 0}L` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in coinflip command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while playing coinflip.')]
            });
        }
    }
};
