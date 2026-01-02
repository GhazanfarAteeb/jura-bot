import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { ROULETTE_MIN, ROULETTE_MAX } from '../../utils/gameConfig.js';
import { errorEmbed } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'roulette',
    description: 'Spin the roulette wheel and bet on colors or numbers!',
    usage: 'roulette <amount> <red/black/green OR 0-36>',
    category: 'economy',
    aliases: ['roul', 'wheel'],
    cooldown: 5,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const amount = parseInt(args[0]);
            const bet = args[1]?.toLowerCase();
            
            if (!amount || isNaN(amount)) {
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Probability Analysis', 
                        `**Notice:** Please provide a valid wager, Master.\n\n` +
                        `**Syntax:** \`${prefix}roulette <amount> <bet>\`\n` +
                        `**Color Wagers:** red, black, green (2x multiplier)\n` +
                        `**Number Wagers:** 0-36 (35x multiplier)\n\n` +
                        `**Examples:**\n` +
                        `\`${prefix}roulette 100 red\`\n` +
                        `\`${prefix}roulette 50 17\``
                    )]
                });
            }
            
            if (!bet) {
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Selection Required',
                        `**Notice:** Please specify your prediction, Master.\n\n` +
                        `**Color Wagers:** red, black, green (2x multiplier)\n` +
                        `**Number Wagers:** 0-36 (35x multiplier)\n\n` +
                        `**Examples:**\n` +
                        `\`${prefix}roulette 100 red\`\n` +
                        `\`${prefix}roulette 50 17\``
                    )]
                });
            }
            
            if (amount < ROULETTE_MIN) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Wager Threshold', `**Warning:** Minimum wager is **${ROULETTE_MIN}** coins, Master.`)]
                });
            }
            
            if (amount > ROULETTE_MAX) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Wager Exceeded', `**Warning:** Maximum wager is **${ROULETTE_MAX}** coins, Master.`)]
                });
            }
            
            const guildConfig = await Guild.getGuild(guildId);
            const economy = await Economy.getEconomy(userId, guildId);
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            if (economy.coins < amount) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Resource Deficit',
                        `**Warning:** Insufficient ${coinEmoji} ${coinName}, Master.\n\n` +
                        `**Current Balance:** ${economy.coins} ${coinEmoji}\n` +
                        `**Wager Amount:** ${amount} ${coinEmoji}`
                    )]
                });
            }
            
            // Define roulette wheel
            const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
            const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
            const greenNumbers = [0];
            
            // Spin the wheel
            const result = Math.floor(Math.random() * 37); // 0-36
            
            let resultColor;
            if (greenNumbers.includes(result)) resultColor = 'green';
            else if (redNumbers.includes(result)) resultColor = 'red';
            else resultColor = 'black';
            
            const colorEmojis = {
                red: '🔴',
                black: '⚫',
                green: '🟢'
            };
            
            // Determine if bet won
            let won = false;
            let multiplier = 0;
            let betType = '';
            
            // Check if bet is a color
            if (['red', 'black', 'green'].includes(bet)) {
                betType = 'color';
                if (bet === resultColor) {
                    won = true;
                    multiplier = 2; // 2x for color bets
                }
            } 
            // Check if bet is a number
            else {
                const betNumber = parseInt(bet);
                if (!isNaN(betNumber) && betNumber >= 0 && betNumber <= 36) {
                    betType = 'number';
                    if (betNumber === result) {
                        won = true;
                        multiplier = 35; // 35x for number bets
                    }
                } else {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Invalid Selection',
                            `**Warning:** Unrecognized wager parameter, Master.\n\n` +
                            `**Colors:** red, black, green\n` +
                            `**Numbers:** 0-36`
                        )]
                    });
                }
            }
            
            const winnings = won ? amount * multiplier : 0;
            const netGain = won ? winnings - amount : -amount;
            
            // Update balance
            if (won) {
                await economy.addCoins(netGain, `Roulette win (${multiplier}x)`);
                economy.gamblingWins = (economy.gamblingWins || 0) + 1;
            } else {
                await economy.removeCoins(amount, 'Roulette loss');
                economy.gamblingLosses = (economy.gamblingLosses || 0) + 1;
            }
            economy.gamblingTotal = (economy.gamblingTotal || 0) + amount;
            await economy.save();
            
            const embed = new EmbedBuilder()
                .setTitle('『 Probability Wheel 』')
                .setDescription(
                    `**Your Prediction:** ${betType === 'color' ? bet.toUpperCase() : `Number ${bet}`}\n` +
                    `**Result:** ${colorEmojis[resultColor]} **${resultColor.toUpperCase()} ${result}**\n\n` +
                    `**${won ? '◉ PREDICTION CORRECT' : '○ PREDICTION FAILED'}**\n\n` +
                    (won 
                        ? `**Multiplier:** ${multiplier}x\n**Winnings:** +${winnings} ${coinEmoji}\n**Net Profit:** +${netGain} ${coinEmoji}`
                        : `**Loss:** -${amount} ${coinEmoji}`) +
                    `\n\n**Updated Balance:** ${economy.coins} ${coinEmoji}`
                )
                .setColor(won ? '#00FF7F' : '#FF4757')
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `${getRandomFooter()} | Record: ${economy.gamblingWins || 0}W / ${economy.gamblingLosses || 0}L` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in roulette command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, '**Warning:** Probability calculation failed, Master. Please retry.')]
            });
        }
    }
};
