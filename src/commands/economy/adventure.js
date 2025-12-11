import { EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { ADVENTURE_NPCS, ADVENTURE_REWARDS, ADVENTURE_COOLDOWN, ADVENTURE_MESSAGES } from '../../utils/gameConfig.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'adventure',
    description: 'Go on an adventure and earn coins!',
    usage: 'adventure',
    category: 'economy',
    aliases: ['adv', 'quest'],
    cooldown: 3,
    
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        try {
            const guildConfig = await Guild.getGuild(guildId);
            const economy = await Economy.getEconomy(userId, guildId);
            
            // Check cooldown
            if (economy.lastAdventure) {
                const timeSince = Date.now() - economy.lastAdventure.getTime();
                const cooldownMs = ADVENTURE_COOLDOWN * 1000;
                
                if (timeSince < cooldownMs) {
                    const timeLeft = Math.ceil((cooldownMs - timeSince) / 1000 / 60);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 
                            `You're too tired to go on another adventure!\n\nCome back in **${timeLeft}** minutes.`
                        )]
                    });
                }
            }
            
            // Random coin reward
            const reward = Math.floor(Math.random() * (ADVENTURE_REWARDS.max - ADVENTURE_REWARDS.min + 1)) + ADVENTURE_REWARDS.min;
            
            // Random NPC
            const npcList = guildConfig.economy?.adventureNPCs?.length > 0 
                ? guildConfig.economy.adventureNPCs 
                : ADVENTURE_NPCS;
            const npc = npcList[Math.floor(Math.random() * npcList.length)];
            
            // Random message
            const adventureMsg = ADVENTURE_MESSAGES[Math.floor(Math.random() * ADVENTURE_MESSAGES.length)];
            
            // Add coins and update stats
            await economy.addCoins(reward, 'Adventure reward');
            economy.lastAdventure = new Date();
            economy.adventuresCompleted = (economy.adventuresCompleted || 0) + 1;
            await economy.save();
            
            const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
            const oldBalance = economy.coins - reward;
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🗺️ Adventure Complete!')
                .setDescription(
                    `You ${adventureMsg}! As a reward, **${npc}** gave you **${reward}** ${coinEmoji}.\n\n` +
                    `**New Balance:** ${economy.coins} ${coinEmoji}\n` +
                    `**Adventures Completed:** ${economy.adventuresCompleted}`
                )
                .setThumbnail(message.author.displayAvatarURL({ extension: 'png' }))
                .setFooter({ text: `Previous balance: ${oldBalance} ${coinEmoji}` })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in adventure command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred during your adventure. Please try again later.')]
            });
        }
    }
};
