import { EmbedBuilder } from 'discord.js';
import Guild from '../models/Guild.js';
import { getRandomFooter, RAPHAEL_TITLES } from './raphael.js';

// Glyphs and special characters for styling (Raphael theme)
export const GLYPHS = {
    // Arrows (Raphael style)
    ARROW_RIGHT: '▸',
    ARROW_LEFT: '◂',
    ARROW_UP: '▴',
    ARROW_DOWN: '▾',
    
    // Status indicators (Raphael analytical style)
    SUCCESS: '◉',
    ERROR: '⚠',
    WARNING: '◈',
    INFO: '◇',
    LOADING: '◎',
    
    // Symbols
    SHIELD: '🛡️',
    HAMMER: '🔨',
    EYE: '👁️',
    RADAR: '📡',
    LOCK: '🔒',
    UNLOCK: '🔓',
    KEY: '🔑',
    CROWN: '👑',
    STAR: '⭐',
    SPARKLE: '✨',
    
    // Member status
    EGG: '🥚',
    BABY: '👶',
    ALERT: '🚨',
    BELL: '🔔',
    
    // Moderation
    BAN: '🔨',
    KICK: '👢',
    MUTE: '🔇',
    WARN: '⚠️',
    NOTE: '📝',
    
    // Dividers
    DOT: '•',
    BULLET: '▪',
    DIAMOND: '◆',
    SQUARE: '■',
    
    // Lines and boxes
    LINE: '─',
    VERTICAL: '│',
    CORNER_TL: '┌',
    CORNER_TR: '┐',
    CORNER_BL: '└',
    CORNER_BR: '┘',
    
    // Numbers
    ONE: '1️⃣',
    TWO: '2️⃣',
    THREE: '3️⃣',
    FOUR: '4️⃣',
    FIVE: '5️⃣'
};

// Color scheme
export const COLORS = {
    SUCCESS: '#00ff00',
    ERROR: '#ff0000',
    WARNING: '#ffaa00',
    INFO: '#5865F2',
    PRIMARY: '#5865F2',
    SECONDARY: '#57F287',
    DANGER: '#ED4245',
    MUTED: '#99AAB5',
    // Raphael theme colors (cyan/blue analytical)
    RAPHAEL: '#00CED1',
    RAPHAEL_SUCCESS: '#00FF7F',
    RAPHAEL_ERROR: '#FF4757',
    RAPHAEL_WARNING: '#FFD700'
};

// Create a styled embed with guild configuration
export async function createEmbed(guildId, type = 'info') {
    const guild = await Guild.getGuild(guildId);
    const embed = new EmbedBuilder();
    
    // Set color based on type - using Raphael theme
    const colorMap = {
        success: COLORS.RAPHAEL_SUCCESS,
        error: COLORS.RAPHAEL_ERROR,
        warning: COLORS.RAPHAEL_WARNING,
        info: guild?.embedStyle?.color || COLORS.RAPHAEL,
        primary: COLORS.RAPHAEL
    };
    
    embed.setColor(colorMap[type] || COLORS.RAPHAEL);
    
    // Add timestamp if enabled
    if (guild?.embedStyle?.timestamp !== false) {
        embed.setTimestamp();
    }
    
    // Add Raphael footer
    embed.setFooter({ text: getRandomFooter() });
    
    return embed;
}

// Success embed - Raphael style
export async function successEmbed(guildId, title, description) {
    const embed = await createEmbed(guildId, 'success');
    const guildConfig = await Guild.getGuild(guildId);
    const useGlyphs = guildConfig?.embedStyle?.useGlyphs !== false;
    
    // Raphael style: analytical title format
    embed.setTitle(`『 ${title} 』`)
        .setDescription(`**Confirmed.** ${description}`);
    
    return embed;
}

// Error embed - Raphael style
export async function errorEmbed(guildId, title = 'Alert', description) {
    const embed = await createEmbed(guildId, 'error');
    const guildConfig = await Guild.getGuild(guildId);
    const useGlyphs = guildConfig?.embedStyle?.useGlyphs !== false;
    
    // If only 2 parameters, treat second param as description
    if (description === undefined && title) {
        description = title;
        title = 'Alert';
    }
    
    // Raphael style: analytical alert format
    embed.setTitle(`『 ${title} 』`);
    
    if (description) {
        embed.setDescription(`**Warning:** ${description}`);
    }
    
    return embed;
}

// Warning embed - Raphael style
export async function warningEmbed(guildId, title, description) {
    const embed = await createEmbed(guildId, 'warning');
    const guildConfig = await Guild.getGuild(guildId);
    const useGlyphs = guildConfig?.embedStyle?.useGlyphs !== false;
    
    // Raphael style: caution format
    embed.setTitle(`『 ${title} 』`)
        .setDescription(`**Caution:** ${description}`);
    
    return embed;
}

