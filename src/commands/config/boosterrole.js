import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import BoosterRole from '../../models/BoosterRole.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix, hasModPerms } from '../../utils/helpers.js';

export default {
  name: 'boosterrole',
  description: 'Configure and manage temporary booster roles that are automatically removed after 24 hours',
  usage: '<set|give|remove|list|config|clear>',
  aliases: ['tempboost', 'boostrole', 'temporaryrole'],
  category: 'config',
  permissions: [PermissionFlagsBits.ManageRoles],
  cooldown: 3,

  async execute(message, args, client) {
    const prefix = await getPrefix(message.guild.id);
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Check for moderator permissions
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Moderator/Staff permissions to manage booster roles.`)]
      });
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      return showHelp(message, guildConfig, prefix);
    }

    switch (subcommand) {
      case 'set':
      case 'setrole':
        return setBoosterRole(message, args, guildConfig, prefix);

      case 'give':
      case 'assign':
      case 'add':
        return giveBoosterRole(message, args, guildConfig, prefix);

      case 'remove':
      case 'take':
        return removeBoosterRole(message, args, guildConfig, prefix);

      case 'list':
      case 'active':
        return listActiveBoosterRoles(message, guildConfig, prefix);

      case 'config':
      case 'settings':
      case 'status':
        return showConfig(message, guildConfig, prefix);

      case 'duration':
      case 'time':
        return setDuration(message, args, guildConfig, prefix);

      case 'clear':
      case 'reset':
        return clearBoosterRole(message, guildConfig, prefix);

      case 'enable':
      case 'on':
        return enableBoosterRole(message, guildConfig);

      case 'disable':
      case 'off':
        return disableBoosterRole(message, guildConfig);

      default:
        return showHelp(message, guildConfig, prefix);
    }
  }
};

async function showHelp(message, guildConfig, prefix) {
  const boosterRoleId = guildConfig.features?.boosterRoleSystem?.roleId;
  const boosterRole = boosterRoleId ? message.guild.roles.cache.get(boosterRoleId) : null;
  const duration = guildConfig.features?.boosterRoleSystem?.duration || 24;
  const enabled = guildConfig.features?.boosterRoleSystem?.enabled || false;

  const embed = new EmbedBuilder()
    .setTitle(`${GLYPHS.SPARKLE} Booster Role System`)
    .setColor(guildConfig.embedStyle?.color || '#5865F2')
    .setDescription(
      `Manage temporary booster roles that are automatically removed after a set duration.\n\n` +
      `**Current Status:** ${enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `**Configured Role:** ${boosterRole ? boosterRole.toString() : 'Not set'}\n` +
      `**Duration:** ${duration} hours`
    )
    .addFields(
      { name: `${prefix}boosterrole set <@role>`, value: 'Set the temporary booster role', inline: false },
      { name: `${prefix}boosterrole give <@user> [reason]`, value: 'Give the booster role to a user', inline: false },
      { name: `${prefix}boosterrole remove <@user>`, value: 'Remove the booster role from a user', inline: false },
      { name: `${prefix}boosterrole duration <hours>`, value: 'Set how long the role lasts (default: 24h)', inline: false },
      { name: `${prefix}boosterrole list`, value: 'Show all users with active booster roles', inline: false },
      { name: `${prefix}boosterrole config`, value: 'Show current configuration', inline: false },
      { name: `${prefix}boosterrole enable/disable`, value: 'Enable or disable the system', inline: false },
      { name: `${prefix}boosterrole clear`, value: 'Clear the configured booster role', inline: false }
    )
    .setFooter({ text: 'A cron job runs every 24 hours to automatically remove expired booster roles' });

  return message.reply({ embeds: [embed] });
}

async function setBoosterRole(message, args, guildConfig, prefix) {
  const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

  if (!role) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Role Not Found',
        `${GLYPHS.ERROR} Please mention a valid role!\n\n**Usage:** \`${prefix}boosterrole set @role\``)]
    });
  }

  // Check role hierarchy
  if (role.position >= message.guild.members.me.roles.highest.position) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Role Too High',
        `${GLYPHS.ERROR} I cannot manage ${role} because it's higher than or equal to my highest role.`)]
    });
  }

  if (role.managed) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Managed Role',
        `${GLYPHS.ERROR} ${role} is managed by an integration and cannot be assigned manually.`)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: {
      'features.boosterRoleSystem.roleId': role.id,
      'features.boosterRoleSystem.enabled': true
    }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Booster Role Set',
      `${GLYPHS.SUCCESS} The booster role has been set to ${role}.\n\n` +
      `Users given this role will have it automatically removed after ` +
      `**${guildConfig.features?.boosterRoleSystem?.duration || 24} hours**.`)]
  });
}

