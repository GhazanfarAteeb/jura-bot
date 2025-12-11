import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Member from '../../models/Member.js';
import Guild from '../../models/Guild.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'stats',
    description: 'View detailed server statistics with filters',
    usage: 'stats [@user]',
    category: 'utility',
    aliases: ['statistics', 'serverstats', 'userstats'],
    cooldown: 10,
    
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const targetUser = message.mentions.users.first() || message.author;
        const userId = targetUser.id;
        
        try {
            await message.channel.sendTyping();
            
            const guildConfig = await Guild.getGuild(guildId);
            const memberData = await Member.getMember(userId, guildId, {
                username: targetUser.username,
                discriminator: targetUser.discriminator,
                displayName: targetUser.displayName,
                globalName: targetUser.globalName,
                avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                tag: targetUser.tag,
                createdAt: targetUser.createdAt
            });
            
            // Calculate time ranges
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
            
            // Get stats for different time ranges
            const stats1d = calculateStatsForTimeRange(memberData, oneDayAgo);
            const stats7d = calculateStatsForTimeRange(memberData, sevenDaysAgo);
            const stats14d = calculateStatsForTimeRange(memberData, fourteenDaysAgo);
            const statsTotal = {
                messages: memberData.stats?.messagesCount || 0,
                voiceTime: memberData.stats?.voiceTime || 0
            };
            
            // Calculate ranks
            const allMembers = await Member.find({ guildId });
            const messageRank = calculateRank(allMembers, memberData, 'messagesCount');
            const voiceRank = calculateRank(allMembers, memberData, 'voiceTime');
            
            // Create initial embed
            const embed = createStatsEmbed(targetUser, {
                '1d': stats1d,
                '7d': stats7d,
                '14d': stats14d,
                'total': statsTotal
            }, messageRank, voiceRank, 'total', guildConfig);
            
            // Create select menu for time filter
            const timeFilterMenu = new StringSelectMenuBuilder()
                .setCustomId('stats_time_filter')
                .setPlaceholder('Select time range')
                .addOptions([
                    {
                        label: 'Last 24 Hours',
                        description: 'View stats from the last day',
                        value: '1d',
                        emoji: '📅'
                    },
                    {
                        label: 'Last 7 Days',
                        description: 'View stats from the last week',
                        value: '7d',
                        emoji: '📆'
                    },
                    {
                        label: 'Last 14 Days',
                        description: 'View stats from the last 2 weeks',
                        value: '14d',
                        emoji: '📊'
                    },
                    {
                        label: 'All Time',
                        description: 'View all-time statistics',
                        value: 'total',
                        emoji: '⏱️'
                    }
                ]);
            
            const row1 = new ActionRowBuilder().addComponents(timeFilterMenu);
            
            // Create buttons for different stat views
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('stats_messages')
                    .setLabel('Messages')
                    .setEmoji('💬')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stats_voice')
                    .setLabel('Voice Activity')
                    .setEmoji('🎤')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stats_channels')
                    .setLabel('Top Channels')
                    .setEmoji('📍')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stats_refresh')
                    .setLabel('Refresh')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Success)
            );
            
            const reply = await message.reply({
                embeds: [embed],
                components: [row1, row2]
            });
            
            // Create collector for interactions
            const collector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 300000 // 5 minutes
            });
            
            let currentTimeRange = 'total';
            let currentView = 'overview';
            
            collector.on('collect', async (interaction) => {
                await interaction.deferUpdate();
                
                if (interaction.isStringSelectMenu()) {
                    currentTimeRange = interaction.values[0];
                }
                
                if (interaction.isButton()) {
                    if (interaction.customId === 'stats_messages') {
                        currentView = 'messages';
                    } else if (interaction.customId === 'stats_voice') {
                        currentView = 'voice';
                    } else if (interaction.customId === 'stats_channels') {
                        currentView = 'channels';
                    } else if (interaction.customId === 'stats_refresh') {
                        currentView = 'overview';
                        // Refresh data
                        const refreshedMember = await Member.getMember(userId, guildId, {
                            username: targetUser.username,
                            discriminator: targetUser.discriminator,
                            displayName: targetUser.displayName,
                            globalName: targetUser.globalName,
                            avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                            tag: targetUser.tag,
                            createdAt: targetUser.createdAt
                        });
                        
                        // Recalculate stats
                        const newStats1d = calculateStatsForTimeRange(refreshedMember, oneDayAgo);
                        const newStats7d = calculateStatsForTimeRange(refreshedMember, sevenDaysAgo);
                        const newStats14d = calculateStatsForTimeRange(refreshedMember, fourteenDaysAgo);
                        const newStatsTotal = {
                            messages: refreshedMember.stats?.messagesCount || 0,
                            voiceTime: refreshedMember.stats?.voiceTime || 0
                        };
                        
                        const newEmbed = createStatsEmbed(targetUser, {
                            '1d': newStats1d,
                            '7d': newStats7d,
                            '14d': newStats14d,
                            'total': newStatsTotal
                        }, messageRank, voiceRank, currentTimeRange, guildConfig);
                        
                        return interaction.editReply({ embeds: [newEmbed] });
                    }
                }
                
                // Create appropriate embed based on current view
                let newEmbed;
                if (currentView === 'messages') {
                    newEmbed = createMessageStatsEmbed(targetUser, memberData, currentTimeRange);
                } else if (currentView === 'voice') {
                    newEmbed = createVoiceStatsEmbed(targetUser, memberData, currentTimeRange);
                } else if (currentView === 'channels') {
                    newEmbed = createChannelStatsEmbed(targetUser, memberData, currentTimeRange, message.guild);
                } else {
                    newEmbed = createStatsEmbed(targetUser, {
                        '1d': stats1d,
                        '7d': stats7d,
                        '14d': stats14d,
                        'total': statsTotal
                    }, messageRank, voiceRank, currentTimeRange, guildConfig);
                }
                
                await interaction.editReply({ embeds: [newEmbed] });
            });
            
            collector.on('end', () => {
                // Disable components when collector ends
                row1.components[0].setDisabled(true);
                row2.components.forEach(btn => btn.setDisabled(true));
                reply.edit({ components: [row1, row2] }).catch(() => {});
            });
            
        } catch (error) {
            console.error('Error in stats command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while fetching statistics.')]
            });
        }
    }
};