// Info embed - Raphael style
export async function infoEmbed(guildId, title, description) {
    const embed = await createEmbed(guildId, 'info');
    const guildConfig = await Guild.getGuild(guildId);
    const useGlyphs = guildConfig?.embedStyle?.useGlyphs !== false;
    
    // Raphael style: analysis format
    embed.setTitle(`『 ${title} 』`);
    
    if (description) {
        embed.setDescription(`**Analysis:** ${description}`);
    }
    
    return embed;
}

// Moderation log embed - Raphael style
export async function modLogEmbed(guildId, action, data) {
    const embed = await createEmbed(guildId, 'info');
    const guildConfig = await Guild.getGuild(guildId);
    const useGlyphs = guildConfig?.embedStyle?.useGlyphs !== false;
    
    const actionEmojis = {
        warn: GLYPHS.WARN,
        mute: GLYPHS.MUTE,
        kick: GLYPHS.KICK,
        ban: GLYPHS.BAN,
        note: GLYPHS.NOTE
    };
    
    const emoji = useGlyphs ? (actionEmojis[action] || GLYPHS.HAMMER) : '';
    
    embed.setTitle(`${emoji} ${action.toUpperCase()} | Case #${data.caseNumber}`)
        .addFields(
            { name: `${GLYPHS.ARROW_RIGHT} User`, value: data.targetTag || 'Unknown', inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Moderator`, value: data.moderatorTag, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} User ID`, value: data.targetId || 'N/A', inline: true }
        );
    
    if (data.reason) {
        embed.addFields({ name: `${GLYPHS.NOTE} Reason`, value: data.reason });
    }
    
    if (data.duration) {
        embed.addFields({ name: `${GLYPHS.LOADING} Duration`, value: data.duration, inline: true });
    }
    
    if (data.deletedMessage) {
        // Truncate and format the deleted message for display
        const truncatedMessage = data.deletedMessage.length > 500 
            ? data.deletedMessage.substring(0, 497) + '...' 
            : data.deletedMessage;
        embed.addFields({ name: `${GLYPHS.ERROR || '🗑️'} Deleted Message`, value: `\`\`\`${truncatedMessage}\`\`\`` });
    }
    
    return embed;
}

// Sus alert embed
export async function susAlertEmbed(guildId, member, memberData) {
    const embed = await createEmbed(guildId, 'warning');
    const guildConfig = await Guild.getGuild(guildId);
    const useGlyphs = guildConfig?.embedStyle?.useGlyphs !== false;
    
    const title = `${useGlyphs ? GLYPHS.RADAR : '🚨'} SUSPICIOUS ACTIVITY DETECTED`;
    
    embed.setTitle(title)
        .setDescription(`${GLYPHS.ALERT} Member **${member.user.tag}** has triggered the sus detection system.`)
        .addFields(
            { name: `${GLYPHS.ARROW_RIGHT} User`, value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Sus Level`, value: `**${memberData.susLevel}**/10`, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Account Age`, value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Join Count`, value: `${memberData.joinCount} times`, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Leave Count`, value: `${memberData.leaveCount} times`, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Status`, value: memberData.isSuspicious ? `${GLYPHS.RADAR} **RADAR ON**` : 'Normal', inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Staff action may be required' });
    
    if (memberData.joinHistory.length > 0) {
        const recentJoins = memberData.joinHistory.slice(-3).reverse();
        const joinsText = recentJoins.map((j, i) => 
            `${GLYPHS.DOT} <t:${Math.floor(j.timestamp.getTime() / 1000)}:R>${j.inviteCode ? ` (via ${j.inviteCode})` : ''}`
        ).join('\n');
        
        embed.addFields({ name: `${GLYPHS.LOADING} Recent Joins`, value: joinsText || 'No history' });
    }
    
    return embed;
}

// New account alert embed
export async function newAccountEmbed(guildId, member, accountAge) {
    const embed = await createEmbed(guildId, 'info');
    const guildConfig = await Guild.getGuild(guildId);
    const useGlyphs = guildConfig?.embedStyle?.useGlyphs !== false;
    
    embed.setTitle(`${useGlyphs ? GLYPHS.EGG : '🥚'} New Account Detected`)
        .setDescription(`${GLYPHS.BABY} **${member.user.tag}** has a very new account!`)
        .addFields(
            { name: `${GLYPHS.ARROW_RIGHT} User`, value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Account Created`, value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: `${GLYPHS.ARROW_RIGHT} Age`, value: `${accountAge} hours old`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Monitor for suspicious behavior' });
    
    return embed;
}

// Create a fancy divider
export function divider(useGlyphs = true) {
    return useGlyphs ? `${GLYPHS.LINE.repeat(30)}` : '─'.repeat(30);
}

// Format list with glyphs
export function formatList(items, useGlyphs = true) {
    const bullet = useGlyphs ? GLYPHS.ARROW_RIGHT : '•';
    return items.map(item => `${bullet} ${item}`).join('\n');
}
