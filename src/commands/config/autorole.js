import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'autorole',
  description: 'Configure automatic roles assigned to new members or bots',
  usage: '<add|remove|list|delay|enable|disable|bot> [options]',
  aliases: ['joinrole', 'defaultrole'],
  category: 'config',
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,

  async execute(message, args, client) {
    const prefix = await getPrefix(message.guild.id);
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Check for admin role
    const hasAdminRole = guildConfig.roles.adminRoles?.some(roleId =>
      message.member.roles.cache.has(roleId)
    );

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Administrator permissions to manage auto roles.`)]
      });
    }

    if (!guildConfig.autoRole) {
      guildConfig.autoRole = { enabled: false, roles: [], delay: 0, botRoles: [] };
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      const embed = new EmbedBuilder()
        .setTitle('🎭 Auto Role Configuration')
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .setDescription('Automatically assign roles to new members when they join.')
        .addFields(
          { name: `${prefix}autorole enable`, value: 'Enable auto role system', inline: true },
          { name: `${prefix}autorole disable`, value: 'Disable auto role system', inline: true },
          { name: `${prefix}autorole add <@role>`, value: 'Add a role to assign', inline: true },
          { name: `${prefix}autorole remove <@role>`, value: 'Remove a role', inline: true },
          { name: `${prefix}autorole delay <seconds>`, value: 'Set delay before assigning', inline: true },
          { name: `${prefix}autorole bot add <@role>`, value: 'Add role for bots', inline: true },
          { name: `${prefix}autorole bot remove <@role>`, value: 'Remove bot role', inline: true },
          { name: `${prefix}autorole list`, value: 'Show current configuration', inline: true }
        )
        .setFooter({ text: `Current Status: ${guildConfig.autoRole.enabled ? '✅ Enabled' : '❌ Disabled'}` });

      return message.reply({ embeds: [embed] });
    }

    switch (subcommand) {
      case 'enable': {
        if (guildConfig.autoRole.roles.length === 0 && guildConfig.autoRole.botRoles.length === 0) {
          const embed = await errorEmbed(message.guild.id, 'No Roles Configured',
            `${GLYPHS.ERROR} Please add at least one role before enabling!\n\n**Usage:** \`${prefix}autorole add @role\``
          );
          return message.reply({ embeds: [embed] });
        }

        guildConfig.autoRole.enabled = true;
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Auto Role Enabled',
          `${GLYPHS.SUCCESS} New members will now automatically receive configured roles.`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'disable': {
        guildConfig.autoRole.enabled = false;
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Auto Role Disabled',
          `${GLYPHS.SUCCESS} Auto role assignment has been disabled.`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'add': {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

        if (!role) {
          const embed = await errorEmbed(message.guild.id, 'Role Not Found',
            `${GLYPHS.ERROR} Please mention a valid role!\n\n**Usage:** \`${prefix}autorole add @role\``
          );
          return message.reply({ embeds: [embed] });
        }

        // Check role hierarchy
        if (role.position >= message.guild.members.me.roles.highest.position) {
          const embed = await errorEmbed(message.guild.id, 'Role Too High',
            `${GLYPHS.ERROR} I cannot assign ${role} because it's higher than or equal to my highest role.`
          );
          return message.reply({ embeds: [embed] });
        }

        if (role.managed) {
          const embed = await errorEmbed(message.guild.id, 'Managed Role',
            `${GLYPHS.ERROR} ${role} is managed by an integration and cannot be assigned manually.`
          );
          return message.reply({ embeds: [embed] });
        }

        if (guildConfig.autoRole.roles.includes(role.id)) {
          const embed = await errorEmbed(message.guild.id, 'Already Added',
            `${GLYPHS.ERROR} ${role} is already in the auto role list!`
          );
          return message.reply({ embeds: [embed] });
        }

        guildConfig.autoRole.roles.push(role.id);
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Role Added',
          `${GLYPHS.SUCCESS} ${role} will now be assigned to new members!\n\n**Total Roles:** ${guildConfig.autoRole.roles.length}`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'remove': {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

        if (!role) {
          const embed = await errorEmbed(message.guild.id, 'Role Not Found',
            `${GLYPHS.ERROR} Please mention a valid role!\n\n**Usage:** \`${prefix}autorole remove @role\``
          );
          return message.reply({ embeds: [embed] });
        }

        const index = guildConfig.autoRole.roles.indexOf(role.id);
        if (index === -1) {
          const embed = await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} ${role} is not in the auto role list!`
          );
          return message.reply({ embeds: [embed] });
        }

        guildConfig.autoRole.roles.splice(index, 1);
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Role Removed',
          `${GLYPHS.SUCCESS} ${role} has been removed from auto roles.\n\n**Remaining Roles:** ${guildConfig.autoRole.roles.length}`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'delay': {
        const delay = parseInt(args[1]);

        if (isNaN(delay) || delay < 0 || delay > 600) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Delay',
            `${GLYPHS.ERROR} Please enter a delay between 0 and 600 seconds!\n\n**Usage:** \`${prefix}autorole delay <seconds>\``
          );
          return message.reply({ embeds: [embed] });
        }

        guildConfig.autoRole.delay = delay * 1000; // Convert to milliseconds
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Delay Updated',
          delay === 0
            ? `${GLYPHS.SUCCESS} Roles will be assigned immediately when members join.`
            : `${GLYPHS.SUCCESS} Roles will be assigned **${delay} seconds** after members join.`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'bot': {
        const action = args[1]?.toLowerCase();
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

        if (!action || !['add', 'remove', 'list'].includes(action)) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Action',
            `${GLYPHS.ERROR} Valid actions: \`add\`, \`remove\`, \`list\`\n\n**Usage:** \`${prefix}autorole bot add @role\``
          );
          return message.reply({ embeds: [embed] });
        }

        if (action === 'list') {
          if (guildConfig.autoRole.botRoles.length === 0) {
            const embed = await infoEmbed(message.guild.id, 'No Bot Roles',
              `${GLYPHS.INFO} No auto roles configured for bots.`
            );
            return message.reply({ embeds: [embed] });
          }

          const rolesList = guildConfig.autoRole.botRoles
            .map(id => {
              const r = message.guild.roles.cache.get(id);
              return r ? r.toString() : `Unknown (${id})`;
            })
            .join('\n');

          const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Auto Roles')
            .setColor(guildConfig.embedStyle?.color || '#5865F2')
            .setDescription(rolesList);

          return message.reply({ embeds: [embed] });
        }

        if (!role) {
          const embed = await errorEmbed(message.guild.id, 'Role Not Found',
            `${GLYPHS.ERROR} Please mention a valid role!\n\n**Usage:** \`${prefix}autorole bot ${action} @role\``
          );
          return message.reply({ embeds: [embed] });
        }

        if (action === 'add') {
          if (role.position >= message.guild.members.me.roles.highest.position) {
            const embed = await errorEmbed(message.guild.id, 'Role Too High',
              `${GLYPHS.ERROR} I cannot assign ${role} because it's higher than my highest role.`
            );
            return message.reply({ embeds: [embed] });
          }

          if (guildConfig.autoRole.botRoles.includes(role.id)) {
            const embed = await errorEmbed(message.guild.id, 'Already Added',
              `${GLYPHS.ERROR} ${role} is already in the bot auto role list!`
            );
            return message.reply({ embeds: [embed] });
          }

          guildConfig.autoRole.botRoles.push(role.id);
          await guildConfig.save();

          const embed = await successEmbed(message.guild.id, 'Bot Role Added',
            `${GLYPHS.SUCCESS} ${role} will now be assigned to new bots!`
          );
          return message.reply({ embeds: [embed] });
        }

        if (action === 'remove') {
          const index = guildConfig.autoRole.botRoles.indexOf(role.id);
          if (index === -1) {
            const embed = await errorEmbed(message.guild.id, 'Not Found',
              `${GLYPHS.ERROR} ${role} is not in the bot auto role list!`
            );
            return message.reply({ embeds: [embed] });
          }

          guildConfig.autoRole.botRoles.splice(index, 1);
          await guildConfig.save();

          const embed = await successEmbed(message.guild.id, 'Bot Role Removed',
            `${GLYPHS.SUCCESS} ${role} has been removed from bot auto roles.`
          );
          return message.reply({ embeds: [embed] });
        }
        break;
      }

      case 'list': {
        const embed = new EmbedBuilder()
          .setTitle('🎭 Auto Role Configuration')
          .setColor(guildConfig.embedStyle?.color || '#5865F2')
          .addFields(
            {
              name: '📊 Status',
              value: guildConfig.autoRole.enabled ? '✅ Enabled' : '❌ Disabled',
              inline: true
            },
            {
              name: '⏱️ Delay',
              value: guildConfig.autoRole.delay
                ? `${guildConfig.autoRole.delay / 1000} seconds`
                : 'Instant',
              inline: true
            }
          );

        // Member roles
        if (guildConfig.autoRole.roles.length > 0) {
          const rolesList = guildConfig.autoRole.roles
            .map(id => {
              const role = message.guild.roles.cache.get(id);
              return role ? role.toString() : `~~Unknown (${id})~~`;
            })
            .join('\n');

          embed.addFields({ name: '👤 Member Roles', value: rolesList, inline: false });
        } else {
          embed.addFields({ name: '👤 Member Roles', value: '*No roles configured*', inline: false });
        }

        // Bot roles
        if (guildConfig.autoRole.botRoles.length > 0) {
          const botRolesList = guildConfig.autoRole.botRoles
            .map(id => {
              const role = message.guild.roles.cache.get(id);
              return role ? role.toString() : `~~Unknown (${id})~~`;
            })
            .join('\n');

          embed.addFields({ name: '🤖 Bot Roles', value: botRolesList, inline: false });
        } else {
          embed.addFields({ name: '🤖 Bot Roles', value: '*No roles configured*', inline: false });
        }

        return message.reply({ embeds: [embed] });
      }

      default: {
        const embed = await errorEmbed(message.guild.id, 'Unknown Subcommand',
          `${GLYPHS.ERROR} Unknown subcommand: \`${subcommand}\`\n\nUse \`${prefix}autorole\` to see available options.`
        );
        return message.reply({ embeds: [embed] });
      }
    }
  }
};
