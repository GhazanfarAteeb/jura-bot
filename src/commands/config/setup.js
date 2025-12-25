import { PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'setup',
  description: 'Initial server setup wizard',
  usage: '',
  aliases: ['initialize'],
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 10,

  async execute(message) {
    const embed = await infoEmbed(message.guild.id, 'Setting Up RAPHAEL',
      `${GLYPHS.LOADING} Starting setup process...`
    );
    const setupMsg = await message.reply({ embeds: [embed] });

    try {
      const guild = await Guild.getGuild(message.guild.id, message.guild.name);
      const createdItems = [];

      // Create roles
      embed.setDescription(`${GLYPHS.LOADING} Creating roles...`);
      await setupMsg.edit({ embeds: [embed] });

      // Sus role
      let susRole = message.guild.roles.cache.find(r => r.name === '🚨 Sus/Radar');
      if (!susRole) {
        susRole = await message.guild.roles.create({
          name: '🚨 Sus/Radar',
          color: '#ff9900',
          reason: 'RAPHAEL Setup - Suspicious member tracking'
        });
        createdItems.push(`Role: ${susRole}`);
      }
      guild.roles.susRole = susRole.id;
      guild.features.memberTracking.susRole = susRole.id;

      // New account role
      let newAccountRole = message.guild.roles.cache.find(r => r.name === '🥚 New Account');
      if (!newAccountRole) {
        newAccountRole = await message.guild.roles.create({
          name: '🥚 New Account',
          color: '#ffff00',
          reason: 'RAPHAEL Setup - New account tracking'
        });
        createdItems.push(`Role: ${newAccountRole}`);
      }
      guild.roles.newAccountRole = newAccountRole.id;
      guild.features.accountAge.newAccountRole = newAccountRole.id;

      // Muted role
      let mutedRole = message.guild.roles.cache.find(r => r.name === '🔇 Muted');
      if (!mutedRole) {
        mutedRole = await message.guild.roles.create({
          name: '🔇 Muted',
          color: '#808080',
          permissions: [],
          reason: 'RAPHAEL Setup - Mute functionality'
        });

        // Set permissions for muted role in all text channels
        for (const channel of message.guild.channels.cache.values()) {
          if (channel.type === ChannelType.GuildText) {
            try {
              await channel.permissionOverwrites.create(mutedRole, {
                SendMessages: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendMessagesInThreads: false
              });
            } catch (error) {
              console.error(`Failed to set permissions for ${channel.name}:`, error.message);
            }
          }
        }

        createdItems.push(`Role: ${mutedRole}`);
      }
      guild.roles.mutedRole = mutedRole.id;

      // Create channels
      embed.setDescription(`${GLYPHS.LOADING} Creating log channels...`);
      await setupMsg.edit({ embeds: [embed] });

      // Find or create logs category
      let logsCategory = message.guild.channels.cache.find(
        c => c.name.toLowerCase() === 'logs' && c.type === ChannelType.GuildCategory
      );

      if (!logsCategory) {
        logsCategory = await message.guild.channels.create({
          name: '📋 Logs',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: message.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: message.guild.roles.everyone,
              deny: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });
        createdItems.push(`Category: ${logsCategory.name}`);
      }

      // Mod log channel
      let modLogChannel = message.guild.channels.cache.find(c => c.name === 'mod-log');
      if (!modLogChannel) {
        modLogChannel = await message.guild.channels.create({
          name: '🔨-mod-log',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Moderation logging'
        });
        createdItems.push(`Channel: ${modLogChannel}`);
      }
      guild.channels.modLog = modLogChannel.id;

      // Alert log channel
      let alertLogChannel = message.guild.channels.cache.find(c => c.name === 'alert-log');
      if (!alertLogChannel) {
        alertLogChannel = await message.guild.channels.create({
          name: '🚨-alert-log',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Security alerts'
        });
        createdItems.push(`Channel: ${alertLogChannel}`);
      }
      guild.channels.alertLog = alertLogChannel.id;
      guild.features.memberTracking.alertChannel = alertLogChannel.id;
      guild.features.accountAge.alertChannel = alertLogChannel.id;

      // Join log channel
      let joinLogChannel = message.guild.channels.cache.find(c => c.name === 'join-log');
      if (!joinLogChannel) {
        joinLogChannel = await message.guild.channels.create({
          name: '📥-join-log',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Join/leave logging'
        });
        createdItems.push(`Channel: ${joinLogChannel}`);
      }
      guild.channels.joinLog = joinLogChannel.id;

      // Bot status channel
      embed.setDescription(`${GLYPHS.LOADING} Creating community channels...`);
      await setupMsg.edit({ embeds: [embed] });

      let botStatusChannel = message.guild.channels.cache.find(c => c.name === 'bot-status');
      if (!botStatusChannel) {
        botStatusChannel = await message.guild.channels.create({
          name: '🤖-bot-status',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Bot status monitoring'
        });
        createdItems.push(`Channel: ${botStatusChannel}`);
      }
      guild.channels.botStatus = botStatusChannel.id;

      // Birthday channel
      let birthdayChannel = message.guild.channels.cache.find(c => c.name === 'birthdays');
      if (!birthdayChannel) {
        birthdayChannel = await message.guild.channels.create({
          name: '🎂-birthdays',
          type: ChannelType.GuildText,
          reason: 'RAPHAEL Setup - Birthday announcements'
        });
        createdItems.push(`Channel: ${birthdayChannel}`);
      }
      guild.channels.birthdayChannel = birthdayChannel.id;
      guild.features.birthdaySystem.channel = birthdayChannel.id;

      // Event channel
      let eventChannel = message.guild.channels.cache.find(c => c.name === 'events');
      if (!eventChannel) {
        eventChannel = await message.guild.channels.create({
          name: '📅-events',
          type: ChannelType.GuildText,
          reason: 'RAPHAEL Setup - Event announcements'
        });
        createdItems.push(`Channel: ${eventChannel}`);
      }
      guild.channels.eventChannel = eventChannel.id;
      guild.features.eventSystem.channel = eventChannel.id;

      // Level up channel
      let levelUpChannel = message.guild.channels.cache.find(c => c.name === 'level-ups');
      if (!levelUpChannel) {
        levelUpChannel = await message.guild.channels.create({
          name: '🎉-level-ups',
          type: ChannelType.GuildText,
          reason: 'RAPHAEL Setup - Level up announcements'
        });
        createdItems.push(`Channel: ${levelUpChannel}`);
      }
      guild.channels.levelUpChannel = levelUpChannel.id;
      guild.features.levelSystem.levelUpChannel = levelUpChannel.id;
      guild.features.levelSystem.enabled = true;

      // Enable all AutoMod features
      guild.features.autoMod.enabled = true;
      guild.features.autoMod.antiSpam.enabled = true;
      guild.features.autoMod.antiRaid.enabled = true;
      guild.features.autoMod.antiNuke.enabled = true;
      guild.features.autoMod.antiMassMention.enabled = true;
      guild.features.autoMod.badWords.enabled = true;
      guild.features.autoMod.badWords.useBuiltInList = true;
      guild.features.autoMod.antiRoleSpam.enabled = true;
      guild.features.autoMod.antiInvites.enabled = true;
      guild.features.autoMod.antiLinks.enabled = false; // Keep disabled by default as it's too restrictive

      // Welcome channel
      let welcomeChannel = message.guild.channels.cache.find(c => c.name === 'welcome');
      if (!welcomeChannel) {
        welcomeChannel = await message.guild.channels.create({
          name: '👋-welcome',
          type: ChannelType.GuildText,
          reason: 'RAPHAEL Setup - Welcome messages'
        });
        createdItems.push(`Channel: ${welcomeChannel}`);
      }
      guild.channels.welcomeChannel = welcomeChannel.id;
      guild.features.welcomeSystem.channel = welcomeChannel.id;

      // Save configuration
      await guild.save();

      // Send success message
      const successMsg = await successEmbed(message.guild.id, 'Setup Complete!',
        `${GLYPHS.SUCCESS} RAPHAEL has been successfully set up!\n\n` +
        `**Created Items:**\n${createdItems.map(i => `${GLYPHS.ARROW_RIGHT} ${i}`).join('\n')}\n\n` +
        `**Next Steps:**\n` +
        `${GLYPHS.ONE} Configure settings with \`${guild.prefix}config\`\n` +
        `${GLYPHS.TWO} Add staff roles with \`${guild.prefix}setrole staff @role\`\n` +
        `${GLYPHS.THREE} Review features with \`${guild.prefix}help\`\n\n` +
        `All security features are now active!`
      );

      await setupMsg.edit({ embeds: [successMsg] });

      // Send welcome message to mod log
      const welcomeEmbed = await infoEmbed(message.guild.id,
        `${GLYPHS.SPARKLE} RAPHAEL Activated`,
        `Thank you for choosing RAPHAEL!\n\n` +
        `${GLYPHS.SHIELD} All moderation and security features are now active.\n` +
        `${GLYPHS.RADAR} Monitoring for suspicious activity has begun.\n` +
        `${GLYPHS.EGG} New account detection is enabled.\n` +
        `🛡️ AutoMod is active (bad words, spam, invites, mass mentions).\n\n` +
        `Use \`${guild.prefix}help\` to see all available commands.\n` +
        `Use \`${guild.prefix}automod\` to configure AutoMod settings.`
      );

      await modLogChannel.send({ embeds: [welcomeEmbed] });

    } catch (error) {
      console.error('Setup error:', error);
      const { errorEmbed } = await import('../../utils/embeds.js');
      const errEmbed = await errorEmbed(message.guild.id, 'Setup Failed',
        `${GLYPHS.ERROR} An error occurred during setup. Please ensure I have Administrator permissions and try again.`
      );
      await setupMsg.edit({ embeds: [errEmbed] });
    }
  }
};
