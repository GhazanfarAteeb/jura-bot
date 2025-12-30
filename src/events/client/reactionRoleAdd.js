import { Events } from 'discord.js';
import Guild from '../../models/Guild.js';
import redis from '../../utils/redis.js';
import logger from '../../utils/logger.js';

// Fallback lock map when Redis is unavailable
const colorRoleLocks = new Map();

// Track bot-initiated reaction removals to prevent triggering role removal
export const botRemovedReactions = new Map();

export default {
  name: Events.MessageReactionAdd,

  async execute(reaction, user) {
    // Ignore bots
    if (user.bot) return;

    logger.info(`[ReactionRoleAdd] Reaction received from ${user.tag} (${user.id}) with emoji: ${reaction.emoji.name}`);

    try {
      // Fetch partial reactions
      if (reaction.partial) {
        try {
          logger.info('[ReactionRoleAdd] Fetching partial reaction...');
          await reaction.fetch();
        } catch (error) {
          logger.error('[ReactionRoleAdd] Failed to fetch reaction:', error);
          return;
        }
      }

      // Also fetch partial message if needed
      if (reaction.message.partial) {
        try {
          logger.info('[ReactionRoleAdd] Fetching partial message...');
          await reaction.message.fetch();
        } catch (error) {
          logger.error('[ReactionRoleAdd] Failed to fetch message:', error);
          return;
        }
      }

      const { message, emoji } = reaction;
      const guild = message.guild;

      if (!guild) {
        logger.info('[ReactionRoleAdd] No guild found, ignoring reaction');
        return;
      }

      logger.info(`[ReactionRoleAdd] Processing reaction on message ${message.id} in guild ${guild.name} (${guild.id})`);

      // Get guild config
      const guildConfig = await Guild.getGuild(guild.id);
      logger.info(`[ReactionRoleAdd] Guild config loaded. ColorRoles messageId: ${guildConfig.settings?.colorRoles?.messageId}, Current message: ${message.id}`);

      // Check for color roles first (check if this message is a color roles panel)
      if (guildConfig.settings?.colorRoles?.messageId === message.id) {
        logger.info('[ReactionRoleAdd] This is a color roles panel message');

        // Use Redis lock to prevent race conditions when user reacts quickly
        const lockKey = `colorRole:${guild.id}:${user.id}`;

        // Try to acquire lock (Redis or fallback to Map)
        let lockAcquired = false;
        if (redis.isAvailable()) {
          lockAcquired = await redis.acquireLock(lockKey, 10); // 10 second TTL
        } else {
          if (!colorRoleLocks.has(lockKey)) {
            colorRoleLocks.set(lockKey, true);
            lockAcquired = true;
          }
        }

        if (!lockAcquired) {
          logger.info('[ReactionRoleAdd] Could not acquire lock, user is already being processed');
          // Already processing a color role for this user, ignore this reaction
          await reaction.users.remove(user.id).catch(() => { });
          return;
        }

        try {
          return await this.handleColorRole(reaction, user, guild, guildConfig, emoji, message);
        } finally {
          // Release lock
          if (redis.isAvailable()) {
            await redis.releaseLock(lockKey);
          } else {
            colorRoleLocks.delete(lockKey);
          }
        }
      }

      // Then check regular reaction roles
      logger.info(`[ReactionRoleAdd] Checking regular reaction roles. Messages configured: ${guildConfig.settings?.reactionRoles?.messages?.length || 0}`);
      
      if (!guildConfig.settings?.reactionRoles?.messages?.length) {
        logger.info('[ReactionRoleAdd] No reaction role messages configured');
        return;
      }

      // Find the message in our reaction roles config
      const reactionMessage = guildConfig.settings.reactionRoles.messages.find(
        m => m.messageId === message.id && m.channelId === message.channel.id
      );

      if (!reactionMessage) {
        logger.info(`[ReactionRoleAdd] Message ${message.id} not found in reaction roles config`);
        return;
      }

      logger.info(`[ReactionRoleAdd] Found reaction message config with ${reactionMessage.roles.length} roles`);

      // Find the role for this emoji
      const emojiKey = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
      logger.info(`[ReactionRoleAdd] Looking for role with emoji: ${emojiKey}`);
      
      const roleConfig = reactionMessage.roles.find(r => r.emoji === emojiKey || r.emoji === emoji.name);

      if (!roleConfig) {
        logger.info(`[ReactionRoleAdd] No role config found for emoji ${emojiKey}. Available emojis: ${reactionMessage.roles.map(r => r.emoji).join(', ')}`);
        return;
      }

      logger.info(`[ReactionRoleAdd] Found role config: roleId=${roleConfig.roleId}`);

      // Get the role
      const role = guild.roles.cache.get(roleConfig.roleId);
      if (!role) {
        logger.error(`[ReactionRoleAdd] Role ${roleConfig.roleId} not found in guild cache`);
        return;
      }

      logger.info(`[ReactionRoleAdd] Found role: ${role.name} (${role.id})`);

      // Get the member
      const member = await guild.members.fetch(user.id).catch((err) => {
        logger.error(`[ReactionRoleAdd] Failed to fetch member ${user.id}:`, err);
        return null;
      });
      
      if (!member) {
        logger.error(`[ReactionRoleAdd] Could not fetch member ${user.id}`);
        return;
      }

      logger.info(`[ReactionRoleAdd] Fetched member: ${member.user.tag}`);

      // Check if this is a "color role" (only one at a time)
      const isColorRole = role.name.startsWith('🎨');

      if (isColorRole) {
        logger.info(`[ReactionRoleAdd] This is a color role, checking for existing color roles`);
        // Remove other color roles first
        const colorRoleIds = reactionMessage.roles.map(r => r.roleId);
        const memberColorRoles = member.roles.cache.filter(r => colorRoleIds.includes(r.id));
        logger.info(`[ReactionRoleAdd] Member has ${memberColorRoles.size} existing color roles`);

        // Fetch the message to ensure reactions cache is populated
        let fetchedMessage = message;
        try {
          fetchedMessage = await message.fetch();
        } catch (err) {
          logger.error('[ReactionRoleAdd] Failed to fetch message for reactions:', err);
        }

        for (const [roleId, existingRole] of memberColorRoles) {
          if (roleId !== role.id) {
            try {
              logger.info(`[ReactionRoleAdd] Removing old color role: ${existingRole.name}`);
              await member.roles.remove(existingRole, 'Color role change');

              // Remove their reaction from the old color
              const oldRoleConfig = reactionMessage.roles.find(r => r.roleId === roleId);
              if (oldRoleConfig) {
                const reactions = fetchedMessage.reactions.cache.find(r =>
                  r.emoji.name === oldRoleConfig.emoji ||
                  `<:${r.emoji.name}:${r.emoji.id}>` === oldRoleConfig.emoji
                );
                if (reactions) {
                  // Mark this as a bot-removed reaction
                  const oldEmojiName = reactions.emoji.name;
                  const removeKey = `${message.id}:${user.id}:${oldEmojiName}`;
                  botRemovedReactions.set(removeKey, Date.now());
                  setTimeout(() => botRemovedReactions.delete(removeKey), 10000);

                  await reactions.users.remove(user.id).catch(() => { });
                }
              }
            } catch (err) {
              logger.error(`[ReactionRoleAdd] Failed to remove old color role ${existingRole.name}:`, err);
            }
          }
        }
      }

      // Add the new role
      if (!member.roles.cache.has(role.id)) {
        logger.info(`[ReactionRoleAdd] Adding role ${role.name} to ${member.user.tag}`);
        try {
          await member.roles.add(role, 'Reaction role');
          logger.info(`[ReactionRoleAdd] Successfully added role ${role.name} to ${member.user.tag}`);
        } catch (err) {
          logger.error(`[ReactionRoleAdd] Failed to add role ${role.name} to ${member.user.tag}:`, err);
        }
      } else {
        logger.info(`[ReactionRoleAdd] Member ${member.user.tag} already has role ${role.name}`);
      }

    } catch (error) {
      logger.error('[ReactionRoleAdd] Reaction role add error:', error);
    }
  },

  async handleColorRole(reaction, user, guild, guildConfig, emoji, message) {
    logger.info(`[handleColorRole] Processing color role for ${user.tag} with emoji: ${emoji.name}`);
    try {
      const colorRolesConfig = guildConfig.settings.colorRoles;
      const emojiName = emoji.name;

      logger.info(`[handleColorRole] colorRolesConfig.roles: ${JSON.stringify(colorRolesConfig.roles || 'undefined')}`);

      // Map emoji to color name
      const emojiToColorName = {
        '❤️': 'Red', '🧡': 'Orange', '💛': 'Yellow', '💚': 'Green',
        '💙': 'Blue', '💜': 'Purple', '🩷': 'Pink', '🤍': 'White',
        '🖤': 'Black', '🩵': 'Cyan', '🤎': 'Brown', '💗': 'Hot Pink'
      };

      const colorNameToEmoji = {
        'Red': '❤️', 'Orange': '🧡', 'Yellow': '💛', 'Green': '💚',
        'Blue': '💙', 'Purple': '💜', 'Pink': '🩷', 'White': '🤍',
        'Black': '🖤', 'Cyan': '🩵', 'Brown': '🤎', 'Hot Pink': '💗'
      };

      // Find the role for this emoji
      let roleConfig = colorRolesConfig.roles?.find(r => r.emoji === emojiName);
      logger.info(`[handleColorRole] roleConfig from colorRolesConfig.roles: ${JSON.stringify(roleConfig || 'not found')}`);

      // If no roles map, try to find by role name prefix
      if (!roleConfig) {
        const colorName = emojiToColorName[emojiName];
        logger.info(`[handleColorRole] Looking up emoji ${emojiName} -> colorName: ${colorName || 'not found'}`);
        
        if (!colorName) {
          logger.info(`[handleColorRole] Emoji ${emojiName} not found in emojiToColorName map`);
          return;
        }

        const role = guild.roles.cache.find(r => r.name === `🎨 ${colorName}`);
        if (!role) {
          logger.error(`[handleColorRole] Role "🎨 ${colorName}" not found in guild`);
          // List available roles for debugging
          const colorRoles = guild.roles.cache.filter(r => r.name.startsWith('🎨'));
          logger.info(`[handleColorRole] Available color roles: ${colorRoles.map(r => r.name).join(', ') || 'none'}`);
          return;
        }

        logger.info(`[handleColorRole] Found role by name: ${role.name} (${role.id})`);
        roleConfig = { emoji: emojiName, roleId: role.id, name: colorName };
      }

      // Get the role
      const role = guild.roles.cache.get(roleConfig.roleId);
      if (!role) {
        logger.error(`[handleColorRole] Role ${roleConfig.roleId} not found in cache`);
        return;
      }

      logger.info(`[handleColorRole] Target role: ${role.name} (${role.id}), position: ${role.position}`);

      // Check bot's highest role position
      const botMember = await guild.members.fetch(guild.client.user.id).catch(() => null);
      if (botMember) {
        const botHighestRole = botMember.roles.highest;
        logger.info(`[handleColorRole] Bot's highest role: ${botHighestRole.name} (position: ${botHighestRole.position})`);
        if (role.position >= botHighestRole.position) {
          logger.error(`[handleColorRole] Cannot assign role - role position (${role.position}) >= bot's highest role position (${botHighestRole.position})`);
        }
      }

      // Get the member
      const member = await guild.members.fetch(user.id).catch((err) => {
        logger.error(`[handleColorRole] Failed to fetch member ${user.id}:`, err);
        return null;
      });
      
      if (!member) {
        logger.error(`[handleColorRole] Could not fetch member ${user.id}`);
        return;
      }

      logger.info(`[handleColorRole] Member fetched: ${member.user.tag}`);

      // Remove other color roles first (only one color at a time)
      const memberColorRoles = member.roles.cache.filter(r => r.name.startsWith('🎨 '));
      logger.info(`[handleColorRole] Member has ${memberColorRoles.size} existing color roles`);

      // Fetch the message to ensure reactions cache is populated
      let fetchedMessage = message;
      try {
        fetchedMessage = await message.fetch();
      } catch (err) {
        logger.error('[handleColorRole] Failed to fetch message for reactions:', err);
      }

      for (const [roleId, existingRole] of memberColorRoles) {
        if (roleId !== role.id) {
          try {
            logger.info(`[handleColorRole] Removing old color role: ${existingRole.name}`);
            // Remove the old color role from member
            await member.roles.remove(existingRole, 'Color role change');
            logger.info(`[handleColorRole] Successfully removed old color role: ${existingRole.name}`);

            // Remove their reaction from the old color
            const colorName = existingRole.name.replace('🎨 ', '');
            const oldEmoji = colorNameToEmoji[colorName];

            if (oldEmoji) {
              const oldReaction = fetchedMessage.reactions.cache.find(r => r.emoji.name === oldEmoji);
              if (oldReaction) {
                // Mark this as a bot-removed reaction so reactionRoleRemove doesn't try to remove the role again
                const removeKey = `${message.id}:${user.id}:${oldEmoji}`;
                botRemovedReactions.set(removeKey, Date.now());

                // Clean up old entries after 10 seconds
                setTimeout(() => botRemovedReactions.delete(removeKey), 10000);

                await oldReaction.users.remove(user.id).catch(() => { });
                logger.info(`[handleColorRole] Removed old reaction ${oldEmoji} from user`);
              }
            }
          } catch (err) {
            logger.error(`[handleColorRole] Failed to remove old color role ${existingRole.name}:`, err);
          }
        }
      }

      // Add the new role
      if (!member.roles.cache.has(role.id)) {
        logger.info(`[handleColorRole] Adding role ${role.name} to ${member.user.tag}`);
        try {
          await member.roles.add(role, 'Color role selection');
          logger.info(`[handleColorRole] Successfully added role ${role.name} to ${member.user.tag}`);
        } catch (err) {
          logger.error(`[handleColorRole] Failed to add role ${role.name} to ${member.user.tag}:`, err);
        }
      } else {
        logger.info(`[handleColorRole] Member ${member.user.tag} already has role ${role.name}`);
      }

    } catch (error) {
      logger.error('[handleColorRole] Color role add error:', error);
    }
  }
};
