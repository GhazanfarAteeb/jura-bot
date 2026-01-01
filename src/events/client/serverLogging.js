import { Events, EmbedBuilder, AuditLogEvent, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'serverLogging',

    async initialize(client) {
        // Channel events
        client.on(Events.ChannelCreate, async (channel) => {
            await logChannelEvent(channel, 'create');
        });

        client.on(Events.ChannelDelete, async (channel) => {
            await logChannelEvent(channel, 'delete');
        });

        client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
            await logChannelUpdate(oldChannel, newChannel);
        });

        // Role events
        client.on(Events.GuildRoleCreate, async (role) => {
            await logRoleEvent(role, 'create');
        });

        client.on(Events.GuildRoleDelete, async (role) => {
            await logRoleEvent(role, 'delete');
        });

        client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
            await logRoleUpdate(oldRole, newRole);
        });

        // Emoji events
        client.on(Events.GuildEmojiCreate, async (emoji) => {
            await logEmojiEvent(emoji, 'create');
        });

        client.on(Events.GuildEmojiDelete, async (emoji) => {
            await logEmojiEvent(emoji, 'delete');
        });

        // Server update
        client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
            await logGuildUpdate(oldGuild, newGuild);
        });

        // Invite events
        client.on(Events.InviteCreate, async (invite) => {
            await logInviteEvent(invite, 'create');
        });

        client.on(Events.InviteDelete, async (invite) => {
            await logInviteEvent(invite, 'delete');
        });

        console.log('⚙️ Server logging initialized');
    }
};

async function logChannelEvent(channel, type) {
    try {
        if (!channel.guild) return;

        const guildConfig = await Guild.getGuild(channel.guild.id, channel.guild.name);

        if (!guildConfig?.channels?.serverLog) return;

        const logChannel = channel.guild.channels.cache.get(guildConfig.channels.serverLog);
        if (!logChannel) return;

        const channelTypes = {
            [ChannelType.GuildText]: 'Text Channel',
            [ChannelType.GuildVoice]: 'Voice Channel',
            [ChannelType.GuildCategory]: 'Category',
            [ChannelType.GuildAnnouncement]: 'Announcement Channel',
            [ChannelType.GuildStageVoice]: 'Stage Channel',
            [ChannelType.GuildForum]: 'Forum Channel'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${type === 'create' ? '➕' : '➖'} Channel ${type === 'create' ? 'Created' : 'Deleted'}`)
            .setColor(type === 'create' ? '#57F287' : '#ED4245')
            .addFields(
                { name: 'Channel', value: channel.name, inline: true },
                { name: 'Type', value: channelTypes[channel.type] || 'Unknown', inline: true },
                { name: 'ID', value: channel.id, inline: true }
            )
            .setTimestamp();

        if (channel.parent) {
            embed.addFields({ name: 'Category', value: channel.parent.name, inline: true });
        }

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error logging channel event:', error);
    }
}

async function logChannelUpdate(oldChannel, newChannel) {
    try {
        if (!newChannel.guild) return;

        const guildConfig = await Guild.getGuild(newChannel.guild.id, newChannel.guild.name);

        if (!guildConfig?.channels?.serverLog) return;

        const logChannel = newChannel.guild.channels.cache.get(guildConfig.channels.serverLog);
        if (!logChannel) return;

        const changes = [];

        if (oldChannel.name !== newChannel.name) {
            changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
        }
        if (oldChannel.topic !== newChannel.topic) {
            changes.push(`**Topic:** ${oldChannel.topic || '*None*'} → ${newChannel.topic || '*None*'}`);
        }
        if (oldChannel.nsfw !== newChannel.nsfw) {
            changes.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`);
        }
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
            changes.push(`**Slowmode:** ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
        }
        if (oldChannel.parentId !== newChannel.parentId) {
            const oldParent = oldChannel.parent?.name || 'None';
            const newParent = newChannel.parent?.name || 'None';
            changes.push(`**Category:** ${oldParent} → ${newParent}`);
        }

        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Channel Updated')
            .setColor('#FEE75C')
            .setDescription(`${newChannel} was updated`)
            .addFields(
                { name: 'Changes', value: changes.join('\n').substring(0, 1024), inline: false }
            )
            .setFooter({ text: `Channel ID: ${newChannel.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error logging channel update:', error);
    }
}

async function logRoleEvent(role, type) {
    try {
        const guildConfig = await Guild.getGuild(role.guild.id, role.guild.name);

        if (!guildConfig?.channels?.serverLog) return;

        const logChannel = role.guild.channels.cache.get(guildConfig.channels.serverLog);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle(`${type === 'create' ? '➕' : '➖'} Role ${type === 'create' ? 'Created' : 'Deleted'}`)
            .setColor(type === 'create' ? '#57F287' : '#ED4245')
            .addFields(
                { name: 'Role', value: role.name, inline: true },
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'ID', value: role.id, inline: true }
            )
            .setTimestamp();

        if (type === 'create') {
            embed.addFields(
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true }
            );
        }

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error logging role event:', error);
    }
}

