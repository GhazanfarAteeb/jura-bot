import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { COINFLIP_MIN, COINFLIP_MAX } from '../../utils/gameConfig.js';
import { errorEmbed } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'coinflip',
    description: 'Engage in probability-based wagering protocol, Master',
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
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid Parameters',
                        `**Notice:** A valid wager amount is required, Master.\n\n` +
                        `▸ Syntax: \`${prefix}coinflip <amount> <heads|tails>\`\n` +
                        `▸ Example: \`${prefix}coinflip 100 heads\``
                    )]
                });
            }
            
            if (!choice || (choice !== 'heads' && choice !== 'h' && choice !== 'tails' && choice !== 't')) {
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Selection Required',
                        `**Notice:** Please specify your prediction, Master.\n\n` +
                        `▸ Syntax: \`${prefix}coinflip <amount> <heads|tails>\`\n` +
                        `▸ Example: \`${prefix}coinflip 100 heads\``
                    )]
                });
            }
            
            if (amount < COINFLIP_MIN) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Wager Rejected', `**Notice:** Minimum wager is **${COINFLIP_MIN}** coins, Master.`)]
                });
            }
            
            if (amount > COINFLIP_MAX) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Wager Rejected', `**Notice:** Maximum wager is **${COINFLIP_MAX}** coins, Master.`)]
                });
            }
            
            const guildConfig = await Guild.getGuild(guildId);
            const economy = await Economy.getEconomy(userId, guildId);
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            if (economy.coins < amount) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Insufficient Resources',
                        `**Warning:** Your current balance is insufficient, Master.\n\n` +
                        `▸ **Available Funds:** ${economy.coins} ${coinEmoji} ${coinName}\n` +
                        `▸ **Required Wager:** ${amount} ${coinEmoji} ${coinName}`
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
                .setTitle('『 Binary Probability 』')
                .setDescription(
                    `**Notice:** Initiating random binary calculation...\n\n` +
                    `▸ **Your Prediction:** ${userChoice.charAt(0).toUpperCase() + userChoice.slice(1)}\n` +
                    `▸ **Outcome:** ${result.charAt(0).toUpperCase() + result.slice(1)}\n\n` +
                    (won 
                        ? `◉ **PREDICTION CORRECT**\n\n▸ **Resources Gained:** +${amount} ${coinEmoji}\n\n*Fortune favors you, Master.*`
                        : `○ **PREDICTION INCORRECT**\n\n▸ **Resources Lost:** -${amount} ${coinEmoji}\n\n*Perhaps reconsider your strategy, Master.*`) +
                    `\n\n**Current Balance:** ${economy.coins} ${coinEmoji} ${coinName}`
                )
                .setColor(won ? '#00FF7F' : '#FF4757')
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `${getRandomFooter()} | W:${economy.gamblingWins || 0} L:${economy.gamblingLosses || 0}` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in coinflip command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'System Error', '**Warning:** An anomaly occurred during probability calculation, Master.')]
            });
        }
    }
};
