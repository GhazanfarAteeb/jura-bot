import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { REPUTATION_COOLDOWN, REPUTATION_AMOUNT } from '../../utils/gameConfig.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'rep',
    description: 'Give reputation to someone',
    usage: 'rep <@user>',
    category: 'economy',
    aliases: ['reputation', 'giverep'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const targetUser = message.mentions.users.first();
            
            if (!targetUser) {
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Target Required', `**Notice:** Please specify a user to acknowledge, Master.\n\nSyntax: \`${prefix}rep @user\``)]
                });
            }
            
            if (targetUser.id === userId) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid Operation', '**Warning:** Self-acknowledgment is not permitted, Master.')]
                });
            }
            
            if (targetUser.bot) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid Target', '**Warning:** Automated systems cannot receive reputation, Master.')]
                });
            }
            
            const guildConfig = await Guild.getGuild(guildId);
            const giverEconomy = await Economy.getEconomy(userId, guildId);
            const receiverEconomy = await Economy.getEconomy(targetUser.id, guildId);
            
            // Check cooldown
            const lastGiven = giverEconomy.reputationReceived.find(r => r.userId === targetUser.id);
            if (lastGiven) {
                const timeSince = Date.now() - lastGiven.timestamp.getTime();
                const cooldownMs = REPUTATION_COOLDOWN * 1000;
                
                if (timeSince < cooldownMs) {
                    const hoursLeft = Math.ceil((cooldownMs - timeSince) / 1000 / 60 / 60);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Cooldown Active',
                            `**Notice:** You recently acknowledged ${targetUser.username}, Master.\n\n` +
                            `Available again in **${hoursLeft}** hours.`
                        )]
                    });
                }
            }
            
            // Give reputation
            receiverEconomy.reputation = (receiverEconomy.reputation || 0) + REPUTATION_AMOUNT;
            
            // Update giver's list
            const existingIndex = giverEconomy.reputationReceived.findIndex(r => r.userId === targetUser.id);
            if (existingIndex >= 0) {
                giverEconomy.reputationReceived[existingIndex].timestamp = new Date();
            } else {
                giverEconomy.reputationReceived.push({
                    userId: targetUser.id,
                    timestamp: new Date()
                });
            }
            
            // Update receiver's list
            receiverEconomy.reputationGiven.push({
                userId: userId,
                timestamp: new Date()
            });
            
            await giverEconomy.save();
            await receiverEconomy.save();
            
            const embed = new EmbedBuilder()
                .setColor('#00CED1')
                .setTitle('『 Reputation Acknowledged 』')
                .setDescription(
                    `${message.author} has granted **+1 reputation** to ${targetUser}.\n\n` +
                    `**${targetUser.username}'s Reputation:** ${receiverEconomy.reputation} ◉`
                )
                .setThumbnail(targetUser.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `${getRandomFooter()} | Cooldown: 24 hours` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in rep command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while giving reputation. Please try again later.')]
            });
        }
    }
};