async function logRoleUpdate(oldRole, newRole) {
    try {
        const guildConfig = await Guild.getGuild(newRole.guild.id, newRole.guild.name);

        if (!guildConfig?.channels?.serverLog) return;

        const logChannel = newRole.guild.channels.cache.get(guildConfig.channels.serverLog);
        if (!logChannel) return;

        const changes = [];

        if (oldRole.name !== newRole.name) {
            changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
        }
        if (oldRole.hexColor !== newRole.hexColor) {
            changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
        }
        if (oldRole.hoist !== newRole.hoist) {
            changes.push(`**Hoisted:** ${oldRole.hoist} → ${newRole.hoist}`);
        }
        if (oldRole.mentionable !== newRole.mentionable) {
            changes.push(`**Mentionable:** ${oldRole.mentionable} → ${newRole.mentionable}`);
        }
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            changes.push(`**Permissions:** Modified`);
        }

        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Role Updated')
            .setColor('#FEE75C')
            .setDescription(`${newRole} was updated`)
            .addFields(
                { name: 'Changes', value: changes.join('\n'), inline: false }
            )
            .setFooter({ text: `Role ID: ${newRole.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error logging role update:', error);
    }
}

async function logEmojiEvent(emoji, type) {
    try {
        const guildConfig = await Guild.getGuild(emoji.guild.id, emoji.guild.name);

        if (!guildConfig?.channels?.serverLog) return;

        const logChannel = emoji.guild.channels.cache.get(guildConfig.channels.serverLog);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle(`${type === 'create' ? '➕' : '➖'} Emoji ${type === 'create' ? 'Added' : 'Removed'}`)
            .setColor(type === 'create' ? '#57F287' : '#ED4245')
            .addFields(
                { name: 'Emoji', value: type === 'create' ? `${emoji}` : emoji.name, inline: true },
                { name: 'Name', value: `:${emoji.name}:`, inline: true },
                { name: 'ID', value: emoji.id, inline: true }
            )
            .setThumbnail(emoji.url)
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error logging emoji event:', error);
    }
}

async function logGuildUpdate(oldGuild, newGuild) {
    try {
        const guildConfig = await Guild.getGuild(newGuild.id, newGuild.name);

        if (!guildConfig?.channels?.serverLog) return;

        const logChannel = newGuild.channels.cache.get(guildConfig.channels.serverLog);
        if (!logChannel) return;

        const changes = [];

        if (oldGuild.name !== newGuild.name) {
            changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
        }
        if (oldGuild.iconURL() !== newGuild.iconURL()) {
            changes.push(`**Icon:** Changed`);
        }
        if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
            changes.push(`**Banner:** Changed`);
        }
        if (oldGuild.description !== newGuild.description) {
            changes.push(`**Description:** Changed`);
        }
        if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
            changes.push(`**Verification Level:** ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
        }
        if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
            changes.push(`**AFK Channel:** Changed`);
        }
        if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
            changes.push(`**AFK Timeout:** ${oldGuild.afkTimeout}s → ${newGuild.afkTimeout}s`);
        }

        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Server Updated')
            .setColor('#5865F2')
            .setDescription(`Server settings were changed`)
            .addFields(
                { name: 'Changes', value: changes.join('\n').substring(0, 1024), inline: false }
            )
            .setThumbnail(newGuild.iconURL())
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error logging guild update:', error);
    }
}

async function logInviteEvent(invite, type) {
    try {
        if (!invite.guild) return;

        const guildConfig = await Guild.getGuild(invite.guild.id, invite.guild.name);

        if (!guildConfig?.channels?.serverLog) return;

        const logChannel = invite.guild.channels.cache.get(guildConfig.channels.serverLog);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle(`${type === 'create' ? '🔗' : '❌'} Invite ${type === 'create' ? 'Created' : 'Deleted'}`)
            .setColor(type === 'create' ? '#57F287' : '#ED4245')
            .addFields(
                { name: 'Code', value: invite.code, inline: true },
                { name: 'Channel', value: invite.channel?.name || 'Unknown', inline: true }
            )
            .setTimestamp();

        if (type === 'create' && invite.inviter) {
            embed.addFields(
                { name: 'Created By', value: invite.inviter.tag, inline: true },
                { name: 'Max Uses', value: `${invite.maxUses || '∞'}`, inline: true },
                { name: 'Expires', value: invite.maxAge ? `<t:${Math.floor((Date.now() + invite.maxAge * 1000) / 1000)}:R>` : 'Never', inline: true }
            );
        }

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error logging invite event:', error);
    }
}
