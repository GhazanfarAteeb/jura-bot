import { Events } from 'discord.js';
import Guild from '../../models/Guild.js';
import { botRemovedReactions } from './reactionRoleAdd.js';
import logger from '../../utils/logger.js';

export default {
  name: Events.MessageReactionRemove,

  async execute(reaction, user) {
    // Ignore bots
    if (user.bot) return;

    logger.info(`[ReactionRoleRemove] Reaction removed by ${user.tag} (${user.id}) with emoji: ${reaction.emoji.name}`);

    try {
      // Fetch partial reactions
      if (reaction.partial) {
        try {
          logger.info('[ReactionRoleRemove] Fetching partial reaction...');
          await reaction.fetch();
        } catch (error) {
          logger.error('[ReactionRoleRemove] Failed to fetch reaction:', error);
          return;
        }
      }

      // Also fetch partial message if needed
      if (reaction.message.partial) {
        try {
          logger.info('[ReactionRoleRemove] Fetching partial message...');
          await reaction.message.fetch();
        } catch (error) {
          logger.error('[ReactionRoleRemove] Failed to fetch message:', error);
          return;
        }
      }

      const { message, emoji } = reaction;
      const guild = message.guild;

      if (!guild) {
        logger.info('[ReactionRoleRemove] No guild found, ignoring');
        return;
      }

      // Check if this was a bot-initiated removal (from switching colors)
      const removeKey = `${message.id}:${user.id}:${emoji.name}`;
      if (botRemovedReactions.has(removeKey)) {
        logger.info(`[ReactionRoleRemove] Bot-initiated removal detected for ${removeKey}, skipping role removal`);
        // This reaction was removed by the bot during color switching, don't remove the role
        botRemovedReactions.delete(removeKey);
        return;
      }

      // Get guild config
      const guildConfig = await Guild.getGuild(guild.id);
      logger.info(`[ReactionRoleRemove] Guild config loaded. ColorRoles messageId: ${guildConfig.settings?.colorRoles?.messageId}, Current message: ${message.id}`);

      // Check for color roles first (check if this message is a color roles panel)
      if (guildConfig.settings?.colorRoles?.messageId === message.id) {
        logger.info('[ReactionRoleRemove] This is a color roles panel message');
        return this.handleColorRoleRemove(reaction, user, guild, guildConfig, emoji);
      }

      if (!guildConfig.settings?.reactionRoles?.messages?.length) {
        logger.info('[ReactionRoleRemove] No reaction role messages configured');
        return;
      }

      // Find the message in our reaction roles config
      const reactionMessage = guildConfig.settings.reactionRoles.messages.find(
        m => m.messageId === message.id && m.channelId === message.channel.id
      );

      if (!reactionMessage) {
        logger.info(`[ReactionRoleRemove] Message ${message.id} not found in reaction roles config`);
        return;
      }

      // Find the role for this emoji
      const emojiKey = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
      const roleConfig = reactionMessage.roles.find(r => r.emoji === emojiKey || r.emoji === emoji.name);

      if (!roleConfig) {
        logger.info(`[ReactionRoleRemove] No role config found for emoji ${emojiKey}`);
        return;
      }

      // Get the role
      const role = guild.roles.cache.get(roleConfig.roleId);
      if (!role) {
        logger.error(`[ReactionRoleRemove] Role ${roleConfig.roleId} not found in guild cache`);
        return;
      }

      // Get the member
      const member = await guild.members.fetch(user.id).catch((err) => {
        logger.error(`[ReactionRoleRemove] Failed to fetch member ${user.id}:`, err);
        return null;
      });
      if (!member) return;

      // Remove the role
      if (member.roles.cache.has(role.id)) {
        logger.info(`[ReactionRoleRemove] Removing role ${role.name} from ${member.user.tag}`);
        try {
          await member.roles.remove(role, 'Reaction role removed');
          logger.info(`[ReactionRoleRemove] Successfully removed role ${role.name} from ${member.user.tag}`);
        } catch (err) {
          logger.error(`[ReactionRoleRemove] Failed to remove role ${role.name}:`, err);
        }
      } else {
        logger.info(`[ReactionRoleRemove] Member ${member.user.tag} doesn't have role ${role.name}`);
      }

    } catch (error) {
      logger.error('[ReactionRoleRemove] Reaction role remove error:', error);
    }
  },

  async handleColorRoleRemove(reaction, user, guild, guildConfig, emoji) {
    logger.info(`[handleColorRoleRemove] Processing color role removal for ${user.tag} with emoji: ${emoji.name}`);
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
        if (!colorName) {
          logger.info(`[handleColorRoleRemove] Emoji ${emojiName} not found in emoji map`);
          return;
        }

        const role = guild.roles.cache.find(r => r.name === `🎨 ${colorName}`);
        if (!role) {
          logger.error(`[handleColorRoleRemove] Role "🎨 ${colorName}" not found in guild`);
          return;
        }

        roleConfig = { emoji: emojiName, roleId: role.id, name: colorName };
      }

      // Get the role
      const role = guild.roles.cache.get(roleConfig.roleId);
      if (!role) {
        logger.error(`[handleColorRoleRemove] Role ${roleConfig.roleId} not found in cache`);
        return;
      }

      // Get the member
      const member = await guild.members.fetch(user.id).catch((err) => {
        logger.error(`[handleColorRoleRemove] Failed to fetch member ${user.id}:`, err);
        return null;
      });
      if (!member) return;

      // Remove the role only if user manually removed their reaction
      if (member.roles.cache.has(role.id)) {
        logger.info(`[handleColorRoleRemove] Removing role ${role.name} from ${member.user.tag}`);
        try {
          await member.roles.remove(role, 'Color role removed by user');
          logger.info(`[handleColorRoleRemove] Successfully removed role ${role.name} from ${member.user.tag}`);
        } catch (err) {
          logger.error(`[handleColorRoleRemove] Failed to remove role ${role.name}:`, err);
        }
      } else {
        logger.info(`[handleColorRoleRemove] Member ${member.user.tag} doesn't have role ${role.name}`);
      }

    } catch (error) {
      logger.error('[handleColorRoleRemove] Color role remove error:', error);
    }
  }
};
