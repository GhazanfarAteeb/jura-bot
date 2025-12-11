import { PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'setcoin',
    description: 'Customize coin emoji and name (Admin only)',
    usage: 'setcoin <emoji|name> <value>',
    category: 'config',
    aliases: ['coinconfig', 'customcoin'],
    permissions: [PermissionFlagsBits.Administrator],
    cooldown: 5,
    
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        try {
            if (!args[0]) {
                const guild = await Guild.getGuild(guildId);
                const currentEmoji = guild.economy?.coinEmoji || '💰';
                const currentName = guild.economy?.coinName || 'coins';
                
                const embed = await infoEmbed(guildId, 'Coin Configuration',
                    `**Current Settings:**\n` +
                    `${GLYPHS.ARROW_RIGHT} Emoji: ${currentEmoji}\n` +
                    `${GLYPHS.ARROW_RIGHT} Name: ${currentName}\n\n` +
                    `**Usage:**\n` +
                    `${GLYPHS.ARROW_RIGHT} \`!setcoin emoji <emoji>\` - Change coin emoji\n` +
                    `${GLYPHS.ARROW_RIGHT} \`!setcoin name <name>\` - Change coin name\n\n` +
                    `**Examples:**\n` +
                    `${GLYPHS.ARROW_RIGHT} \`!setcoin emoji 🪙\`\n` +
                    `${GLYPHS.ARROW_RIGHT} \`!setcoin name credits\``
                );
                
                return message.reply({ embeds: [embed] });
            }
            
            const type = args[0].toLowerCase();
            const value = args.slice(1).join(' ');
            
            if (!value) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Please provide a value!\n\nUsage: `!setcoin <emoji|name> <value>`')]
                });
            }
            
            const guild = await Guild.getGuild(guildId);
            
            if (!guild.economy) {
                guild.economy = {};
            }
            
            if (type === 'emoji' || type === 'emote') {
                // Validate emoji (basic check)
                if (value.length > 10) {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Emoji is too long! Please use a single emoji.')]
                    });
                }
                
                guild.economy.coinEmoji = value;
                await guild.save();
                
                const embed = await successEmbed(guildId, 'Coin Emoji Updated!',
                    `Coin emoji has been changed to ${value}\n\n` +
                    `Example: **100** ${value}`
                );
                
                return message.reply({ embeds: [embed] });
                
            } else if (type === 'name') {
                if (value.length > 20) {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Name is too long! Maximum 20 characters.')]
                    });
                }
                
                guild.economy.coinName = value.toLowerCase();
                await guild.save();
                
                const emoji = guild.economy.coinEmoji || '💰';
                
                const embed = await successEmbed(guildId, 'Coin Name Updated!',
                    `Coin name has been changed to **${value}**\n\n` +
                    `Example: **100** ${emoji} ${value}`
                );
                
                return message.reply({ embeds: [embed] });
                
            } else {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 
                        'Invalid type! Use `emoji` or `name`.\n\n' +
                        'Usage: `!setcoin <emoji|name> <value>`'
                    )]
                });
            }
            
        } catch (error) {
            console.error('Error in setcoin command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while updating coin settings.')]
            });
        }
    }
};