async function giveBoosterRole(message, args, guildConfig, prefix) {
  const boosterRoleId = guildConfig.features?.boosterRoleSystem?.roleId;

  if (!boosterRoleId) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Role Configured',
        `${GLYPHS.ERROR} No booster role has been configured!\n\n**Usage:** \`${prefix}boosterrole set @role\``)]
    });
  }

  if (!guildConfig.features?.boosterRoleSystem?.enabled) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'System Disabled',
        `${GLYPHS.ERROR} The booster role system is disabled!\n\n**Usage:** \`${prefix}boosterrole enable\``)]
    });
  }

  const member = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Please mention a valid user!\n\n**Usage:** \`${prefix}boosterrole give @user [reason]\``)]
    });
  }

  const role = message.guild.roles.cache.get(boosterRoleId);

  if (!role) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Role Not Found',
        `${GLYPHS.ERROR} The configured booster role no longer exists. Please set a new one.`)]
    });
  }

  // Check if user already has the role
  if (member.roles.cache.has(boosterRoleId)) {
    // Update the expiry time
    const duration = (guildConfig.features?.boosterRoleSystem?.duration || 24) * 60 * 60 * 1000; // Convert hours to ms
    const reason = args.slice(2).join(' ') || null;

    await BoosterRole.addBoosterRole(
      message.guild.id,
      member.id,
      boosterRoleId,
      duration,
      message.author.id,
      reason
    );

    const expiresAt = new Date(Date.now() + duration);
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'Role Extended',
        `${GLYPHS.INFO} ${member}'s booster role duration has been extended!\n\n` +
        `**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`)]
    });
  }

  try {
    // Add the role to the user
    await member.roles.add(role);

    // Add to database for tracking
    const duration = (guildConfig.features?.boosterRoleSystem?.duration || 24) * 60 * 60 * 1000; // Convert hours to ms
    const reason = args.slice(2).join(' ') || null;

    await BoosterRole.addBoosterRole(
      message.guild.id,
      member.id,
      boosterRoleId,
      duration,
      message.author.id,
      reason
    );

    const expiresAt = new Date(Date.now() + duration);

    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Booster Role Given',
        `${GLYPHS.SUCCESS} Successfully gave ${role} to ${member}!\n\n` +
        `**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F> (<t:${Math.floor(expiresAt.getTime() / 1000)}:R>)` +
        (reason ? `\n**Reason:** ${reason}` : ''))]
    });
  } catch (error) {
    console.error('Error giving booster role:', error);
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Error',
        `${GLYPHS.ERROR} Failed to give the booster role. Make sure I have the proper permissions.`)]
    });
  }
}

async function removeBoosterRole(message, args, guildConfig, prefix) {
  const boosterRoleId = guildConfig.features?.boosterRoleSystem?.roleId;

  if (!boosterRoleId) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Role Configured',
        `${GLYPHS.ERROR} No booster role has been configured!`)]
    });
  }

  const member = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Please mention a valid user!\n\n**Usage:** \`${prefix}boosterrole remove @user\``)]
    });
  }

  const role = message.guild.roles.cache.get(boosterRoleId);

  if (!member.roles.cache.has(boosterRoleId)) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Role',
        `${GLYPHS.ERROR} ${member} doesn't have the booster role.`)]
    });
  }

  try {
    // Remove the role from the user
    if (role) {
      await member.roles.remove(role);
    }

    // Remove from database
    await BoosterRole.removeBoosterRole(message.guild.id, member.id, boosterRoleId);

    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Booster Role Removed',
        `${GLYPHS.SUCCESS} Successfully removed the booster role from ${member}.`)]
    });
  } catch (error) {
    console.error('Error removing booster role:', error);
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Error',
        `${GLYPHS.ERROR} Failed to remove the booster role. Make sure I have the proper permissions.`)]
    });
  }
}

