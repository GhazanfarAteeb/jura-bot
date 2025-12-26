import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { SLOTS_MIN, SLOTS_MAX, SLOTS_EMOJIS } from '../../utils/gameConfig.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'slots',
    description: 'Play the slot machine!',
    usage: 'slots <amount>',
    category: 'economy',
    aliases: ['slot', 'slotmachine'],
    cooldown: 5,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const amount = parseInt(args[0]);
            
            if (!amount || isNaN(amount)) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `Please provide a valid bet amount!\n\n` +
                        `Usage: \`!slots <amount>\`\n` +
                        `Example: \`!slots 100\``
                    )]
                });
            }
            
            if (amount < SLOTS_MIN) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Minimum bet is **${SLOTS_MIN}** coins!`)]
                });
            }
            
            if (amount > SLOTS_MAX) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Maximum bet is **${SLOTS_MAX}** coins!`)]
                });
            }
            
            const guildConfig = await Guild.getGuild(guildId);
            const economy = await Economy.getEconomy(userId, guildId);
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const coinName = guildConfig.economy?.coinName || 'coins';
            
            if (economy.coins < amount) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        `You don't have enough ${coinEmoji} ${coinName}!\n\n` +
                        `**Your Balance:** ${economy.coins} ${coinEmoji} ${coinName}\n` +
                        `**Bet Amount:** ${amount} ${coinEmoji} ${coinName}`
                    )]
                });
            }
            
            // Spin the slots
            const slot1 = SLOTS_EMOJIS[Math.floor(Math.random() * SLOTS_EMOJIS.length)];
            const slot2 = SLOTS_EMOJIS[Math.floor(Math.random() * SLOTS_EMOJIS.length)];
            const slot3 = SLOTS_EMOJIS[Math.floor(Math.random() * SLOTS_EMOJIS.length)];
            
            // Calculate winnings
            let multiplier = 0;
            let result = '';
            
            if (slot1 === slot2 && slot2 === slot3) {
                // All three match - JACKPOT!
                if (slot1 === '7️⃣') {
                    multiplier = 10; // 10x for triple 7s
                    result = '🎰 **JACKPOT!** Triple 7s!';
                } else if (slot1 === '💎') {
                    multiplier = 7; // 7x for triple diamonds
                    result = '💎 **MEGA WIN!** Triple Diamonds!';
                } else {
                    multiplier = 5; // 5x for triple anything else
                    result = '🎉 **BIG WIN!** Triple Match!';
                }
            } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
                // Two match
                multiplier = 2; // 2x for double match
                result = '✨ **WIN!** Double Match!';
            } else {
                // No match - loss
                result = '😢 **No Match** - Better luck next time!';
            }
            
            const won = multiplier > 0;
            const winnings = won ? amount * multiplier : 0;
            const netGain = won ? winnings - amount : -amount;
            
            // Update balance
            if (won) {
                await economy.addCoins(netGain, `Slots win (${multiplier}x)`);
                economy.gamblingWins = (economy.gamblingWins || 0) + 1;
            } else {
                await economy.removeCoins(amount, 'Slots loss');
                economy.gamblingLosses = (economy.gamblingLosses || 0) + 1;
            }
            economy.gamblingTotal = (economy.gamblingTotal || 0) + amount;
            await economy.save();
            
            const embed = new EmbedBuilder()
                .setTitle('🎰 Slot Machine')
                .setDescription(
                    `**╔═══════╗**\n` +
                    `**║** ${slot1} **|** ${slot2} **|** ${slot3} **║**\n` +
                    `**╚═══════╝**\n\n` +
                    result + '\n\n' +
                    (won 
                        ? `**Multiplier:** ${multiplier}x\n**Winnings:** +${winnings} ${coinEmoji} ${coinName}\n**Profit:** +${netGain} ${coinEmoji} ${coinName}`
                        : `**Lost:** -${amount} ${coinEmoji} ${coinName}`) +
                    `\n\n**New Balance:** ${economy.coins} ${coinEmoji} ${coinName}`
                )
                .setColor(won ? '#00ff00' : '#ff0000')
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `Gambling Stats: ${economy.gamblingWins || 0}W / ${economy.gamblingLosses || 0}L` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in slots command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while playing slots.')]
            });
        }
    }
};