function calculateStatsForTimeRange(memberData, startDate) {
    const messageHistory = memberData.stats?.messageHistory || [];
    const voiceHistory = memberData.stats?.voiceHistory || [];
    
    // Filter messages within time range
    const messagesInRange = messageHistory.filter(entry => {
        return new Date(entry.date) >= startDate;
    }).reduce((sum, entry) => sum + (entry.count || 0), 0);
    
    // Filter voice time within time range
    const voiceInRange = voiceHistory.filter(entry => {
        return new Date(entry.date) >= startDate;
    }).reduce((sum, entry) => sum + (entry.minutes || 0), 0);
    
    return {
        messages: messagesInRange,
        voiceTime: voiceInRange
    };
}

function calculateRank(allMembers, currentMember, statField) {
    const sortedMembers = allMembers
        .filter(m => m.stats && m.stats[statField] > 0)
        .sort((a, b) => (b.stats[statField] || 0) - (a.stats[statField] || 0));
    
    const rank = sortedMembers.findIndex(m => m.userId === currentMember.userId) + 1;
    return rank > 0 ? `#${rank}` : 'N/A';
}

function createStatsEmbed(user, allStats, messageRank, voiceRank, timeRange, guildConfig) {
    const stats = allStats[timeRange];
    const timeRangeLabels = {
        '1d': 'Last 24 Hours',
        '7d': 'Last 7 Days',
        '14d': 'Last 14 Days',
        'total': 'All Time'
    };
    
    const voiceHours = Math.floor(stats.voiceTime / 60);
    const voiceMinutes = stats.voiceTime % 60;
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
            name: `${user.displayName || user.username}'s Statistics`,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`📊 Server Statistics — ${timeRangeLabels[timeRange]}`)
        .setDescription('Use the dropdown menu to change time range or buttons to view detailed stats')
        .addFields(
            {
                name: '💬 Messages',
                value: `**${stats.messages.toLocaleString()}** messages\nRank: ${messageRank}`,
                inline: true
            },
            {
                name: '🎤 Voice Activity',
                value: `**${voiceHours}h ${voiceMinutes}m**\nRank: ${voiceRank}`,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ 
            text: `Server: ${guildConfig.name || 'Unknown'} • Use buttons to explore more stats`,
            iconURL: guildConfig.iconUrl || undefined
        })
        .setTimestamp();
    
    return embed;
}

