import { PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'config',
  description: 'View or edit server configuration',
  usage: '[setting] [value]',
  aliases: ['configuration', 'settings'],
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
          `${GLYPHS.LOCK} You need Administrator permissions to view or edit configuration.`)]
      });
    }

    // If no args, show current config
    if (args.length === 0) {
      return showConfig(message, guild);
    }

    const setting = args[0].toLowerCase();
    const value = args.slice(1).join(' ');

    switch (setting) {
      case 'susthreshold':
        return await setSusThreshold(message, guild, value);

      case 'accountagethreshold':
        return await setAccountAgeThreshold(message, guild, value);

      case 'inviteverification':
        return await toggleFeature(message, guild, 'inviteVerification', value);

      case 'membertracking':
        return await toggleFeature(message, guild, 'memberTracking', value);

      case 'accountage':
        return await toggleFeature(message, guild, 'accountAge', value);

      case 'embedcolor':
        return await setEmbedColor(message, guild, value);

      default:
        const embed = await errorEmbed(message.guild.id, 'Unknown Setting',
          `${GLYPHS.WARNING} Unknown setting. Use \`config\` without arguments to see all settings.`
        );
        return message.reply({ embeds: [embed] });
    }
  }
};

async function showConfig(message, guild) {
  const embed = await infoEmbed(message.guild.id, 'Server Configuration',
    `${GLYPHS.SPARKLE} Current configuration for **${message.guild.name}**`
  );

  // General settings
  embed.addFields({
    name: `${GLYPHS.ARROW_RIGHT} General`,
    value:
      `**Prefix:** \`${guild.prefix}\`\n` +
      `**Embed Color:** ${guild.embedStyle.color}\n` +
      `**Use Glyphs:** ${guild.embedStyle.useGlyphs ? 'Yes' : 'No'}`,
    inline: false
  });

  // Feature toggles
  embed.addFields({
    name: `${GLYPHS.ARROW_RIGHT} Features`,
    value:
      `**Invite Verification:** ${guild.features.inviteVerification.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `**Member Tracking:** ${guild.features.memberTracking.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `**Account Age Check:** ${guild.features.accountAge.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `**Auto-Mod:** ${guild.features.autoMod.enabled ? '✅ Enabled' : '❌ Disabled'}`,
    inline: false
  });

  // Thresholds
  embed.addFields({
    name: `${GLYPHS.ARROW_RIGHT} Thresholds`,
    value:
      `**Sus Threshold:** ${guild.features.memberTracking.susThreshold} joins\n` +
      `**Account Age:** ${guild.features.accountAge.threshold} hours`,
    inline: false
  });

  // Roles
  embed.addFields({
    name: `${GLYPHS.ARROW_RIGHT} Roles`,
    value:
      `**Sus Role:** ${guild.roles.susRole ? `<@&${guild.roles.susRole}>` : 'Not set'}\n` +
      `**New Account Role:** ${guild.roles.newAccountRole ? `<@&${guild.roles.newAccountRole}>` : 'Not set'}\n` +
      `**Muted Role:** ${guild.roles.mutedRole ? `<@&${guild.roles.mutedRole}>` : 'Not set'}`,
    inline: false
  });

  // Channels
  embed.addFields({
    name: `${GLYPHS.ARROW_RIGHT} Channels`,
    value:
      `**Mod Log:** ${guild.channels.modLog ? `<#${guild.channels.modLog}>` : 'Not set'}\n` +
      `**Alert Log:** ${guild.channels.alertLog ? `<#${guild.channels.alertLog}>` : 'Not set'}\n` +
      `**Join Log:** ${guild.channels.joinLog ? `<#${guild.channels.joinLog}>` : 'Not set'}`,
    inline: false
  });

  embed.setFooter({ text: 'Use "config <setting> <value>" to change settings' });

  return message.reply({ embeds: [embed] });
}

async function setSusThreshold(message, guild, value) {
  const threshold = parseInt(value);

  if (isNaN(threshold) || threshold < 1 || threshold > 20) {
    const embed = await errorEmbed(message.guild.id, 'Invalid Value',
      `${GLYPHS.WARNING} Sus threshold must be a number between 1 and 20.`
    );
    return message.reply({ embeds: [embed] });
  }

  guild.features.memberTracking.susThreshold = threshold;
  await guild.save();

  const embed = await successEmbed(message.guild.id, 'Sus Threshold Updated',
    `${GLYPHS.ARROW_RIGHT} Sus threshold set to **${threshold}** joins.`
  );
  return message.reply({ embeds: [embed] });
}

async function setAccountAgeThreshold(message, guild, value) {
  const threshold = parseInt(value);

  if (isNaN(threshold) || threshold < 1 || threshold > 168) {
    const embed = await errorEmbed(message.guild.id, 'Invalid Value',
      `${GLYPHS.WARNING} Account age threshold must be a number between 1 and 168 hours (7 days).`
    );
    return message.reply({ embeds: [embed] });
  }

  guild.features.accountAge.threshold = threshold;
  await guild.save();

  const embed = await successEmbed(message.guild.id, 'Account Age Threshold Updated',
    `${GLYPHS.ARROW_RIGHT} Account age threshold set to **${threshold}** hours.`
  );
  return message.reply({ embeds: [embed] });
}

async function toggleFeature(message, guild, feature, value) {
  const enabled = value.toLowerCase() === 'on' || value.toLowerCase() === 'enable' || value.toLowerCase() === 'true';
  const disabled = value.toLowerCase() === 'off' || value.toLowerCase() === 'disable' || value.toLowerCase() === 'false';

  if (!enabled && !disabled) {
    const embed = await errorEmbed(message.guild.id, 'Invalid Value',
      `${GLYPHS.WARNING} Value must be either "on" or "off".`
    );
    return message.reply({ embeds: [embed] });
  }

  guild.features[feature].enabled = enabled;
  await guild.save();

  const featureNames = {
    inviteVerification: 'Invite Verification',
    memberTracking: 'Member Tracking',
    accountAge: 'Account Age Check'
  };

  const embed = await successEmbed(message.guild.id, 'Feature Updated',
    `${GLYPHS.ARROW_RIGHT} **${featureNames[feature]}** has been ${enabled ? '✅ enabled' : '❌ disabled'}.`
  );
  return message.reply({ embeds: [embed] });
}

async function setEmbedColor(message, guild, value) {
  if (!/^#[0-9A-F]{6}$/i.test(value)) {
    const embed = await errorEmbed(message.guild.id, 'Invalid Color',
      `${GLYPHS.WARNING} Color must be a valid hex code (e.g., #5865F2).`
    );
    return message.reply({ embeds: [embed] });
  }

  guild.embedStyle.color = value;
  await guild.save();

  const embed = await successEmbed(message.guild.id, 'Embed Color Updated',
    `${GLYPHS.ARROW_RIGHT} Embed color set to ${value}`
  );
  embed.setColor(value);
  return message.reply({ embeds: [embed] });
}
