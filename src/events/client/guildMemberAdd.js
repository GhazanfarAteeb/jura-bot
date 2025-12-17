import { Events } from 'discord.js';
import Guild from '../../models/Guild.js';
import Member from '../../models/Member.js';
import { getHoursSince } from '../../utils/helpers.js';
import { susAlertEmbed, newAccountEmbed } from '../../utils/embeds.js';

export default {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const guildId = member.guild.id;
        
        try {
            // Run independent operations in parallel for better performance
            const [guildConfig, newInvites] = await Promise.all([
                Guild.getGuild(guildId, member.guild.name),
                member.guild.invites.fetch().catch(() => new Collection())
            ]);
            
            // Determine which invite was used
            let inviteCode = null;
            let inviterId = null;
            
            try {
                const oldInvites = client.invites.get(guildId);
                
                if (oldInvites) {
                    const usedInvite = newInvites.find(inv => {
                        const oldUses = oldInvites.get(inv.code) || 0;
                        return inv.uses > oldUses;
                    });
                    
                    if (usedInvite) {
                        inviteCode = usedInvite.code;
                        inviterId = usedInvite.inviter?.id;
                    }
                }
                
                // Update invite cache
                client.invites.set(guildId, new Map(newInvites.map(inv => [inv.code, inv.uses])));
            } catch (error) {
                console.error('Error tracking invite:', error.message);
            }
            
            // Get or create member record with full identity tracking
            let memberData = await Member.findOne({ 
                userId: member.user.id, 
                guildId 
            });
            
            if (!memberData) {
                // New member record
                memberData = await Member.create({
                    userId: member.user.id,
                    guildId,
                    username: member.user.username,
                    discriminator: member.user.discriminator || '0',
                    displayName: member.displayName || member.user.displayName,
                    globalName: member.user.globalName,
                    avatarUrl: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
                    lastKnownTag: member.user.tag,
                    accountCreatedAt: member.user.createdAt,
                    joinCount: 1,
                    joinHistory: [{
                        timestamp: new Date(),
                        inviteCode,
                        inviter: inviterId
                    }]
                });
            } else {
                // Existing member - they're rejoining
                memberData.joinCount += 1;
                
                // Update identity and track changes
                memberData.updateIdentity(member.user);
                
                memberData.joinHistory.push({
                    timestamp: new Date(),
                    inviteCode,
                    inviter: inviterId
                });
            }
            
            // Check account age
            const accountAgeHours = getHoursSince(member.user.createdTimestamp);
            const isNewAccount = memberData.checkAccountAge(guildConfig.features.accountAge.threshold);
            
            // Calculate sus level
            const susLevel = memberData.calculateSusLevel();
            
            await memberData.save();
            
            // Handle new account
            if (guildConfig.features.accountAge.enabled && isNewAccount) {
                // Assign new account role
                if (guildConfig.roles.newAccountRole) {
                    try {
                        const role = member.guild.roles.cache.get(guildConfig.roles.newAccountRole);
                        if (role) {
                            await member.roles.add(role);
                            console.log(`Assigned new account role to ${member.user.tag}`);
                        }
                    } catch (error) {
                        console.error('Error assigning new account role:', error.message);
                    }
                }
                
                // Send alert to staff
                if (guildConfig.channels.alertLog) {
                    try {
                        const alertChannel = member.guild.channels.cache.get(guildConfig.channels.alertLog);
                        if (alertChannel) {
                            const embed = await newAccountEmbed(guildId, member, accountAgeHours.toFixed(1));
                            await alertChannel.send({ embeds: [embed] });
                        }
                    } catch (error) {
                        console.error('Error sending new account alert:', error.message);
                    }
                }
            }
            
            // Handle suspicious activity
            if (guildConfig.features.memberTracking.enabled && 
                susLevel >= guildConfig.features.memberTracking.susThreshold) {
                
                // Assign sus role
                if (guildConfig.roles.susRole) {
                    try {
                        const role = member.guild.roles.cache.get(guildConfig.roles.susRole);
                        if (role) {
                            await member.roles.add(role);
                            console.log(`Assigned sus role to ${member.user.tag}`);
                        }
                    } catch (error) {
                        console.error('Error assigning sus role:', error.message);
                    }
                }
                
                // Send alert to staff
                if (guildConfig.channels.alertLog) {
                    try {
                        const alertChannel = member.guild.channels.cache.get(guildConfig.channels.alertLog);
                        if (alertChannel) {
                            const embed = await susAlertEmbed(guildId, member, memberData);
                            const alertMsg = await alertChannel.send({ 
                                content: `<@&${guildConfig.roles.staffRoles?.[0] || ''}>`,
                                embeds: [embed] 
                            });
                            
                            // Optionally create a staff chat channel
                            if (guildConfig.features.memberTracking.alertChannel) {
                                try {
                                    const staffCategory = member.guild.channels.cache.find(
                                        c => c.name.toLowerCase().includes('staff') && c.type === 4
                                    );
                                    
                                    const chatChannel = await member.guild.channels.create({
                                        name: `sus-${member.user.username.toLowerCase()}`,
                                        type: 0,
                                        parent: staffCategory?.id,
                                        permissionOverwrites: [
                                            {
                                                id: member.guild.id,
                                                deny: ['ViewChannel']
                                            },
                                            {
                                                id: member.user.id,
                                                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                                            },
                                            ...(guildConfig.roles.staffRoles || []).map(roleId => ({
                                                id: roleId,
                                                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages']
                                            }))
                                        ]
                                    });
                                    
                                    await chatChannel.send({
                                        content: `${member} - Staff wants to verify your join. Please tell us why you're here.`,
                                        embeds: [await susAlertEmbed(guildId, member, memberData)]
                                    });
                                } catch (error) {
                                    console.error('Error creating staff chat channel:', error.message);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error sending sus alert:', error.message);
                    }
                }
            }
            
            // Log join event
            if (guildConfig.channels.joinLog) {
                try {
                    const joinLogChannel = member.guild.channels.cache.get(guildConfig.channels.joinLog);
                    if (joinLogChannel) {
                        const { infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
                        const embed = await infoEmbed(guildId, 'Member Joined', 
                            `${GLYPHS.ARROW_RIGHT} **User:** ${member.user.tag} (${member.user.id})\n` +
                            `${GLYPHS.ARROW_RIGHT} **Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                            `${GLYPHS.ARROW_RIGHT} **Joined via:** ${inviteCode ? `\`${inviteCode}\`` : 'Unknown'}\n` +
                            `${GLYPHS.ARROW_RIGHT} **Join Count:** ${memberData.joinCount}\n` +
                            `${GLYPHS.ARROW_RIGHT} **Sus Level:** ${susLevel}/10`
                        );
                        embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
                        await joinLogChannel.send({ embeds: [embed] });
                    }
                } catch (error) {
                    console.error('Error logging join:', error.message);
                }
            }
            
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    }
};
