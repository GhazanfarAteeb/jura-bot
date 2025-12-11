import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { ROULETTE_MIN, ROULETTE_MAX } from '../../utils/gameConfig.js';
import { errorEmbed } from '../../utils/embeds.js';

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
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `Please provide a valid bet amount!\n\n` +
                        `**Usage:** \`!roulette <amount> <bet>\`\n` +
                        `**Color Bets:** red, black, green (2x payout)\n` +
                        `**Number Bets:** 0-36 (35x payout)\n\n` +
                        `**Examples:**\n` +
                        `\`!roulette 100 red\`\n` +
                        `\`!roulette 50 17\``
                    )]
                });
            }
            
            if (!bet) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `Please provide a bet!\n\n` +
                        `**Color Bets:** red, black, green (2x payout)\n` +
                        `**Number Bets:** 0-36 (35x payout)\n\n` +
                        `**Examples:**\n` +
                        `\`!roulette 100 red\`\n` +
                        `\`!roulette 50 17\``
                    )]
                });
            }
            
            if (amount < ROULETTE_MIN) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Minimum bet is **${ROULETTE_MIN}** coins!`)]
                });
            }
            
            if (amount > ROULETTE_MAX) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Maximum bet is **${ROULETTE_MAX}** coins!`)]
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
                        embeds: [await errorEmbed(guildId, 
                            `Invalid bet! Choose:\n\n` +
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
                .setTitle('🎡 Roulette Wheel')
                .setDescription(
                    `**Your Bet:** ${betType === 'color' ? bet.toUpperCase() : `Number ${bet}`}\n` +
                    `**Result:** ${colorEmojis[resultColor]} **${resultColor.toUpperCase()} ${result}**\n\n` +
                    `**${won ? '🎉 YOU WON!' : '❌ YOU LOST!'}**\n\n` +
                    (won 
                        ? `**Multiplier:** ${multiplier}x\n**Winnings:** +${winnings} ${coinEmoji}\n**Profit:** +${netGain} ${coinEmoji}`
                        : `**Lost:** -${amount} ${coinEmoji}`) +
                    `\n\n**New Balance:** ${economy.coins} ${coinEmoji}`
                )
                .setColor(won ? '#00ff00' : '#ff0000')
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `Gambling Stats: ${economy.gamblingWins || 0}W / ${economy.gamblingLosses || 0}L` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in roulette command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while spinning roulette.')]
            });
        }
    }
};
