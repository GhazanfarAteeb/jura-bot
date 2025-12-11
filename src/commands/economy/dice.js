import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { DICE_MIN, DICE_MAX } from '../../utils/gameConfig.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'dice',
    description: 'Roll dice and bet on the outcome!',
    usage: 'dice <amount> <number 1-6>',
    category: 'economy',
    aliases: ['rolldice', 'diceroll'],
    cooldown: 5,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const amount = parseInt(args[0]);
            const guess = parseInt(args[1]);
            
            if (!amount || isNaN(amount)) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `Please provide a valid bet amount!\n\n` +
                        `Usage: \`!dice <amount> <number 1-6>\`\n` +
                        `Example: \`!dice 100 5\``
                    )]
                });
            }
            
            if (!guess || isNaN(guess) || guess < 1 || guess > 6) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `Please choose a number between 1 and 6!\n\n` +
                        `Usage: \`!dice <amount> <number 1-6>\`\n` +
                        `Example: \`!dice 100 5\``
                    )]
                });
            }
            
            if (amount < DICE_MIN) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Minimum bet is **${DICE_MIN}** coins!`)]
                });
            }
            
            if (amount > DICE_MAX) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Maximum bet is **${DICE_MAX}** coins!`)]
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
            
            // Roll the dice
            const roll = Math.floor(Math.random() * 6) + 1;
            const won = roll === guess;
            
            const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            
            // Win = 5x payout (guessing exact number is hard!)
            const winnings = won ? amount * 5 : 0;
            const netGain = won ? winnings - amount : -amount;
            
            // Update balance
            if (won) {
                await economy.addCoins(netGain, 'Dice win (5x)');
                economy.gamblingWins = (economy.gamblingWins || 0) + 1;
            } else {
                await economy.removeCoins(amount, 'Dice loss');
                economy.gamblingLosses = (economy.gamblingLosses || 0) + 1;
            }
            economy.gamblingTotal = (economy.gamblingTotal || 0) + amount;
            await economy.save();
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 Dice Roll!')
                .setDescription(
                    `**Your Guess:** ${guess}\n` +
                    `**Dice Roll:** ${diceEmojis[roll - 1]} **${roll}**\n\n` +
                    `**${won ? '🎉 YOU WON!' : '❌ YOU LOST!'}**\n\n` +
                    (won 
                        ? `**Multiplier:** 5x\n**Winnings:** +${winnings} ${coinEmoji}\n**Profit:** +${netGain} ${coinEmoji}`
                        : `**Lost:** -${amount} ${coinEmoji}`) +
                    `\n\n**New Balance:** ${economy.coins} ${coinEmoji}`
                )
                .setColor(won ? '#00ff00' : '#ff0000')
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `Gambling Stats: ${economy.gamblingWins || 0}W / ${economy.gamblingLosses || 0}L` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in dice command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while rolling dice.')]
            });
        }
    }
};
