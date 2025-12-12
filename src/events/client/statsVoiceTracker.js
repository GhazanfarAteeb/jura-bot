import Member from '../../models/Member.js';

// Track voice state changes for stats
const voiceSessions = new Map(); // userId-guildId -> { joinedAt, channelId }

export default {
    name: 'voiceStateUpdate',
    once: false,
    
    execute: async (oldState, newState) => {
        try {
            // Log voice state updates for debugging (only for bot's own updates)
            if (newState.member.user.bot && newState.guild.members.me && newState.member.id === newState.guild.members.me.id) {
                console.log(`🔊 BOT Voice State Update in ${newState.guild.id}:`, {
                    channelId: newState.channelId,
                    sessionId: newState.sessionId,
                    deaf: newState.deaf,
                    mute: newState.mute
                });
            }
            
            // Skip tracking for bot users
            if (newState.member.user.bot) return;
            
            const userId = newState.member.user.id;
            const guildId = newState.guild.id;
            const sessionKey = `${userId}-${guildId}`;
            
            // User joined a voice channel
            if (!oldState.channel && newState.channel) {
                voiceSessions.set(sessionKey, {
                    joinedAt: Date.now(),
                    channelId: newState.channel.id
                });
            }
            
            // User left a voice channel
            if (oldState.channel && !newState.channel) {
                const session = voiceSessions.get(sessionKey);
                if (session) {
                    const duration = Math.floor((Date.now() - session.joinedAt) / 1000 / 60); // minutes
                    
                    // Only track if session was at least 1 minute
                    if (duration >= 1) {
                        await updateVoiceStats(userId, guildId, duration, newState.member);
                    }
                    
                    voiceSessions.delete(sessionKey);
                }
            }
            
            // User switched voice channels
            if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                const session = voiceSessions.get(sessionKey);
                if (session) {
                    const duration = Math.floor((Date.now() - session.joinedAt) / 1000 / 60); // minutes
                    
                    if (duration >= 1) {
                        await updateVoiceStats(userId, guildId, duration, newState.member);
                    }
                    
                    // Start new session
                    voiceSessions.set(sessionKey, {
                        joinedAt: Date.now(),
                        channelId: newState.channel.id
                    });
                }
            }
            
        } catch (error) {
            console.error('Error tracking voice stats:', error);
        }
    }
};

async function updateVoiceStats(userId, guildId, minutes, member) {
    try {
        const memberData = await Member.getMember(userId, guildId, {
            username: member.user.username,
            discriminator: member.user.discriminator,
            displayName: member.displayName,
            globalName: member.user.globalName,
            avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
            tag: member.user.tag,
            createdAt: member.user.createdAt
        });
        
        // Initialize stats if not exists
        if (!memberData.stats) {
            memberData.stats = {
                messagesCount: 0,
                voiceTime: 0,
                messageHistory: [],
                voiceHistory: [],
                topChannels: []
            };
        }
        
        // Increment total voice time
        memberData.stats.voiceTime = (memberData.stats.voiceTime || 0) + minutes;
        memberData.stats.lastVoiceAt = new Date();
        
        // Update daily voice history
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (!memberData.stats.voiceHistory) memberData.stats.voiceHistory = [];
        
        const todayEntry = memberData.stats.voiceHistory.find(entry => {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === today.getTime();
        });
        
        if (todayEntry) {
            todayEntry.minutes += minutes;
        } else {
            memberData.stats.voiceHistory.push({
                date: today,
                minutes: minutes
            });
            
            // Keep only last 30 days
            if (memberData.stats.voiceHistory.length > 30) {
                memberData.stats.voiceHistory = memberData.stats.voiceHistory.slice(-30);
            }
        }
        
        await memberData.save();
        
    } catch (error) {
        console.error('Error updating voice stats:', error);
    }
}

// Clean up sessions periodically (every hour)
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, session] of voiceSessions.entries()) {
        // If session is older than 12 hours, assume user disconnected without event
        if (now - session.joinedAt > 12 * oneHour) {
            voiceSessions.delete(key);
        }
    }
}, 60 * 60 * 1000);