async function listActiveBoosterRoles(message, guildConfig, prefix) {
  const activeRoles = await BoosterRole.getGuildBoosterRoles(message.guild.id);

  if (activeRoles.length === 0) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'No Active Booster Roles',
        `${GLYPHS.INFO} There are no active temporary booster roles in this server.`)]
    });
  }

  const fields = [];
  for (const entry of activeRoles.slice(0, 25)) { // Limit to 25 for embed
    const member = await message.guild.members.fetch(entry.userId).catch(() => null);
    const role = message.guild.roles.cache.get(entry.roleId);
    const expiresTimestamp = Math.floor(entry.expiresAt.getTime() / 1000);

    fields.push({
      name: member ? member.user.tag : `User ID: ${entry.userId}`,
      value: `**Role:** ${role ? role.toString() : 'Unknown'}\n` +
        `**Expires:** <t:${expiresTimestamp}:R>\n` +
        (entry.reason ? `**Reason:** ${entry.reason}` : ''),
      inline: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${GLYPHS.SPARKLE} Active Booster Roles`)
    .setColor(guildConfig.embedStyle?.color || '#5865F2')
    .setDescription(`Showing ${activeRoles.length} active booster role(s)`)
    .addFields(fields)
    .setFooter({ text: 'Roles are automatically removed when they expire' });

  return message.reply({ embeds: [embed] });
}

async function showConfig(message, guildConfig, prefix) {
  const boosterRoleId = guildConfig.features?.boosterRoleSystem?.roleId;
  const boosterRole = boosterRoleId ? message.guild.roles.cache.get(boosterRoleId) : null;
  const duration = guildConfig.features?.boosterRoleSystem?.duration || 24;
  const enabled = guildConfig.features?.boosterRoleSystem?.enabled || false;

  const activeCount = await BoosterRole.countDocuments({
    guildId: message.guild.id,
    expiresAt: { $gt: new Date() }
  });

  const embed = new EmbedBuilder()
    .setTitle(`${GLYPHS.SETTINGS} Booster Role Configuration`)
    .setColor(guildConfig.embedStyle?.color || '#5865F2')
    .addFields(
      { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Configured Role', value: boosterRole ? boosterRole.toString() : 'Not set', inline: true },
      { name: 'Duration', value: `${duration} hours`, inline: true },
      { name: 'Active Assignments', value: `${activeCount} user(s)`, inline: true }
    )
    .setFooter({ text: 'A cron job checks every 24 hours to remove expired roles' });

  return message.reply({ embeds: [embed] });
}

async function setDuration(message, args, guildConfig, prefix) {
  const hours = parseInt(args[1]);

  if (isNaN(hours) || hours < 1 || hours > 720) { // Max 30 days
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Duration',
        `${GLYPHS.ERROR} Please provide a valid duration between 1 and 720 hours (30 days).\n\n` +
        `**Usage:** \`${prefix}boosterrole duration <hours>\``)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'features.boosterRoleSystem.duration': hours }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Duration Updated',
      `${GLYPHS.SUCCESS} Booster role duration has been set to **${hours} hours**.\n\n` +
      `This will apply to new role assignments. Existing assignments will keep their original expiry time.`)]
  });
}

async function clearBoosterRole(message, guildConfig, prefix) {
  await Guild.updateGuild(message.guild.id, {
    $unset: { 'features.boosterRoleSystem.roleId': '' },
    $set: { 'features.boosterRoleSystem.enabled': false }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Booster Role Cleared',
      `${GLYPHS.SUCCESS} The booster role configuration has been cleared.\n\n` +
      `**Note:** Existing role assignments will still be tracked and removed when they expire.`)]
  });
}

async function enableBoosterRole(message, guildConfig) {
  const boosterRoleId = guildConfig.features?.boosterRoleSystem?.roleId;

  if (!boosterRoleId) {
    const prefix = await getPrefix(message.guild.id);
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Role Configured',
        `${GLYPHS.ERROR} Please set a booster role first!\n\n**Usage:** \`${prefix}boosterrole set @role\``)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'features.boosterRoleSystem.enabled': true }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Booster Role System Enabled',
      `${GLYPHS.SUCCESS} The booster role system is now enabled!`)]
  });
}

async function disableBoosterRole(message, guildConfig) {
  await Guild.updateGuild(message.guild.id, {
    $set: { 'features.boosterRoleSystem.enabled': false }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Booster Role System Disabled',
      `${GLYPHS.SUCCESS} The booster role system has been disabled.\n\n` +
      `**Note:** Existing role assignments will still be tracked and removed when they expire.`)]
  });
}
