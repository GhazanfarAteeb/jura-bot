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
        // User left a voice channel
        else if (oldState.channel && !newState.channel) {
            embed = new EmbedBuilder()
                .setTitle('🔇 Voice Channel Leave')
                .setColor('#ED4245')
                .setDescription(`${member} left a voice channel`)
                .addFields(
                    { name: 'Member', value: `${member.user.tag}`, inline: true },
                    { name: 'Channel', value: `${oldState.channel.name}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
        }
        // User switched voice channels
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            embed = new EmbedBuilder()
                .setTitle('🔀 Voice Channel Switch')
                .setColor('#5865F2')
                .setDescription(`${member} switched voice channels`)
                .addFields(
                    { name: 'Member', value: `${member.user.tag}`, inline: true },
                    { name: 'From', value: `${oldState.channel.name}`, inline: true },
                    { name: 'To', value: `${newState.channel.name}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
        }
        // User muted/deafened
        else if (oldState.channel && newState.channel) {
            const changes = [];

            if (oldState.selfMute !== newState.selfMute) {
                changes.push(newState.selfMute ? '🔇 Self Muted' : '🔊 Self Unmuted');
            }
            if (oldState.selfDeaf !== newState.selfDeaf) {
                changes.push(newState.selfDeaf ? '🔇 Self Deafened' : '🔊 Self Undeafened');
            }
            if (oldState.serverMute !== newState.serverMute) {
                changes.push(newState.serverMute ? '🔇 Server Muted' : '🔊 Server Unmuted');
            }
            if (oldState.serverDeaf !== newState.serverDeaf) {
                changes.push(newState.serverDeaf ? '🔇 Server Deafened' : '🔊 Server Undeafened');
            }
            if (oldState.streaming !== newState.streaming) {
                changes.push(newState.streaming ? '📺 Started Streaming' : '📺 Stopped Streaming');
            }
            if (oldState.selfVideo !== newState.selfVideo) {
                changes.push(newState.selfVideo ? '📹 Camera On' : '📹 Camera Off');
            }

            if (changes.length > 0) {
                embed = new EmbedBuilder()
                    .setTitle('🎙️ Voice State Update')
                    .setColor('#FEE75C')
                    .setDescription(`${member}'s voice state changed`)
                    .addFields(
                        { name: 'Member', value: `${member.user.tag}`, inline: true },
                        { name: 'Channel', value: `${newState.channel.name}`, inline: true },
                        { name: 'Changes', value: changes.join('\n'), inline: false }
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
