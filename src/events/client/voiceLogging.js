import { Events, EmbedBuilder, AuditLogEvent } from 'discord.js';
import Guild from '../../models/Guild.js';
import { GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'voiceLogging',

    async initialize(client) {
        client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            await logVoiceUpdate(oldState, newState);
        });

        console.log('🔊 Voice logging initialized');
    }
};

// Helper to fetch who performed the action from audit logs
async function getVoiceActionExecutor(guild, targetId, actionType) {
    try {
        // Wait a bit for audit log to be created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const auditLogs = await guild.fetchAuditLogs({
            limit: 5,
            type: actionType
        });

        const relevantLog = auditLogs.entries.find(entry => {
            const timeDiff = Date.now() - entry.createdTimestamp;
            return entry.target?.id === targetId && timeDiff < 5000; // Within 5 seconds
        });

        if (relevantLog) {
            const executor = relevantLog.executor;
            if (executor.bot) {
                return { name: executor.username, type: 'bot', user: executor };
            }
            return { name: executor.username, type: 'user', user: executor };
        }

        return null;
    } catch (error) {
        // Missing permissions to view audit logs
        return null;
    }
}

async function logVoiceUpdate(oldState, newState) {
    try {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const guild = newState.guild || oldState.guild;
        const guildConfig = await Guild.getGuild(guild.id, guild.name);

        if (!guildConfig.channels.voiceLog) return;

        const logChannel = guild.channels.cache.get(guildConfig.channels.voiceLog);
        if (!logChannel) return;

        let embed = null;

        // User joined a voice channel
        if (!oldState.channel && newState.channel) {
            embed = new EmbedBuilder()
                .setTitle('🔊 Voice Channel Join')
                .setColor('#57F287')
                .setDescription(`${member} joined a voice channel`)
                .addFields(
                    { name: 'Member', value: `${member.user.tag}`, inline: true },
                    { name: 'Channel', value: `${newState.channel.name}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
        }
        // User left a voice channel (could be disconnect by admin)
        else if (oldState.channel && !newState.channel) {
            // Check if user was disconnected by someone
            const executor = await getVoiceActionExecutor(guild, member.id, AuditLogEvent.MemberDisconnect);
            
            const wasDisconnected = executor !== null;
            
            embed = new EmbedBuilder()
                .setTitle(wasDisconnected ? '🔌 Voice Disconnect' : '🔇 Voice Channel Leave')
                .setColor(wasDisconnected ? '#FF6B6B' : '#ED4245')
                .setDescription(wasDisconnected 
                    ? `${member} was disconnected from voice` 
                    : `${member} left a voice channel`)
                .addFields(
                    { name: 'Member', value: `${member.user.tag}`, inline: true },
                    { name: 'Channel', value: `${oldState.channel?.name || 'Unknown'}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
            
            if (wasDisconnected && executor) {
                const byText = executor.type === 'bot' 
                    ? `🤖 ${executor.name} (Bot)` 
                    : `👤 ${executor.name}`;
                embed.addFields({ name: 'Disconnected By', value: byText, inline: true });
            }
        }
        // User switched voice channels (could be moved by admin)
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            // Check if user was moved by someone
            const executor = await getVoiceActionExecutor(guild, member.id, AuditLogEvent.MemberMove);
            
            const wasMoved = executor !== null;
            
            embed = new EmbedBuilder()
                .setTitle(wasMoved ? '📤 Voice Move' : '🔀 Voice Channel Switch')
                .setColor(wasMoved ? '#FFA500' : '#5865F2')
                .setDescription(wasMoved 
                    ? `${member} was moved to another channel` 
                    : `${member} switched voice channels`)
                .addFields(
                    { name: 'Member', value: `${member.user.tag}`, inline: true },
                    { name: 'From', value: `${oldState.channel?.name || 'Unknown'}`, inline: true },
                    { name: 'To', value: `${newState.channel?.name || 'Unknown'}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
            
            if (wasMoved && executor) {
                const byText = executor.type === 'bot' 
                    ? `🤖 ${executor.name} (Bot)` 
                    : `👤 ${executor.name}`;
                embed.addFields({ name: 'Moved By', value: byText, inline: true });
            }
        }
        // Voice state changes (mute/deafen/stream/video)
        else if (oldState.channel && newState.channel) {
            const changes = [];
            const serverChanges = [];

            // Self-performed actions
            if (oldState.selfMute !== newState.selfMute) {
                changes.push(newState.selfMute ? '🔇 Self Muted' : '🔊 Self Unmuted');
            }
            if (oldState.selfDeaf !== newState.selfDeaf) {
                changes.push(newState.selfDeaf ? '🔇 Self Deafened' : '🔊 Self Undeafened');
            }
            if (oldState.streaming !== newState.streaming) {
                changes.push(newState.streaming ? '📺 Started Streaming' : '📺 Stopped Streaming');
            }
            if (oldState.selfVideo !== newState.selfVideo) {
                changes.push(newState.selfVideo ? '📹 Camera On' : '📹 Camera Off');
            }

            // Server-enforced actions (by admin/bot)
            if (oldState.serverMute !== newState.serverMute) {
                serverChanges.push({
                    action: newState.serverMute ? '🔇 Server Muted' : '🔊 Server Unmuted',
                    type: 'mute'
                });
            }
            if (oldState.serverDeaf !== newState.serverDeaf) {
                serverChanges.push({
                    action: newState.serverDeaf ? '🔇 Server Deafened' : '🔊 Server Undeafened',
                    type: 'deafen'
                });
            }

            // Handle server-enforced changes with executor info
            if (serverChanges.length > 0) {
                // Try to find who performed the server mute/deafen
                const executor = await getVoiceActionExecutor(guild, member.id, AuditLogEvent.MemberUpdate);
                
                const serverChangeText = serverChanges.map(c => c.action).join('\n');
                
                embed = new EmbedBuilder()
                    .setTitle('🎙️ Server Voice Action')
                    .setColor('#FF9500')
                    .setDescription(`${member}'s voice state was changed by server`)
                    .addFields(
                        { name: 'Member', value: `${member.user.tag}`, inline: true },
                        { name: 'Channel', value: `${newState.channel.name}`, inline: true },
                        { name: 'Action', value: serverChangeText, inline: false }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setFooter({ text: `User ID: ${member.id}` })
                    .setTimestamp();
                
                if (executor) {
                    const byText = executor.type === 'bot' 
                        ? `🤖 ${executor.name} (Bot)` 
                        : `👤 ${executor.name}`;
                    embed.addFields({ name: 'By', value: byText, inline: true });
                } else {
                    embed.addFields({ name: 'By', value: '⚙️ System', inline: true });
                }
            }
            // Handle self-performed changes
            else if (changes.length > 0) {
                embed = new EmbedBuilder()
                    .setTitle('🎙️ Voice State Update')
                    .setColor('#FEE75C')
                    .setDescription(`${member}'s voice state changed`)
                    .addFields(
                        { name: 'Member', value: `${member.user.tag}`, inline: true },
                        { name: 'Channel', value: `${newState.channel.name}`, inline: true },
                        { name: 'Changes', value: changes.join('\n'), inline: false },
                        { name: 'By', value: '👤 Self', inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setFooter({ text: `User ID: ${member.id}` })
                    .setTimestamp();
            }
        }

        if (embed) {
            await logChannel.send({ embeds: [embed] });
        }

    } catch (error) {
        console.error('Error logging voice update:', error);
    }
}
