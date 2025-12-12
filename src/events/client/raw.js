// Debug event to monitor raw Discord gateway events
// This helps diagnose voice state update issues

export default {
    name: 'raw',
    once: false,
    
    execute: async (packet) => {
        // Only log voice-related events
        if (packet.t === 'VOICE_STATE_UPDATE' || packet.t === 'VOICE_SERVER_UPDATE') {
            console.log(`📡 RAW ${packet.t}:`, {
                guildId: packet.d.guild_id,
                channelId: packet.d.channel_id,
                userId: packet.d.user_id,
                sessionId: packet.d.session_id,
                endpoint: packet.d.endpoint,
                token: packet.d.token ? '***' : undefined
            });
        }
    }
};