function createMessageStatsEmbed(user, memberData, timeRange) {
    const timeRangeLabels = {
        '1d': 'Last 24 Hours',
        '7d': 'Last 7 Days',
        '14d': 'Last 14 Days',
        'total': 'All Time'
    };
    
    const now = new Date();
    const startDate = timeRange === '1d' ? new Date(now - 24 * 60 * 60 * 1000)
        : timeRange === '7d' ? new Date(now - 7 * 24 * 60 * 60 * 1000)
        : timeRange === '14d' ? new Date(now - 14 * 24 * 60 * 60 * 1000)
        : new Date(0);
    
    const stats = calculateStatsForTimeRange(memberData, startDate);
    const totalMessages = memberData.stats?.messagesCount || 0;
    
    // Calculate daily average
    const daysCount = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 365;
    const avgPerDay = Math.round(stats.messages / daysCount);
    
    const embed = new EmbedBuilder()
        .setColor('#5DADE2')
        .setAuthor({ 
            name: `${user.displayName || user.username}'s Message Statistics`,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`💬 Message Activity — ${timeRangeLabels[timeRange]}`)
        .setDescription('Detailed breakdown of message activity')
        .addFields(
            {
                name: '📨 Messages Sent',
                value: `**${stats.messages.toLocaleString()}** messages`,
                inline: true
            },
            {
                name: '📊 Daily Average',
                value: `**${avgPerDay.toLocaleString()}** per day`,
                inline: true
            },
            {
                name: '📈 Total Messages',
                value: `**${totalMessages.toLocaleString()}**`,
                inline: true
            }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setTimestamp();
    
    return embed;
}

function createVoiceStatsEmbed(user, memberData, timeRange) {
    const timeRangeLabels = {
        '1d': 'Last 24 Hours',
        '7d': 'Last 7 Days',
        '14d': 'Last 14 Days',
        'total': 'All Time'
    };
    
    const now = new Date();
    const startDate = timeRange === '1d' ? new Date(now - 24 * 60 * 60 * 1000)
        : timeRange === '7d' ? new Date(now - 7 * 24 * 60 * 60 * 1000)
        : timeRange === '14d' ? new Date(now - 14 * 24 * 60 * 60 * 1000)
        : new Date(0);
    
    const stats = calculateStatsForTimeRange(memberData, startDate);
    const totalVoiceTime = memberData.stats?.voiceTime || 0;
    
    const voiceHours = Math.floor(stats.voiceTime / 60);
    const voiceMinutes = stats.voiceTime % 60;
    const totalHours = Math.floor(totalVoiceTime / 60);
    const totalMinutes = totalVoiceTime % 60;
    
    // Calculate daily average
    const daysCount = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const avgMinutesPerDay = Math.round(stats.voiceTime / daysCount);
    const avgHours = Math.floor(avgMinutesPerDay / 60);
    const avgMinutes = avgMinutesPerDay % 60;
    
    const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setAuthor({ 
            name: `${user.displayName || user.username}'s Voice Statistics`,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`🎤 Voice Activity — ${timeRangeLabels[timeRange]}`)
        .setDescription('Detailed breakdown of voice channel activity')
        .addFields(
            {
                name: '⏱️ Time Spent',
                value: `**${voiceHours}h ${voiceMinutes}m**`,
                inline: true
            },
            {
                name: '📊 Daily Average',
                value: `**${avgHours}h ${avgMinutes}m**`,
                inline: true
            },
            {
                name: '📈 Total Time',
                value: `**${totalHours}h ${totalMinutes}m**`,
                inline: true
            }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setTimestamp();
    
    return embed;
}

function createChannelStatsEmbed(user, memberData, timeRange, guild) {
    const timeRangeLabels = {
        '1d': 'Last 24 Hours',
        '7d': 'Last 7 Days',
        '14d': 'Last 14 Days',
        'total': 'All Time'
    };
    
    // Get top channels from member data
    const channelStats = memberData.stats?.topChannels || [];
    const topChannels = channelStats
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5);
    
    const embed = new EmbedBuilder()
        .setColor('#F39C12')
        .setAuthor({ 
            name: `${user.displayName || user.username}'s Top Channels`,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`📍 Top Channels — ${timeRangeLabels[timeRange]}`)
        .setDescription('Most active channels by message count')
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setTimestamp();
    
    if (topChannels.length === 0) {
        embed.addFields({
            name: 'No Data',
            value: 'No channel activity recorded yet.'
        });
    } else {
        topChannels.forEach((channel, index) => {
            const channelObj = guild.channels.cache.get(channel.channelId);
            const channelName = channelObj ? `<#${channel.channelId}>` : 'Unknown Channel';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            
            embed.addFields({
                name: `${medal} ${channelName}`,
                value: `**${channel.messageCount.toLocaleString()}** messages`,
                inline: true
            });
        });
    }
    
    return embed;
}
