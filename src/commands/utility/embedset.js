import { PermissionFlagsBits } from 'discord.js';
import EmbedTemplate from '../../models/EmbedTemplate.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'embedset',
    description: 'Configure embed properties',
    usage: 'embedset <name> <property> <value>',
    category: 'utility',
    permissions: [PermissionFlagsBits.ManageMessages],
    
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const embedName = args[0];
        const property = args[1]?.toLowerCase();
        const value = args.slice(2).join(' ');
        
        if (!embedName || !property) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Usage: `!embedset <name> <property> <value>`\n\nProperties: title, description, color, content, image, thumbnail, author, authorIcon, footer, footerIcon, addfield, removefield, timestamp')]
            });
        }
        
        const template = await EmbedTemplate.findOne({ guildId, name: embedName });
        
        if (!template) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Embed "${embedName}" not found! Create it first with \`!embed create ${embedName}\``)]
            });
        }
        
        // Initialize embed object if it doesn't exist
        if (!template.embed) template.embed = {};
        
        switch (property) {
            case 'title':
                if (!value) return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a title!')] });
                template.embed.title = value;
                break;
                
            case 'description':
            case 'desc':
                if (!value) return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a description!')] });
                template.embed.description = value;
                break;
                
            case 'color':
            case 'colour':
                if (!value) return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a hex color (e.g., #FF0000)!')] });
                // Validate hex color
                if (!/^#[0-9A-F]{6}$/i.test(value)) {
                    return message.reply({ embeds: [await errorEmbed(guildId, 'Invalid hex color! Use format: #FF0000')] });
                }
                template.embed.color = value;
                break;
                
            case 'content':
            case 'message':
                if (!value) {
                    template.content = null;
                    await template.save();
                    return message.reply({ embeds: [await successEmbed(guildId, '✅ Content Removed', 'Message content has been cleared')] });
                }
                template.content = value;
                break;
                
            case 'image':
                if (!value) {
                    template.embed.image = null;
                    await template.save();
                    return message.reply({ embeds: [await successEmbed(guildId, '✅ Image Removed', 'Large image has been removed')] });
                }
                // Check if it's a valid URL or attachment
                const imageUrl = message.attachments.first()?.url || value;
                if (!imageUrl.startsWith('http')) {
                    return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a valid image URL or attach an image!')] });
                }
                template.embed.image = { url: imageUrl };
                break;
                
            case 'thumbnail':
            case 'thumb':
                if (!value) {
                    template.embed.thumbnail = null;
                    await template.save();
                    return message.reply({ embeds: [await successEmbed(guildId, '✅ Thumbnail Removed', 'Thumbnail has been removed')] });
                }
                
                if (value.toLowerCase() === 'useravatar' || value.toLowerCase() === 'user') {
                    template.embed.thumbnail = { useUserAvatar: true };
                } else {
                    const thumbUrl = message.attachments.first()?.url || value;
                    if (!thumbUrl.startsWith('http')) {
                        return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a valid image URL, attach an image, or use "userAvatar"!')] });
                    }
                    template.embed.thumbnail = { url: thumbUrl };
                }
                break;
                
            case 'author':
            case 'authorname':
                if (!value) {
                    template.embed.author = null;
                    await template.save();
                    return message.reply({ embeds: [await successEmbed(guildId, '✅ Author Removed', 'Author section has been removed')] });
                }
                
                if (value.toLowerCase() === 'username' || value.toLowerCase() === 'user') {
                    if (!template.embed.author) template.embed.author = {};
                    template.embed.author.useUserName = true;
                    template.embed.author.name = null;
                } else {
                    if (!template.embed.author) template.embed.author = {};
                    template.embed.author.name = value;
                    template.embed.author.useUserName = false;
                }
                break;
                
            case 'authoricon':
            case 'authorimage':
                if (!value) return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a URL or "userAvatar"!')] });
                
                if (!template.embed.author) template.embed.author = {};
                
                if (value.toLowerCase() === 'useravatar' || value.toLowerCase() === 'user') {
                    template.embed.author.useUserAvatar = true;
                    template.embed.author.iconUrl = null;
                } else {
                    const iconUrl = message.attachments.first()?.url || value;
                    if (!iconUrl.startsWith('http')) {
                        return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a valid image URL or "userAvatar"!')] });
                    }
                    template.embed.author.iconUrl = iconUrl;
                    template.embed.author.useUserAvatar = false;
                }
                break;
                
            case 'footer':
            case 'footertext':
                if (!value) {
                    template.embed.footer = null;
                    await template.save();
                    return message.reply({ embeds: [await successEmbed(guildId, '✅ Footer Removed', 'Footer has been removed')] });
                }
                if (!template.embed.footer) template.embed.footer = {};
                template.embed.footer.text = value;
                break;
                
            case 'footericon':
            case 'footerimage':
                if (!value) return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a URL, "userAvatar", or "botAvatar"!')] });
                
                if (!template.embed.footer) template.embed.footer = {};
                
                if (value.toLowerCase() === 'useravatar' || value.toLowerCase() === 'user') {
                    template.embed.footer.useUserAvatar = true;
                    template.embed.footer.useBotAvatar = false;
                    template.embed.footer.iconUrl = null;
                } else if (value.toLowerCase() === 'botavatar' || value.toLowerCase() === 'bot') {
                    template.embed.footer.useBotAvatar = true;
                    template.embed.footer.useUserAvatar = false;
                    template.embed.footer.iconUrl = null;
                } else {
                    const iconUrl = message.attachments.first()?.url || value;
                    if (!iconUrl.startsWith('http')) {
                        return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a valid image URL, "userAvatar", or "botAvatar"!')] });
                    }
                    template.embed.footer.iconUrl = iconUrl;
                    template.embed.footer.useUserAvatar = false;
                    template.embed.footer.useBotAvatar = false;
                }
                break;
                
            case 'addfield':
            case 'field':
                if (!value) return message.reply({ embeds: [await errorEmbed(guildId, 'Usage: `!embedset <name> addfield <name> | <value> [inline]`')] });
                
                const parts = value.split('|');
                if (parts.length < 2) {
                    return message.reply({ embeds: [await errorEmbed(guildId, 'Usage: `!embedset <name> addfield <name> | <value> [inline]`')] });
                }
                
                const fieldName = parts[0].trim();
                const fieldValue = parts[1].trim();
                const inline = parts[2]?.trim().toLowerCase() === 'inline' || parts[2]?.trim().toLowerCase() === 'true';
                
                if (!template.embed.fields) template.embed.fields = [];
                
                if (template.embed.fields.length >= 25) {
                    return message.reply({ embeds: [await errorEmbed(guildId, 'Maximum 25 fields allowed per embed!')] });
                }
                
                template.embed.fields.push({
                    name: fieldName,
                    value: fieldValue,
                    inline: inline
                });
                break;
                
            case 'removefield':
            case 'deletefield':
                const fieldIndex = parseInt(value) - 1;
                
                if (isNaN(fieldIndex) || !template.embed.fields || fieldIndex < 0 || fieldIndex >= template.embed.fields.length) {
                    return message.reply({ embeds: [await errorEmbed(guildId, 'Invalid field number!')] });
                }
                
                template.embed.fields.splice(fieldIndex, 1);
                break;
                
            case 'timestamp':
                const timestampValue = value.toLowerCase();
                if (timestampValue === 'on' || timestampValue === 'true' || timestampValue === 'yes') {
                    template.embed.timestamp = true;
                } else if (timestampValue === 'off' || timestampValue === 'false' || timestampValue === 'no') {
                    template.embed.timestamp = false;
                } else {
                    return message.reply({ embeds: [await errorEmbed(guildId, 'Use: on/off, true/false, or yes/no')] });
                }
                break;
                
            case 'url':
                if (!value) {
                    template.embed.url = null;
                    await template.save();
                    return message.reply({ embeds: [await successEmbed(guildId, '✅ URL Removed', 'Title URL has been removed')] });
                }
                
                if (!value.startsWith('http')) {
                    return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a valid URL!')] });
                }
                template.embed.url = value;
                break;
                
            case 'category':
                const validCategories = ['welcome', 'announcement', 'rules', 'info', 'custom'];
                if (!validCategories.includes(value.toLowerCase())) {
                    return message.reply({ embeds: [await errorEmbed(guildId, `Invalid category! Use: ${validCategories.join(', ')}`)] });
                }
                template.category = value.toLowerCase();
                break;
                
            case 'description':
            case 'setdesc':
                if (!value) return message.reply({ embeds: [await errorEmbed(guildId, 'Please provide a description for this embed template!')] });
                template.description = value;
                break;
                
            default:
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Unknown property: ${property}\n\nAvailable: title, description, color, content, image, thumbnail, author, authorIcon, footer, footerIcon, addfield, removefield, timestamp, url, category`)]
                });
        }
        
        await template.save();
        
        return message.reply({
            embeds: [await successEmbed(guildId, '✅ Embed Updated', `Updated **${property}** for embed "${embedName}"\n\nUse \`!embed preview ${embedName}\` to see changes`)]
        });
    }
};
