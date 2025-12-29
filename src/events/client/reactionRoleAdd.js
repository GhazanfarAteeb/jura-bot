import { Events } from 'discord.js';
import Guild from '../../models/Guild.js';
import redis from '../../utils/redis.js';

// Fallback lock map when Redis is unavailable
const colorRoleLocks = new Map();

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

      // Check for color roles first (check if this message is a color roles panel)
      if (guildConfig.settings?.colorRoles?.messageId === message.id) {

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
      if (!guildConfig.settings?.reactionRoles?.messages?.length) return;

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

        // Fetch the message to ensure reactions cache is populated
        let fetchedMessage = message;
        try {
          fetchedMessage = await message.fetch();
        } catch (err) {
          console.error('Failed to fetch message for reactions:', err);
        }

        for (const [roleId, existingRole] of memberColorRoles) {
          if (roleId !== role.id) {
            try {
              await member.roles.remove(existingRole, 'Color role change');

              // Remove their reaction from the old color
              const oldRoleConfig = reactionMessage.roles.find(r => r.roleId === roleId);
              if (oldRoleConfig) {
                const reactions = fetchedMessage.reactions.cache.find(r =>
                  r.emoji.name === oldRoleConfig.emoji ||
                  `<:${r.emoji.name}:${r.emoji.id}>` === oldRoleConfig.emoji
                );
                if (reactions) {
                  await reactions.users.remove(user.id).catch(() => { });
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
  },

  async handleColorRole(reaction, user, guild, guildConfig, emoji, message) {
    try {
      const colorRolesConfig = guildConfig.settings.colorRoles;
      const emojiName = emoji.name;

      // Find the role for this emoji
      let roleConfig = colorRolesConfig.roles?.find(r => r.emoji === emojiName);

      // If no roles map, try to find by role name prefix
      if (!roleConfig) {
        // Map emoji to color name
        const emojiToColor = {
          '❤️': 'Red', '🧡': 'Orange', '💛': 'Yellow', '💚': 'Green',
          '💙': 'Blue', '💜': 'Purple', '🩷': 'Pink', '🤍': 'White',
          '🖤': 'Black', '🩵': 'Cyan', '🤎': 'Brown', '💗': 'Hot Pink'
        };

        const colorName = emojiToColor[emojiName];
        if (!colorName) return;

        const role = guild.roles.cache.find(r => r.name === `🎨 ${colorName}`);
        if (!role) return;

        roleConfig = { emoji: emojiName, roleId: role.id, name: colorName };
      }

      // Get the role
      const role = guild.roles.cache.get(roleConfig.roleId);
      if (!role) return;

      // Get the member
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      // Remove other color roles first (only one color at a time)
      const allColorRoles = guild.roles.cache.filter(r => r.name.startsWith('🎨 '));
      const memberColorRoles = member.roles.cache.filter(r => r.name.startsWith('🎨 '));

      // Fetch the message to ensure reactions cache is populated
      let fetchedMessage = message;
      try {
        fetchedMessage = await message.fetch();
      } catch (err) {
        console.error('Failed to fetch message for reactions:', err);
      }

      for (const [roleId, existingRole] of memberColorRoles) {
        if (roleId !== role.id) {
          try {
            await member.roles.remove(existingRole, 'Color role change');

            // Remove their reaction from the old color
            const emojiToColor = {
              'Red': '❤️', 'Orange': '🧡', 'Yellow': '💛', 'Green': '💚',
              'Blue': '💙', 'Purple': '💜', 'Pink': '🩷', 'White': '🤍',
              'Black': '🖤', 'Cyan': '🩵', 'Brown': '🤎', 'Hot Pink': '💗'
            };

            const colorName = existingRole.name.replace('🎨 ', '');
            const oldEmoji = emojiToColor[colorName];

            if (oldEmoji) {
              const oldReaction = fetchedMessage.reactions.cache.find(r => r.emoji.name === oldEmoji);
              if (oldReaction) {
                await oldReaction.users.remove(user.id).catch(() => { });
              }
            }
          } catch (err) {
            console.error('Failed to remove old color role:', err);
          }
        }
      }

      // Add the new role
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, 'Color role selection');
      }

    } catch (error) {
      console.error('Color role add error:', error);
    }
  }
};
