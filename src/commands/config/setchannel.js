import { PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'setchannel',
    description: 'Set log channels for different features',
    usage: '<type> <#channel|channel_id>',
    aliases: ['setlog'],
    permissions: [PermissionFlagsBits.Administrator],
    cooldown: 3,
    
    async execute(message, args) {
        const guild = await Guild.getGuild(message.guild.id, message.guild.name);

        // Check for admin role
        const hasAdminRole = guild.roles.adminRoles?.some(roleId =>
            message.member.roles.cache.has(roleId)
        );

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
            return message.reply({
                embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
                    `${GLYPHS.LOCK} You need Administrator permissions to set channels.`)]
            });
        }

        if (args.length < 2) {
            const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
                `${GLYPHS.ARROW_RIGHT} Usage: \`setchannel <type> <#channel|channel_id>\`\n\n` +
                `**Types:**\n` +
                `${GLYPHS.DOT} \`modlog\` - Moderation logs\n` +
                `${GLYPHS.DOT} \`alert\` - Security alerts\n` +
                `${GLYPHS.DOT} \`join\` - Join/leave logs`
            );
            return message.reply({ embeds: [embed] });
        }
        
        const type = args[0].toLowerCase();
        const channelId = args[1].replace(/[<#>]/g, '');
        
        // Verify channel exists
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            const embed = await errorEmbed(message.guild.id, 'Channel Not Found',
                `${GLYPHS.ERROR} Could not find that text channel.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        const guild = await Guild.getGuild(message.guild.id, message.guild.name);
        
        switch (type) {
            case 'modlog':
            case 'mod':
                guild.channels.modLog = channelId;
                await guild.save();
                break;
                
            case 'alert':
            case 'alerts':
            case 'security':
                guild.channels.alertLog = channelId;
                guild.features.memberTracking.alertChannel = channelId;
                guild.features.accountAge.alertChannel = channelId;
                await guild.save();
                break;
                
            case 'join':
            case 'joinlog':
            case 'joins':
                guild.channels.joinLog = channelId;
                await guild.save();
                break;
                
            default:
                const embed = await errorEmbed(message.guild.id, 'Unknown Type',
                    `${GLYPHS.WARNING} Unknown channel type. Use: modlog, alert, or join`
                );
                return message.reply({ embeds: [embed] });
        }
        
        const typeNames = {
            modlog: 'Moderation Log',
            mod: 'Moderation Log',
            alert: 'Alert Log',
            alerts: 'Alert Log',
            security: 'Alert Log',
            join: 'Join/Leave Log',
            joinlog: 'Join/Leave Log',
            joins: 'Join/Leave Log'
        };
        
        const embed = await successEmbed(message.guild.id, 'Channel Configured',
            `${GLYPHS.ARROW_RIGHT} **${typeNames[type]}** channel set to ${channel}`
        );
        return message.reply({ embeds: [embed] });
    }
};
