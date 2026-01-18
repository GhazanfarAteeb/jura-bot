import { EmbedBuilder, ChannelType } from 'discord.js';
import { errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'channelinfo',
    aliases: ['ci', 'channel'],
    description: 'Retrieve analytical data on a channel, Master',
    usage: 'channelinfo [#channel]',
    category: 'info',
    cooldown: 3,
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        
        // Get target channel
        const channel = message.mentions.channels.first()
            || message.guild.channels.cache.get(args[0])
            || message.channel;
        
        // Channel type mapping
        const channelTypes = {
            [ChannelType.GuildText]: '◇ Text Channel',
            [ChannelType.GuildVoice]: '◇ Voice Channel',
            [ChannelType.GuildCategory]: '◇ Category',
            [ChannelType.GuildAnnouncement]: '◇ Announcement Channel',
            [ChannelType.AnnouncementThread]: '◇ Announcement Thread',
            [ChannelType.PublicThread]: '◇ Public Thread',
            [ChannelType.PrivateThread]: '◇ Private Thread',
            [ChannelType.GuildStageVoice]: '◇ Stage Channel',
            [ChannelType.GuildForum]: '◇ Forum Channel',
            [ChannelType.GuildMedia]: '◇ Media Channel'
        };
        
        const channelTypeText = channelTypes[channel.type] || 'Unknown Channel';
        
        // Create base embed
        const embed = new EmbedBuilder()
            .setTitle(`『 #${channel.name} Analysis 』`)
            .setColor('#00CED1')
            .addFields(
                {
                    name: '▸ General',
                    value: [
                        `**Identifier:** \`${channel.id}\``,
                        `**Type:** ${channelTypeText}`,
                        `**Created:** <t:${Math.floor(channel.createdTimestamp / 1000)}:R>`,
                        `**Position:** ${channel.position !== undefined ? channel.position + 1 : 'N/A'}`
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({ text: getRandomFooter() })
            .setTimestamp();
        
        // Add category info
        if (channel.parent) {
            embed.addFields({
                name: '▸ Category',
                value: channel.parent.name,
                inline: true
            });
        }
        
        // Text channel specific info
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
            embed.addFields({
                name: '▸ Configuration',
                value: [
                    `**NSFW:** ${channel.nsfw ? '◉' : '○'}`,
                    `**Slowmode:** ${channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : 'Disabled'}`,
                    `**Topic:** ${channel.topic ? (channel.topic.length > 100 ? channel.topic.substring(0, 100) + '...' : channel.topic) : 'None'}`
                ].join('\n'),
                inline: false
            });
        }
        
        // Voice channel specific info
        if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
            const membersInVoice = channel.members?.size || 0;
            embed.addFields({
                name: '▸ Audio Configuration',
                value: [
                    `**Bitrate:** ${channel.bitrate / 1000}kbps`,
                    `**User Limit:** ${channel.userLimit || 'Unlimited'}`,
                    `**Region:** ${channel.rtcRegion || 'Automatic'}`,
                    `**Connected:** ${membersInVoice} member${membersInVoice !== 1 ? 's' : ''}`
                ].join('\n'),
                inline: false
            });
            
            // Show connected members
            if (membersInVoice > 0 && membersInVoice <= 10) {
                embed.addFields({
                    name: '▸ Connected Members',
                    value: channel.members.map(m => m.user.tag).join(', '),
                    inline: false
                });
            }
        }
        
        // Forum channel specific info
        if (channel.type === ChannelType.GuildForum) {
            const tags = channel.availableTags?.map(t => t.name).join(', ') || 'None';
            embed.addFields({
                name: '📋 Forum Settings',
                value: [
                    `**Default Layout:** ${channel.defaultForumLayout === 1 ? 'List' : 'Gallery'}`,
                    `**Tags:** ${tags.length > 100 ? tags.substring(0, 100) + '...' : tags}`,
                    `**Post Slowmode:** ${channel.defaultThreadRateLimitPerUser ? `${channel.defaultThreadRateLimitPerUser}s` : 'Off'}`
                ].join('\n'),
                inline: false
            });
        }
        
        // Thread info
        if (channel.isThread()) {
            embed.addFields({
                name: '🧵 Thread Info',
                value: [
                    `**Parent:** <#${channel.parentId}>`,
                    `**Owner:** <@${channel.ownerId}>`,
                    `**Archived:** ${channel.archived ? '✅' : '❌'}`,
                    `**Locked:** ${channel.locked ? '✅' : '❌'}`,
                    `**Members:** ${channel.memberCount || 'Unknown'}`
                ].join('\n'),
                inline: false
            });
        }
        
        // Permission overwrites count
        if (channel.permissionOverwrites) {
            const overwrites = channel.permissionOverwrites.cache;
            const roleOverwrites = overwrites.filter(o => o.type === 0).size;
            const memberOverwrites = overwrites.filter(o => o.type === 1).size;
            
            embed.addFields({
                name: '🔐 Permissions',
                value: `${roleOverwrites} role${roleOverwrites !== 1 ? 's' : ''}, ${memberOverwrites} member${memberOverwrites !== 1 ? 's' : ''} with custom permissions`,
                inline: false
            });
        }
        
        message.reply({ embeds: [embed] });
    }
};
