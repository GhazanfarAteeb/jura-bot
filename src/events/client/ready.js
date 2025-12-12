import { Events, ActivityType } from 'discord.js';
import Guild from '../../models/Guild.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        console.log(`👥 Serving ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} users`);
        
        // Set bot presence
        client.user.setPresence({
            activities: [{ 
                name: 'your server | !help',
                type: ActivityType.Watching 
            }],
            status: 'online'
        });
        
        // Cache invites for all guilds
        console.log('📋 Caching invites...');
        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                client.invites.set(guild.id, new Map(invites.map(invite => [invite.code, invite.uses])));
            } catch (error) {
                console.error(`Failed to cache invites for ${guild.name}:`, error.message);
            }
        }
        
        console.log('🚀 Bot is ready!');
    }
};
