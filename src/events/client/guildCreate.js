import Member from '../models/Member.js';
import Economy from '../models/Economy.js';

export default {
    name: 'guildCreate',
    once: false,
    
    execute: async (guild) => {
        try {
            console.log(`[GUILD JOIN] Joined new guild: ${guild.name} (${guild.id})`);
            console.log(`[GUILD JOIN] Recording ${guild.memberCount} member profiles...`);
            
            const startTime = Date.now();
            let recordedCount = 0;
            let skippedBots = 0;
            let errors = 0;
            
            // Fetch all members
            const members = await guild.members.fetch();
            
            // Process members in batches to avoid overwhelming the database
            const batchSize = 50;
            const memberArray = Array.from(members.values());
            
            for (let i = 0; i < memberArray.length; i += batchSize) {
                const batch = memberArray.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (member) => {
                    try {
                        // Skip bots
                        if (member.user.bot) {
                            skippedBots++;
                            return;
                        }
                        
                        const userId = member.user.id;
                        const guildId = guild.id;
                        
                        // Create/update member data
                        await Member.getMember(userId, guildId, {
                            username: member.user.username,
                            discriminator: member.user.discriminator,
                            displayName: member.displayName,
                            globalName: member.user.globalName,
                            avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
                            tag: member.user.tag,
                            createdAt: member.user.createdAt
                        });
                        
                        // Create economy profile if doesn't exist
                        await Economy.getEconomy(userId, guildId);
                        
                        recordedCount++;
                        
                    } catch (error) {
                        errors++;
                        console.error(`[GUILD JOIN] Error recording member ${member.user.tag}:`, error);
                    }
                }));
                
                // Log progress for large servers
                if (memberArray.length > 100) {
                    const progress = Math.min(i + batchSize, memberArray.length);
                    console.log(`[GUILD JOIN] Progress: ${progress}/${memberArray.length} members processed`);
                }
            }
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log(`[GUILD JOIN] ✅ Profile recording complete!`);
            console.log(`[GUILD JOIN] - Recorded: ${recordedCount} members`);
            console.log(`[GUILD JOIN] - Skipped: ${skippedBots} bots`);
            console.log(`[GUILD JOIN] - Errors: ${errors}`);
            console.log(`[GUILD JOIN] - Duration: ${duration}s`);
            
            // Try to send welcome message to system channel or first available text channel
            try {
                const welcomeChannel = guild.systemChannel || 
                                     guild.channels.cache.find(ch => 
                                         ch.type === 0 && 
                                         ch.permissionsFor(guild.members.me).has('SendMessages')
                                     );
                
                if (welcomeChannel) {
                    await welcomeChannel.send({
                        embeds: [{
                            color: 0x5865F2,
                            title: '👋 Thanks for adding JURA BOT!',
                            description: 
                                `Hello! I'm JURA BOT, a multi-purpose Discord bot with **73 commands**.\n\n` +
                                `✅ **Recorded ${recordedCount} member profiles**\n` +
                                `🤖 **Skipped ${skippedBots} bot accounts**\n\n` +
                                `**Quick Setup:**\n` +
                                `• Run \`!setup\` to auto-configure your server\n` +
                                `• Use \`!help\` to explore all commands\n` +
                                `• Configure with \`!config\`\n\n` +
                                `**Features:**\n` +
                                `⚙️ Auto-setup wizard\n` +
                                `🛡️ Advanced moderation & security\n` +
                                `💰 Economy system with gambling\n` +
                                `🎵 Music player with 25+ effects\n` +
                                `🎉 Birthdays & events\n` +
                                `📊 Detailed statistics\n` +
                                `🎨 Customizable profiles\n\n` +
                                `Need help? Use \`!help\` to get started!`,
                            thumbnail: {
                                url: guild.client.user.displayAvatarURL({ size: 256 })
                            },
                            footer: {
                                text: `Profile recording took ${duration}s`
                            },
                            timestamp: new Date()
                        }]
                    });
                }
            } catch (error) {
                console.error('[GUILD JOIN] Could not send welcome message:', error);
            }
            
        } catch (error) {
            console.error('[GUILD JOIN] Error in guildCreate event:', error);
        }
    }
};
