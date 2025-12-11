import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import EmbedTemplate from '../../models/EmbedTemplate.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'embed',
    description: 'Create and manage custom embeds',
    usage: 'embed <create/edit/delete/list/send/preview> [args]',
    category: 'utility',
    permissions: [PermissionFlagsBits.ManageMessages],
    
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please specify an action: `create`, `edit`, `delete`, `list`, `send`, or `preview`')]
            });
        }
        
        // List all embeds
        if (action === 'list') {
            const templates = await EmbedTemplate.find({ guildId });
            
            if (templates.length === 0) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'No custom embeds found! Create one with `!embed create`')]
                });
            }
            
            const embed = await successEmbed(guildId, '📋 Custom Embeds', 
                templates.map(t => `**${t.name}** - ${t.description || 'No description'}\nUsed ${t.usageCount} times | Category: ${t.category}`).join('\n\n')
            );
            
            return message.reply({ embeds: [embed] });
        }
        
        // Send embed to channel
        if (action === 'send') {
            const embedName = args[1];
            const targetChannel = message.mentions.channels.first() || message.channel;
            
            if (!embedName) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Please specify an embed name! Usage: `!embed send <name> [#channel]`')]
                });
            }
            
            const template = await EmbedTemplate.findOne({ guildId, name: embedName });
            
            if (!template) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Embed "${embedName}" not found!`)]
                });
            }
            
            const embedData = template.buildEmbed({
                user: message.author,
                guild: message.guild,
                channel: targetChannel,
                client: message.client
            });
            
            const embed = new EmbedBuilder(embedData);
            
            await targetChannel.send({
                content: template.content ? template.replaceVariables(template.content, { user: message.author, guild: message.guild, channel: targetChannel }) : null,
                embeds: [embed]
            });
            
            // Update usage stats
            template.usageCount++;
            template.lastUsed = new Date();
            await template.save();
            
            if (targetChannel.id !== message.channel.id) {
                message.reply({
                    embeds: [await successEmbed(guildId, '✅ Embed Sent', `Sent embed "${embedName}" to ${targetChannel}`)]
                });
            }
            
            return;
        }
        
        // Preview embed
        if (action === 'preview') {
            const embedName = args[1];
            
            if (!embedName) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Please specify an embed name! Usage: `!embed preview <name>`')]
                });
            }
            
            const template = await EmbedTemplate.findOne({ guildId, name: embedName });
            
            if (!template) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Embed "${embedName}" not found!`)]
                });
            }
            
            const embedData = template.buildEmbed({
                user: message.author,
                guild: message.guild,
                channel: message.channel,
                client: message.client
            });
            
            const embed = new EmbedBuilder(embedData);
            
            return message.reply({
                content: template.content ? `**Content:** ${template.replaceVariables(template.content, { user: message.author, guild: message.guild, channel: message.channel })}` : '**Preview:**',
                embeds: [embed]
            });
        }
        
        // Delete embed
        if (action === 'delete' || action === 'remove') {
            const embedName = args[1];
            
            if (!embedName) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Please specify an embed name! Usage: `!embed delete <name>`')]
                });
            }
            
            const result = await EmbedTemplate.deleteOne({ guildId, name: embedName });
            
            if (result.deletedCount === 0) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Embed "${embedName}" not found!`)]
                });
            }
            
            return message.reply({
                embeds: [await successEmbed(guildId, '🗑️ Embed Deleted', `Deleted embed "${embedName}"`)]
            });
        }
        
        // Create/Edit - Interactive setup
        if (action === 'create' || action === 'edit') {
            const embedName = args[1];
            
            if (!embedName) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Please specify an embed name! Usage: \`!embed ${action} <name>\``)]
                });
            }
            
            const existingTemplate = await EmbedTemplate.findOne({ guildId, name: embedName });
            
            if (action === 'create' && existingTemplate) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Embed "${embedName}" already exists! Use \`!embed edit ${embedName}\` to modify it.`)]
                });
            }
            
            if (action === 'edit' && !existingTemplate) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Embed "${embedName}" not found! Use \`!embed create ${embedName}\` to create it.`)]
                });
            }
            
            // Send interactive setup message
            const setupEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📝 ${action === 'create' ? 'Creating' : 'Editing'} Embed: ${embedName}`)
                .setDescription('Use the `!embedset` command to configure this embed:\n\n' +
                    '**Basic Setup:**\n' +
                    `\`!embedset ${embedName} title <text>\` - Set title\n` +
                    `\`!embedset ${embedName} description <text>\` - Set description\n` +
                    `\`!embedset ${embedName} color <hex>\` - Set color (e.g., #FF0000)\n` +
                    `\`!embedset ${embedName} content <text>\` - Set message content\n\n` +
                    '**Images:**\n' +
                    `\`!embedset ${embedName} image <url>\` - Set large image\n` +
                    `\`!embedset ${embedName} thumbnail <url>\` - Set thumbnail\n` +
                    `\`!embedset ${embedName} thumbnail userAvatar\` - Use user\'s avatar\n\n` +
                    '**Author Section:**\n' +
                    `\`!embedset ${embedName} author <text>\` - Set author name\n` +
                    `\`!embedset ${embedName} authorIcon <url>\` - Set author icon\n` +
                    `\`!embedset ${embedName} authorIcon userAvatar\` - Use user\'s avatar\n\n` +
                    '**Footer:**\n' +
                    `\`!embedset ${embedName} footer <text>\` - Set footer text\n` +
                    `\`!embedset ${embedName} footerIcon <url>\` - Set footer icon\n` +
                    `\`!embedset ${embedName} footerIcon userAvatar\` - Use user\'s avatar\n` +
                    `\`!embedset ${embedName} footerIcon botAvatar\` - Use bot\'s avatar\n\n` +
                    '**Fields:**\n' +
                    `\`!embedset ${embedName} addfield <name> | <value> [inline]\` - Add field\n\n` +
                    '**Variables:** `{user}` `{user.name}` `{user.tag}` `{server}` `{server.members}` `{channel}` `{date}` `{time}`\n\n' +
                    `**Preview:** \`!embed preview ${embedName}\`\n` +
                    `**Send:** \`!embed send ${embedName} [#channel]\``
                )
                .setTimestamp();
            
            message.reply({ embeds: [setupEmbed] });
            
            // Create template if it doesn't exist
            if (action === 'create') {
                await EmbedTemplate.create({
                    guildId,
                    name: embedName,
                    createdBy: message.author.id,
                    embed: {}
                });
            }
            
            return;
        }
        
        return message.reply({
            embeds: [await errorEmbed(guildId, 'Invalid action! Use: `create`, `edit`, `delete`, `list`, `send`, or `preview`')]
        });
    }
};
