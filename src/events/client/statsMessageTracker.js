import Member from '../../models/Member.js';

export default {
    name: 'messageCreate',
    once: false,
    
    execute: async (message) => {
        // Ignore bot messages and DMs
        if (message.author.bot || !message.guild) return;
        
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;
            
            // Get or create member
            const member = await Member.getMember(userId, guildId, {
                username: message.author.username,
                discriminator: message.author.discriminator,
                displayName: message.member?.displayName,
                globalName: message.author.globalName,
                avatarUrl: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
                tag: message.author.tag,
                createdAt: message.author.createdAt
            });
            
            // Initialize stats if not exists
            if (!member.stats) {
                member.stats = {
                    messagesCount: 0,
                    voiceTime: 0,
                    messageHistory: [],
                    voiceHistory: [],
                    topChannels: []
                };
            }
            
            // Increment total message count
            member.stats.messagesCount = (member.stats.messagesCount || 0) + 1;
            member.stats.lastMessageAt = new Date();
            
            // Update daily message history
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayEntry = member.stats.messageHistory?.find(entry => {
                const entryDate = new Date(entry.date);
                entryDate.setHours(0, 0, 0, 0);
                return entryDate.getTime() === today.getTime();
            });
            
            if (todayEntry) {
                todayEntry.count += 1;
            } else {
                if (!member.stats.messageHistory) member.stats.messageHistory = [];
                member.stats.messageHistory.push({
                    date: today,
                    count: 1
                });
                
                // Keep only last 30 days
                if (member.stats.messageHistory.length > 30) {
                    member.stats.messageHistory = member.stats.messageHistory.slice(-30);
                }
            }
            
            // Update top channels
            if (!member.stats.topChannels) member.stats.topChannels = [];
            
            const channelEntry = member.stats.topChannels.find(ch => ch.channelId === message.channel.id);
            
            if (channelEntry) {
                channelEntry.messageCount += 1;
                channelEntry.lastMessageAt = new Date();
            } else {
                member.stats.topChannels.push({
                    channelId: message.channel.id,
                    channelName: message.channel.name,
                    messageCount: 1,
                    lastMessageAt: new Date()
                });
                
                // Keep only top 10 channels
                if (member.stats.topChannels.length > 10) {
                    member.stats.topChannels.sort((a, b) => b.messageCount - a.messageCount);
                    member.stats.topChannels = member.stats.topChannels.slice(0, 10);
                }
            }
            
            await member.save();
            
        } catch (error) {
            console.error('Error tracking message stats:', error);
        }
    }
};
