import { PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
    name: 'steal',
    aliases: ['addemoji', 'stealemoji', 'yoink'],
    description: 'Add an emoji from another server or URL to this server',
    usage: 'steal <emoji or URL> [name]',
    category: 'utility',
    cooldown: 5,
    permissions: ['ManageGuildExpressions'],
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'You need **Manage Expressions** permission to add emojis!')]
            });
        }
        
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'I need **Manage Expressions** permission to add emojis!')]
            });
        }
        
        if (!args[0]) {
            const prefix = await getPrefix(guildId);
            return message.reply({
                embeds: [await errorEmbed(guildId, 
                    'Please provide an emoji or image URL!\n\n' +
                    '**Usage:**\n' +
                    `\`${prefix}steal :emoji:\` - Steal an emoji from another server\n` +
                    `\`${prefix}steal :emoji: newname\` - Steal with a custom name\n` +
                    `\`${prefix}steal <url> name\` - Add emoji from image URL`
                )]
            });
        }
        
        let emojiUrl = null;
        let emojiName = args[1] || null;
        let isAnimated = false;
        
        // Check if it's a custom emoji
        const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
        const emojiMatch = args[0].match(emojiRegex);
        
        if (emojiMatch) {
            isAnimated = !!emojiMatch[1];
            emojiName = emojiName || emojiMatch[2];
            const emojiId = emojiMatch[3];
            emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=128`;
        } 
        // Check if it's a URL
        else if (args[0].match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)/i)) {
            emojiUrl = args[0];
            isAnimated = args[0].toLowerCase().endsWith('.gif');
            
            if (!emojiName) {
                const prefix = await getPrefix(guildId);
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Please provide a name for the emoji!\n\n\`${prefix}steal <url> <name>\``)]
                });
            }
        }
        // Check for emoji in message attachments
        else if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
                emojiUrl = attachment.url;
                emojiName = args[0];
                isAnimated = attachment.contentType === 'image/gif';
            }
        }
        
        if (!emojiUrl) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Could not find a valid emoji or image URL!')]
            });
        }
        
        // Validate emoji name
        if (!emojiName || emojiName.length < 2 || emojiName.length > 32) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Emoji name must be between 2 and 32 characters!')]
            });
        }
        
        // Remove invalid characters from name
        emojiName = emojiName.replace(/[^a-zA-Z0-9_]/g, '_');
        
        try {
            const statusMsg = await message.reply({
                content: `${GLYPHS.LOADING || '⏳'} Adding emoji **${emojiName}**...`
            });
            
            const newEmoji = await message.guild.emojis.create({
                attachment: emojiUrl,
                name: emojiName,
                reason: `Stolen by ${message.author.tag}`
            });
            
            await statusMsg.edit({
                content: null,
                embeds: [await successEmbed(guildId, 'Emoji Added!',
                    `Successfully added ${newEmoji} as **:${newEmoji.name}:**\n\n` +
                    `**ID:** \`${newEmoji.id}\`\n` +
                    `**Animated:** ${newEmoji.animated ? 'Yes' : 'No'}\n` +
                    `**Added by:** ${message.author}`
                )]
            });
            
        } catch (error) {
            console.error('Steal emoji error:', error);
            
            let errorMessage = 'Failed to add emoji. ';
            
            if (error.message.includes('Maximum number of emojis reached')) {
                errorMessage += 'This server has reached the maximum number of emojis!';
            } else if (error.message.includes('File cannot be larger than')) {
                errorMessage += 'The image is too large! Discord emojis must be under 256KB.';
            } else if (error.message.includes('Invalid Form Body')) {
                errorMessage += 'The image format is not supported.';
            } else {
                errorMessage += error.message;
            }
            
            return message.reply({
                embeds: [await errorEmbed(guildId, errorMessage)]
            });
        }
    }
};
