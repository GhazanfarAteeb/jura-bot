import { Events } from 'discord.js';
import Guild from '../../models/Guild.js';

export default {
    name: Events.MessageReactionAdd,
    
    async execute(reaction, user) {
        // Ignore bots
        if (user.bot) return;
        
        try {
            // Fetch partial reactions
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Failed to fetch reaction:', error);
                    return;
                }
            }

            const { message, emoji } = reaction;
            const guild = message.guild;
            
            if (!guild) return;

            // Get guild config
            const guildConfig = await Guild.getGuild(guild.id);
            
            if (!guildConfig.settings?.reactionRoles?.enabled) return;
            
            // Find the message in our reaction roles config
            const reactionMessage = guildConfig.settings.reactionRoles.messages.find(
                m => m.messageId === message.id && m.channelId === message.channel.id
            );
            
            if (!reactionMessage) return;

            // Find the role for this emoji
            const emojiKey = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
            const roleConfig = reactionMessage.roles.find(r => r.emoji === emojiKey || r.emoji === emoji.name);
            
            if (!roleConfig) return;

            // Get the role
            const role = guild.roles.cache.get(roleConfig.roleId);
            if (!role) return;

            // Get the member
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) return;

            // Check if this is a "color role" (only one at a time)
            const isColorRole = role.name.startsWith('🎨');
            
            if (isColorRole) {
                // Remove other color roles first
                const colorRoleIds = reactionMessage.roles.map(r => r.roleId);
                const memberColorRoles = member.roles.cache.filter(r => colorRoleIds.includes(r.id));
                
                for (const [roleId, existingRole] of memberColorRoles) {
                    if (roleId !== role.id) {
                        try {
                            await member.roles.remove(existingRole, 'Color role change');
                            
                            // Remove their reaction from the old color
                            const oldRoleConfig = reactionMessage.roles.find(r => r.roleId === roleId);
                            if (oldRoleConfig) {
                                const reactions = message.reactions.cache.find(r => 
                                    r.emoji.name === oldRoleConfig.emoji || 
                                    `<:${r.emoji.name}:${r.emoji.id}>` === oldRoleConfig.emoji
                                );
                                if (reactions) {
                                    await reactions.users.remove(user.id).catch(() => {});
                                }
                            }
                        } catch (err) {
                            console.error('Failed to remove old color role:', err);
                        }
                    }
                }
            }

            // Add the new role
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role, 'Reaction role');
            }

        } catch (error) {
            console.error('Reaction role add error:', error);
        }
    }
};
