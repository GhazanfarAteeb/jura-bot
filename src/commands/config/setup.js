import { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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

      // Create ticket system
      embed.setDescription(`${GLYPHS.LOADING} Setting up ticket system...`);
      await setupMsg.edit({ embeds: [embed] });

      // Find or create tickets category
      let ticketsCategory = message.guild.channels.cache.find(
        c => c.name.toLowerCase().includes('ticket') && c.type === ChannelType.GuildCategory
      );

      if (!ticketsCategory) {
        ticketsCategory = await message.guild.channels.create({
          name: '🎫 Tickets',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: message.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });
        createdItems.push(`Category: ${ticketsCategory.name}`);
      }

      // Create ticket panel channel
      let ticketPanelChannel = message.guild.channels.cache.find(c => c.name === 'create-ticket' || c.name === 'ticket-panel');
      if (!ticketPanelChannel) {
        ticketPanelChannel = await message.guild.channels.create({
          name: '🎫-create-ticket',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: message.guild.id,
              allow: [PermissionFlagsBits.ViewChannel],
              deny: [PermissionFlagsBits.SendMessages]
            },
            {
              id: message.client.user.id,
              allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
            }
          ],
          reason: 'RAPHAEL Setup - Ticket panel'
        });
        createdItems.push(`Channel: ${ticketPanelChannel}`);
      }

      // Create ticket log channel
      let ticketLogChannel = message.guild.channels.cache.find(c => c.name === 'ticket-log' || c.name === 'ticket-logs');
      if (!ticketLogChannel) {
        ticketLogChannel = await message.guild.channels.create({
          name: '📝-ticket-logs',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Ticket logging'
        });
        createdItems.push(`Channel: ${ticketLogChannel}`);
      }

      // Create ticket panel embed
      const ticketEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎫 Support Tickets')
        .setDescription(
          '**Need help? Open a support ticket!**\n\n' +
          'Click the button below to create a new ticket.\n' +
          'Our support team will assist you as soon as possible.\n\n' +
          '📋 **Guidelines:**\n' +
          '• Be patient and respectful\n' +
          '• Provide clear details about your issue\n' +
          '• One issue per ticket'
        )
        .setFooter({ text: 'Click below to open a ticket' })
        .setTimestamp();

      const ticketButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

      await ticketPanelChannel.send({ embeds: [ticketEmbed], components: [ticketButton] });

      // Save ticket settings
      guild.features.ticketSystem.enabled = true;
      guild.features.ticketSystem.category = ticketsCategory.id;
      guild.features.ticketSystem.logChannel = ticketLogChannel.id;
      guild.channels.ticketLog = ticketLogChannel.id;
      guild.channels.ticketCategory = ticketsCategory.id;
      guild.channels.ticketPanelChannel = ticketPanelChannel.id;

      // Create message log channel
      embed.setDescription(`${GLYPHS.LOADING} Setting up message logging...`);
      await setupMsg.edit({ embeds: [embed] });

      let messageLogChannel = message.guild.channels.cache.find(c => c.name === 'message-log' || c.name === 'message-logs');
      if (!messageLogChannel) {
        messageLogChannel = await message.guild.channels.create({
          name: '💬-message-log',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Message edit/delete logging'
        });
        createdItems.push(`Channel: ${messageLogChannel}`);
      }
      guild.channels.messageLog = messageLogChannel.id;

      // Create voice log channel
      let voiceLogChannel = message.guild.channels.cache.find(c => c.name === 'voice-log' || c.name === 'voice-logs');
      if (!voiceLogChannel) {
        voiceLogChannel = await message.guild.channels.create({
          name: '🔊-voice-log',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Voice activity logging'
        });
        createdItems.push(`Channel: ${voiceLogChannel}`);
      }
      guild.channels.voiceLog = voiceLogChannel.id;

      // Create member log channel
      let memberLogChannel = message.guild.channels.cache.find(c => c.name === 'member-log' || c.name === 'member-logs');
      if (!memberLogChannel) {
        memberLogChannel = await message.guild.channels.create({
          name: '👤-member-log',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Member update logging'
        });
        createdItems.push(`Channel: ${memberLogChannel}`);
      }
      guild.channels.memberLog = memberLogChannel.id;

      // Create server log channel
      let serverLogChannel = message.guild.channels.cache.find(c => c.name === 'server-log' || c.name === 'server-logs');
      if (!serverLogChannel) {
        serverLogChannel = await message.guild.channels.create({
          name: '⚙️-server-log',
          type: ChannelType.GuildText,
          parent: logsCategory.id,
          reason: 'RAPHAEL Setup - Server change logging'
        });
        createdItems.push(`Channel: ${serverLogChannel}`);
      }
      guild.channels.serverLog = serverLogChannel.id;

      // Create level roles
      embed.setDescription(`${GLYPHS.LOADING} Creating level roles...`);
      await setupMsg.edit({ embeds: [embed] });

      const levelRolesData = [
        { level: 5, name: '⭐ Level 5', color: '#43B581' },
        { level: 10, name: '🌟 Level 10', color: '#FAA61A' },
        { level: 20, name: '✨ Level 20', color: '#F47B67' },
        { level: 30, name: '💫 Level 30', color: '#7289DA' },
        { level: 50, name: '🏆 Level 50', color: '#FFD700' }
      ];

      for (const roleData of levelRolesData) {
        let levelRole = message.guild.roles.cache.find(r => r.name === roleData.name);
        if (!levelRole) {
          try {
            levelRole = await message.guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              reason: `RAPHAEL Setup - Level ${roleData.level} reward`
            });
            createdItems.push(`Role: ${levelRole}`);
          } catch (err) {
            console.error(`Failed to create role ${roleData.name}:`, err);
            continue;
          }
        }
        
        // Add to rewards
        const existingReward = guild.features.levelSystem.rewards.find(r => r.level === roleData.level);
        if (!existingReward) {
          guild.features.levelSystem.rewards.push({
            level: roleData.level,
            roleId: levelRole.id
          });
        }
      }

      // Enable all AutoMod features (reset if stored as boolean from old schema)
      // Always reset to proper structure to avoid Mongoose nested object issues
      guild.features.autoMod = {
        enabled: true,
        antiSpam: { 
          enabled: true,
          messageLimit: guild.features.autoMod?.antiSpam?.messageLimit || 5,
          timeWindow: guild.features.autoMod?.antiSpam?.timeWindow || 5,
          action: guild.features.autoMod?.antiSpam?.action || 'warn'
        },
        antiRaid: { 
          enabled: true,
          joinThreshold: guild.features.autoMod?.antiRaid?.joinThreshold || 10,
          timeWindow: guild.features.autoMod?.antiRaid?.timeWindow || 30,
          action: guild.features.autoMod?.antiRaid?.action || 'lockdown'
        },
        antiNuke: { 
          enabled: true,
          banThreshold: guild.features.autoMod?.antiNuke?.banThreshold || 5,
          kickThreshold: guild.features.autoMod?.antiNuke?.kickThreshold || 5,
          roleDeleteThreshold: guild.features.autoMod?.antiNuke?.roleDeleteThreshold || 3,
          channelDeleteThreshold: guild.features.autoMod?.antiNuke?.channelDeleteThreshold || 3,
          timeWindow: guild.features.autoMod?.antiNuke?.timeWindow || 60,
          action: guild.features.autoMod?.antiNuke?.action || 'removeRoles',
          whitelistedUsers: guild.features.autoMod?.antiNuke?.whitelistedUsers || []
        },
        antiMassMention: { 
          enabled: true,
          limit: guild.features.autoMod?.antiMassMention?.limit || 5,
          action: guild.features.autoMod?.antiMassMention?.action || 'delete'
        },
        badWords: { 
          enabled: true, 
          useBuiltInList: true,
          words: guild.features.autoMod?.badWords?.words || [],
          ignoredWords: guild.features.autoMod?.badWords?.ignoredWords || [],
          action: guild.features.autoMod?.badWords?.action || 'delete',
          timeoutDuration: guild.features.autoMod?.badWords?.timeoutDuration || 300,
          autoEscalate: guild.features.autoMod?.badWords?.autoEscalate ?? true
        },
        antiRoleSpam: { 
          enabled: true,
          cooldown: guild.features.autoMod?.antiRoleSpam?.cooldown || 60
        },
        antiLinks: { 
          enabled: false,
          whitelistedDomains: guild.features.autoMod?.antiLinks?.whitelistedDomains || [],
          action: guild.features.autoMod?.antiLinks?.action || 'delete'
        },
        antiInvites: { 
          enabled: true,
          action: guild.features.autoMod?.antiInvites?.action || 'delete'
        }
      };
      guild.markModified('features.autoMod');

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

      // Create color roles channel
      embed.setDescription(`${GLYPHS.LOADING} Setting up color roles...`);
      await setupMsg.edit({ embeds: [embed] });

      // Default color options
      const colorOptions = [
        { emoji: '❤️', name: 'Red', color: '#FF0000' },
        { emoji: '🧡', name: 'Orange', color: '#FF8000' },
        { emoji: '💛', name: 'Yellow', color: '#FFFF00' },
        { emoji: '💚', name: 'Green', color: '#00FF00' },
        { emoji: '💙', name: 'Blue', color: '#0080FF' },
        { emoji: '💜', name: 'Purple', color: '#8000FF' },
        { emoji: '🩷', name: 'Pink', color: '#FF80C0' },
        { emoji: '🤍', name: 'White', color: '#FFFFFF' },
        { emoji: '🖤', name: 'Black', color: '#000001' },
        { emoji: '🩵', name: 'Cyan', color: '#00FFFF' },
        { emoji: '🤎', name: 'Brown', color: '#8B4513' },
        { emoji: '💗', name: 'Hot Pink', color: '#FF69B4' }
      ];

      // Create color roles
      for (const colorData of colorOptions) {
        let colorRole = message.guild.roles.cache.find(r => r.name === `🎨 ${colorData.name}`);
        if (!colorRole) {
          try {
            colorRole = await message.guild.roles.create({
              name: `🎨 ${colorData.name}`,
              color: colorData.color,
              permissions: [],
              reason: 'RAPHAEL Setup - Color roles'
            });
            createdItems.push(`Role: ${colorRole}`);
          } catch (err) {
            console.error(`Failed to create color role ${colorData.name}:`, err);
          }
        }
      }

      // Create color roles channel
      let colorChannel = message.guild.channels.cache.find(c => c.name.includes('color-role') || c.name.includes('get-color'));
      if (!colorChannel) {
        colorChannel = await message.guild.channels.create({
          name: '🎨-color-roles',
          type: ChannelType.GuildText,
          topic: 'React to get a color role! You can only have one color at a time.',
          permissionOverwrites: [
            {
              id: message.guild.id,
              deny: [PermissionFlagsBits.SendMessages],
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory]
            },
            {
              id: message.client.user.id,
              allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.EmbedLinks]
            }
          ],
          reason: 'RAPHAEL Setup - Color roles selection'
        });
        createdItems.push(`Channel: ${colorChannel}`);
      }

      // Create color selection embed
      const colorEmbed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🎨 Color Roles')
        .setDescription(
          '**React to get a color role!**\n' +
          'You can only have one color at a time.\n\n' +
          colorOptions.map(c => `${c.emoji} → \`${c.name}\``).join('\n')
        )
        .setFooter({ text: 'Click a reaction to get/remove a color role' })
        .setTimestamp();

      const colorMessage = await colorChannel.send({ embeds: [colorEmbed] });

      // Add reactions to the message
      for (const colorData of colorOptions) {
        try {
          await colorMessage.react(colorData.emoji);
        } catch (err) {
          console.error(`Failed to add reaction ${colorData.emoji}:`, err);
        }
      }

      // Save color roles settings
      if (!guild.settings) guild.settings = {};
      guild.settings.colorRoles = {
        enabled: true,
        channelId: colorChannel.id,
        messageId: colorMessage.id,
        allowMultiple: false,
        rolePrefix: '🎨 '
      };
      guild.markModified('settings.colorRoles');

      // Save configuration
      await guild.save();

      // Send success message
      const successMsg = await successEmbed(message.guild.id, 'Setup Complete!',
        `${GLYPHS.SUCCESS} RAPHAEL has been successfully set up!\n\n` +
        `**Created Items:**\n${createdItems.map(i => `${GLYPHS.ARROW_RIGHT} ${i}`).join('\n')}\n\n` +
        `**Systems Enabled:**\n` +
        `${GLYPHS.ARROW_RIGHT} 🛡️ AutoMod & Security\n` +
        `${GLYPHS.ARROW_RIGHT} 📊 Leveling System (with 5 level roles)\n` +
        `${GLYPHS.ARROW_RIGHT} 🎫 Ticket System\n` +
        `${GLYPHS.ARROW_RIGHT} 🎨 Color Roles (12 colors)\n` +
        `${GLYPHS.ARROW_RIGHT} 📝 Full Logging\n\n` +
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
