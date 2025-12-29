import { Events } from 'discord.js';
import Guild from '../../models/Guild.js';

export default {
  name: Events.MessageReactionRemove,

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
        return this.handleColorRoleRemove(reaction, user, guild, guildConfig, emoji);
      }

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

      // Remove the role
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, 'Reaction role removed');
      }

    } catch (error) {
      console.error('Reaction role remove error:', error);
    }
  },

  async handleColorRoleRemove(reaction, user, guild, guildConfig, emoji) {
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

      // Remove the role
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, 'Color role removed');
      }

    } catch (error) {
      console.error('Color role remove error:', error);
    }
  }
};
