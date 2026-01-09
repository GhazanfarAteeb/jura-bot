import { PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'setrole',
  description: 'Set custom roles for different features',
  usage: '<type> <@role|role_id>',
  aliases: ['configrole'],
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,

  async execute(message, args) {
    const guild = await Guild.getGuild(message.guild.id, message.guild.name);

    // Check for admin role
    const hasAdminRole = guild.roles.adminRoles?.some(roleId =>
      message.member.roles.cache.has(roleId)
    );

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Administrator permissions to set roles.`)]
      });
    }

    if (args.length < 2) {
      const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
        `${GLYPHS.ARROW_RIGHT} Usage: \`setrole <type> <@role|role_id>\`\n\n` +
        `**Types:**\n` +
        `${GLYPHS.DOT} \`sus\` - Role for suspicious members\n` +
        `${GLYPHS.DOT} \`newaccount\` - Role for new accounts\n` +
        `${GLYPHS.DOT} \`muted\` - Role for muted members\n` +
        `${GLYPHS.DOT} \`staff\` - Staff role (can add multiple)`
      );
      return message.reply({ embeds: [embed] });
    }

    const type = args[0].toLowerCase();
    const roleId = args[1].replace(/[<@&>]/g, '');

    // Verify role exists
    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      const embed = await errorEmbed(message.guild.id, 'Role Not Found',
        `${GLYPHS.ERROR} Could not find that role.`
      );
      return message.reply({ embeds: [embed] });
    }

    let updateData = {};

    switch (type) {
      case 'sus':
      case 'suspicious':
      case 'radar':
        updateData = {
          'roles.susRole': roleId,
          'features.memberTracking.susRole': roleId
        };
        break;

      case 'newaccount':
      case 'new':
      case 'egg':
      case 'baby':
        updateData = {
          'roles.newAccountRole': roleId,
          'features.accountAge.newAccountRole': roleId
        };
        break;

      case 'muted':
      case 'mute':
        updateData = {
          'roles.mutedRole': roleId
        };
        break;

      case 'staff':
      case 'mod':
      case 'moderator':
        const staffRoles = guild.roles?.staffRoles || [];
        if (!staffRoles.includes(roleId)) {
          staffRoles.push(roleId);
        }
        updateData = {
          'roles.staffRoles': staffRoles
        };
        break;

      default:
        const embed = await errorEmbed(message.guild.id, 'Unknown Type',
          `${GLYPHS.WARNING} Unknown role type. Use: sus, newaccount, muted, or staff`
        );
        return message.reply({ embeds: [embed] });
    }

    // Apply the update
    await Guild.updateGuild(message.guild.id, { $set: updateData });

    const typeNames = {
      sus: 'Sus/Radar',
      suspicious: 'Sus/Radar',
      radar: 'Sus/Radar',
      newaccount: 'New Account',
      new: 'New Account',
      egg: 'New Account',
      baby: 'New Account',
      muted: 'Muted',
      mute: 'Muted',
      staff: 'Staff',
      mod: 'Staff',
      moderator: 'Staff'
    };

    const embed = await successEmbed(message.guild.id, 'Role Configured',
      `${GLYPHS.ARROW_RIGHT} **${typeNames[type]}** role set to ${role}`
    );
    return message.reply({ embeds: [embed] });
  }
};
