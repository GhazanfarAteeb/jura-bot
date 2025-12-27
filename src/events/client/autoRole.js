import Guild from '../../models/Guild.js';
import { logToChannel } from '../../utils/BotLog.js';

export default {
  name: 'guildMemberAdd',

  async execute(member, client) {
    // Ignore partial members
    if (member.partial) {
      try {
        await member.fetch();
      } catch {
        return;
      }
    }

    try {
      const guildConfig = await Guild.getGuild(member.guild.id, member.guild.name);

      // Check if auto role is enabled
      if (!guildConfig.autoRole?.enabled) return;

      // Get roles based on whether the member is a bot or user
      const rolesToAssign = member.user.bot
        ? guildConfig.autoRole.botRoles || []
        : guildConfig.autoRole.roles || [];

      if (rolesToAssign.length === 0) return;

      // Filter valid roles
      const validRoles = rolesToAssign.filter(roleId => {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) return false;
        // Check if bot can assign this role
        if (role.position >= member.guild.members.me.roles.highest.position) return false;
        if (role.managed) return false;
        return true;
      });

      if (validRoles.length === 0) return;

      // Assign roles after delay
      const delay = guildConfig.autoRole.delay || 0;

      const assignRoles = async () => {
        try {
          // Re-fetch member to make sure they're still in the guild
          const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
          if (!freshMember) return; // Member left

          // Add all roles
          await freshMember.roles.add(validRoles, 'Auto Role on Join');

          // Log the action
          const roleNames = validRoles
            .map(id => member.guild.roles.cache.get(id)?.name || 'Unknown')
            .join(', ');

          await logToChannel(member.guild, 'member', {
            title: '🎭 Auto Role Assigned',
            description: `**Member:** ${freshMember.user.tag}\n**Roles:** ${roleNames}`,
            color: '#00FF00'
          });

        } catch (error) {
          console.error(`[AutoRole] Failed to assign roles to ${member.user.tag}:`, error.message);

          await logToChannel(member.guild, 'member', {
            title: '⚠️ Auto Role Failed',
            description: `**Member:** ${member.user.tag}\n**Error:** ${error.message}`,
            color: '#FF0000'
          });
        }
      };

      if (delay > 0) {
        setTimeout(assignRoles, delay);
      } else {
        await assignRoles();
      }

    } catch (error) {
      console.error('[AutoRole] Error in guildMemberAdd:', error);
    }
  }
};
