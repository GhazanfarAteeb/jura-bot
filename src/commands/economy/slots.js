import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { SLOTS_MIN, SLOTS_MAX, SLOTS_EMOJIS } from '../../utils/gameConfig.js';
import { errorEmbed } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'slots',
    description: 'Engage random outcome wagering protocol, Master',
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
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid Parameters',
                        `**Notice:** A valid wager amount is required, Master.\n\n` +
                        `▸ Syntax: \`${prefix}slots <amount>\`\n` +
                        `▸ Example: \`${prefix}slots 100\``
                    )]
                });
            }
            
            if (amount < SLOTS_MIN) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Wager Rejected',
                        `**Notice:** Minimum wager is **${SLOTS_MIN}** coins, Master.`
                    )]
                });
            }
            
            if (amount > SLOTS_MAX) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Wager Rejected',
                        `**Notice:** Maximum wager is **${SLOTS_MAX}** coins, Master.`
                    )]
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
                    result = '◉ **PROBABILITY ANOMALY** — Triple 7s detected!';
                } else if (slot1 === '💎') {
                    multiplier = 7; // 7x for triple diamonds
                    result = '◉ **EXCEPTIONAL OUTCOME** — Triple Diamonds aligned!';
                } else {
                    multiplier = 5; // 5x for triple anything else
                    result = '◉ **FAVORABLE RESULT** — Triple sequence confirmed!';
                }
            } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
                // Two match
                multiplier = 2; // 2x for double match
                result = '◈ **PARTIAL MATCH** — Two symbols aligned.';
            } else {
                // No match - loss
                result = '○ **NO CORRELATION** — Sequence mismatch detected.';
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
                .setTitle('『 Probability Engine 』')
                .setDescription(
                    `**Notice:** Initiating random sequence generator...\n\n` +
                    `**╔═══════╗**\n` +
                    `**║** ${slot1} **│** ${slot2} **│** ${slot3} **║**\n` +
                    `**╚═══════╝**\n\n` +
                    result + '\n\n' +
                    (won 
                        ? `▸ **Multiplier Applied:** ${multiplier}x\n▸ **Resources Gained:** +${winnings} ${coinEmoji}\n▸ **Net Profit:** +${netGain} ${coinEmoji}\n\n*Fortune favors you, Master.*`
                        : `▸ **Resources Lost:** -${amount} ${coinEmoji}\n\n*Perhaps a different approach is advisable, Master.*`) +
                    `\n\n**Current Balance:** ${economy.coins} ${coinEmoji} ${coinName}`
                )
                .setColor(won ? '#00FF7F' : '#FF4757')
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `${getRandomFooter()} | W:${economy.gamblingWins || 0} L:${economy.gamblingLosses || 0}` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in slots command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'System Error',
                    `**Warning:** An anomaly occurred during probability calculation, Master.`
                )]
            });
        }
    }
};
