import { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import RateLimitQueue from '../../utils/RateLimitQueue.js';

export default {
  name: 'setup',
  description: 'Initial server setup wizard',
  usage: '',
  aliases: ['initialize'],
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 30,

  async execute(message) {
    const embed = await infoEmbed(message.guild.id, 'Setting Up RAPHAEL',
      `${GLYPHS.LOADING} Starting setup process...\n\n` +
      `This may take a minute as we create roles and channels safely.`
    );
    const setupMsg = await message.reply({ embeds: [embed] });

    // Create rate-limited queue for Discord API calls
    const queue = RateLimitQueue.forDiscord();

    try {
      const guild = await Guild.getGuild(message.guild.id, message.guild.name);
      const createdItems = [];
      const results = { roles: {}, channels: {}, categories: {} };

      // ==================== PHASE 1: CREATE LOGS CATEGORY ====================
      embed.setDescription(`${GLYPHS.LOADING} Creating logs category...`);
      await setupMsg.edit({ embeds: [embed] });

      let logsCategory = message.guild.channels.cache.find(
        c => c.name.toLowerCase() === 'logs' && c.type === ChannelType.GuildCategory
      );
      if (!logsCategory) {
        logsCategory = await queue.add(async () => {
          const cat = await message.guild.channels.create({
            name: '📋 Logs',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] }
            ]
          });
          createdItems.push(`Category: ${cat.name}`);
          return cat;
        }, 'category:logs');
      }
      results.categories.logs = logsCategory;
      await queue.onIdle();

      // ==================== PHASE 2: CREATE LOG CHANNELS ====================
      embed.setDescription(`${GLYPHS.LOADING} Creating log channels...`);
      await setupMsg.edit({ embeds: [embed] });

      const logChannelsToCreate = [
        { key: 'modLog', name: '🔨-mod-log', find: 'mod-log' },
        { key: 'alertLog', name: '🚨-alert-log', find: 'alert-log' },
        { key: 'joinLog', name: '📥-join-log', find: 'join-log' },
        { key: 'botStatus', name: '🤖-bot-status', find: 'bot-status' },
        { key: 'messageLog', name: '💬-message-log', find: 'message-log' },
        { key: 'voiceLog', name: '🔊-voice-log', find: 'voice-log' },
        { key: 'memberLog', name: '👤-member-log', find: 'member-log' },
        { key: 'serverLog', name: '⚙️-server-log', find: 'server-log' },
        { key: 'ticketLog', name: '📝-ticket-logs', find: 'ticket-log' }
      ];

      for (const chData of logChannelsToCreate) {
        queue.add(async () => {
          let channel = message.guild.channels.cache.find(c => c.name.includes(chData.find));
          if (!channel) {
            channel = await message.guild.channels.create({
              name: chData.name,
              type: ChannelType.GuildText,
              parent: results.categories.logs?.id,
              reason: 'RAPHAEL Setup - Log channel'
            });
            createdItems.push(`Channel: #${channel.name}`);
          }
          results.channels[chData.key] = channel;
        }, `channel:${chData.name}`);
      }

      await queue.onIdle();

      // ==================== PHASE 3: CREATE ROLES ====================
      embed.setDescription(`${GLYPHS.LOADING} Creating roles... (0%)`);
      await setupMsg.edit({ embeds: [embed] });

      // Define all roles to create
      const rolesToCreate = [
        { key: 'susRole', name: '🚨 Sus/Radar', color: '#ff9900', reason: 'Suspicious member tracking' },
        { key: 'newAccountRole', name: '🥚 New Account', color: '#ffff00', reason: 'New account tracking' },
        { key: 'mutedRole', name: '🔇 Muted', color: '#808080', reason: 'Mute functionality', permissions: [] }
      ];

      // Level roles
      const levelRoles = [
        { key: 'level5', name: '⭐ Level 5', color: '#43B581', level: 5 },
        { key: 'level10', name: '🌟 Level 10', color: '#FAA61A', level: 10 },
        { key: 'level20', name: '✨ Level 20', color: '#F47B67', level: 20 },
        { key: 'level30', name: '💫 Level 30', color: '#7289DA', level: 30 },
        { key: 'level50', name: '🏆 Level 50', color: '#FFD700', level: 50 }
      ];

      // Color roles
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

      // Get bot's highest role position for color roles
      const botMember = message.guild.members.cache.get(message.client.user.id);
      const botHighestRole = botMember.roles.highest;
      const targetPosition = Math.max(1, botHighestRole.position - 1);

      // Queue all role creations
      const totalRoles = rolesToCreate.length + levelRoles.length + colorOptions.length;
      let rolesCreated = 0;

      // System roles
      for (const roleData of rolesToCreate) {
        queue.add(async () => {
          let role = message.guild.roles.cache.find(r => r.name === roleData.name);
          if (!role) {
            role = await message.guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              permissions: roleData.permissions,
              reason: `RAPHAEL Setup - ${roleData.reason}`
            });
            createdItems.push(`Role: ${role.name}`);
          }
          results.roles[roleData.key] = role;
          rolesCreated++;
          
          // Update progress
          const progress = Math.round((rolesCreated / totalRoles) * 100);
          embed.setDescription(`${GLYPHS.LOADING} Creating roles... (${progress}%)\n\n${role.name} ✓`);
          await setupMsg.edit({ embeds: [embed] }).catch(() => {});
        }, `role:${roleData.name}`);
      }

      // Level roles
      for (const roleData of levelRoles) {
        queue.add(async () => {
          let role = message.guild.roles.cache.find(r => r.name === roleData.name);
          if (!role) {
            role = await message.guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              reason: `RAPHAEL Setup - Level ${roleData.level} reward`
            });
            createdItems.push(`Role: ${role.name}`);
          }
          results.roles[roleData.key] = role;
          rolesCreated++;
        }, `role:${roleData.name}`);
      }

      // Color roles (at higher position)
      const colorRolesMap = [];
      for (const colorData of colorOptions) {
        queue.add(async () => {
          const roleName = `🎨 ${colorData.name}`;
          let role = message.guild.roles.cache.find(r => r.name === roleName);
          if (!role) {
            role = await message.guild.roles.create({
              name: roleName,
              color: colorData.color,
              permissions: [],
              position: targetPosition,
              reason: 'RAPHAEL Setup - Color roles'
            });
            createdItems.push(`Role: ${role.name}`);
          } else {
            // Move existing role to higher position
            try {
              await role.setPosition(targetPosition);
            } catch (err) {
              // Position update failed, continue anyway
            }
          }
          colorRolesMap.push({ emoji: colorData.emoji, roleId: role.id, name: colorData.name });
          results.roles[`color_${colorData.name}`] = role;
          rolesCreated++;
        }, `role:color_${colorData.name}`);
      }

      // Wait for all roles to be created
      await queue.onIdle();

      // ==================== PHASE 4: SET MUTED PERMISSIONS ====================
      embed.setDescription(`${GLYPHS.LOADING} Setting up muted role permissions...`);
      await setupMsg.edit({ embeds: [embed] });

      const mutedRole = results.roles.mutedRole;
      if (mutedRole) {
        const textChannels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
        for (const [, channel] of textChannels) {
          queue.add(async () => {
            try {
              await channel.permissionOverwrites.create(mutedRole, {
                SendMessages: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendMessagesInThreads: false
              });
            } catch (err) {
              // Permission update failed, continue
            }
          }, `mute_perm:${channel.name}`);
        }
        await queue.onIdle();
      }

      // ==================== PHASE 5: CREATE TICKETS CATEGORY ====================
      embed.setDescription(`${GLYPHS.LOADING} Creating tickets category...`);
      await setupMsg.edit({ embeds: [embed] });

      // Tickets category
      let ticketsCategory = message.guild.channels.cache.find(
        c => c.name.toLowerCase().includes('ticket') && c.type === ChannelType.GuildCategory
      );
      if (!ticketsCategory) {
        ticketsCategory = await queue.add(async () => {
          const cat = await message.guild.channels.create({
            name: '🎫 Tickets',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] }
            ]
          });
          createdItems.push(`Category: ${cat.name}`);
          return cat;
        }, 'category:tickets');
      }
      results.categories.tickets = ticketsCategory;

      await queue.onIdle();

      // ==================== PHASE 6: CREATE COMMUNITY CHANNELS ====================
      embed.setDescription(`${GLYPHS.LOADING} Creating community channels...`);
      await setupMsg.edit({ embeds: [embed] });

      // Define community channels (log channels already created in Phase 2)
      const channelsToCreate = [
        // Community channels
        { key: 'birthday', name: '🎂-birthdays', parent: null, find: 'birthday' },
        { key: 'events', name: '📅-events', parent: null, find: 'events' },
        { key: 'levelUp', name: '🎉-level-ups', parent: null, find: 'level-up' },
        { key: 'welcome', name: '👋-welcome', parent: null, find: 'welcome' }
      ];

      for (const chData of channelsToCreate) {
        queue.add(async () => {
          let channel = message.guild.channels.cache.find(c => c.name.includes(chData.find));
          if (!channel) {
            const parentId = chData.parent ? results.categories[chData.parent]?.id : null;
            channel = await message.guild.channels.create({
              name: chData.name,
              type: ChannelType.GuildText,
              parent: parentId,
              reason: 'RAPHAEL Setup'
            });
            createdItems.push(`Channel: #${channel.name}`);
          }
          results.channels[chData.key] = channel;
        }, `channel:${chData.name}`);
      }

      // Special channels with custom permissions
      
      // Ticket panel channel
      queue.add(async () => {
        let channel = message.guild.channels.cache.find(c => c.name.includes('create-ticket') || c.name.includes('ticket-panel'));
        if (!channel) {
          channel = await message.guild.channels.create({
            name: '🎫-create-ticket',
            type: ChannelType.GuildText,
            permissionOverwrites: [
              { id: message.guild.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
              { id: message.client.user.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
            ],
            reason: 'RAPHAEL Setup - Ticket panel'
          });
          createdItems.push(`Channel: #${channel.name}`);
        }
        results.channels.ticketPanel = channel;
      }, 'channel:ticket-panel');

      // Color roles channel
      queue.add(async () => {
        let channel = message.guild.channels.cache.find(c => c.name.includes('color-role') || c.name.includes('get-color'));
        if (!channel) {
          channel = await message.guild.channels.create({
            name: '🎨-color-roles',
            type: ChannelType.GuildText,
            topic: 'React to get a color role! You can only have one color at a time.',
            permissionOverwrites: [
              { id: message.guild.id, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory] },
              { id: message.client.user.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.EmbedLinks] }
            ],
            reason: 'RAPHAEL Setup - Color roles'
          });
          createdItems.push(`Channel: #${channel.name}`);
        }
        results.channels.colorRoles = channel;
      }, 'channel:color-roles');

      await queue.onIdle();

      // ==================== PHASE 7: CREATE EMBEDS & REACTIONS ====================
      embed.setDescription(`${GLYPHS.LOADING} Setting up panels and reactions...`);
      await setupMsg.edit({ embeds: [embed] });

      // Ticket panel embed
      if (results.channels.ticketPanel) {
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

        await queue.add(async () => {
          await results.channels.ticketPanel.send({ embeds: [ticketEmbed], components: [ticketButton] });
        }, 'embed:ticket');
      }

      // Color roles embed with reactions
      if (results.channels.colorRoles) {
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

        const colorMessage = await queue.add(async () => {
          return await results.channels.colorRoles.send({ embeds: [colorEmbed] });
        }, 'embed:color');

        // Add reactions (queued to avoid rate limits)
        for (const colorData of colorOptions) {
          queue.add(async () => {
            await colorMessage.react(colorData.emoji);
          }, `react:${colorData.emoji}`);
        }

        results.colorMessage = colorMessage;
      }

      await queue.onIdle();

      // ==================== PHASE 8: SAVE CONFIGURATION ====================
      embed.setDescription(`${GLYPHS.LOADING} Saving configuration...`);
      await setupMsg.edit({ embeds: [embed] });

      // Assign role IDs
      guild.roles.susRole = results.roles.susRole?.id;
      guild.roles.newAccountRole = results.roles.newAccountRole?.id;
      guild.roles.mutedRole = results.roles.mutedRole?.id;

      guild.features.memberTracking.susRole = results.roles.susRole?.id;
      guild.features.memberTracking.alertChannel = results.channels.alertLog?.id;
      guild.features.accountAge.newAccountRole = results.roles.newAccountRole?.id;
      guild.features.accountAge.alertChannel = results.channels.alertLog?.id;

      // Assign channel IDs
      guild.channels.modLog = results.channels.modLog?.id;
      guild.channels.alertLog = results.channels.alertLog?.id;
      guild.channels.joinLog = results.channels.joinLog?.id;
      guild.channels.botStatus = results.channels.botStatus?.id;
      guild.channels.messageLog = results.channels.messageLog?.id;
      guild.channels.voiceLog = results.channels.voiceLog?.id;
      guild.channels.memberLog = results.channels.memberLog?.id;
      guild.channels.serverLog = results.channels.serverLog?.id;
      guild.channels.ticketLog = results.channels.ticketLog?.id;
      guild.channels.birthdayChannel = results.channels.birthday?.id;
      guild.channels.eventChannel = results.channels.events?.id;
      guild.channels.levelUpChannel = results.channels.levelUp?.id;
      guild.channels.welcomeChannel = results.channels.welcome?.id;
      guild.channels.ticketCategory = results.categories.tickets?.id;
      guild.channels.ticketPanelChannel = results.channels.ticketPanel?.id;

      // Birthday system
      guild.features.birthdaySystem.channel = results.channels.birthday?.id;

      // Event system
      guild.features.eventSystem.channel = results.channels.events?.id;

      // Level system
      guild.features.levelSystem.enabled = true;
      guild.features.levelSystem.levelUpChannel = results.channels.levelUp?.id;
      
      // Level rewards
      for (const roleData of levelRoles) {
        const role = results.roles[roleData.key];
        if (role) {
          const existing = guild.features.levelSystem.rewards.find(r => r.level === roleData.level);
          if (!existing) {
            guild.features.levelSystem.rewards.push({ level: roleData.level, roleId: role.id });
          }
        }
      }

      // Welcome system
      guild.features.welcomeSystem.channel = results.channels.welcome?.id;

      // Ticket system
      guild.features.ticketSystem.enabled = true;
      guild.features.ticketSystem.category = results.categories.tickets?.id;
      guild.features.ticketSystem.logChannel = results.channels.ticketLog?.id;

      // AutoMod settings
      guild.features.autoMod = {
        enabled: true,
        antiSpam: { enabled: true, messageLimit: 5, timeWindow: 5, action: 'warn' },
        antiRaid: { enabled: true, joinThreshold: 10, timeWindow: 30, action: 'lockdown' },
        antiNuke: { enabled: true, banThreshold: 5, kickThreshold: 5, roleDeleteThreshold: 3, channelDeleteThreshold: 3, timeWindow: 60, action: 'removeRoles', whitelistedUsers: [] },
        antiMassMention: { enabled: true, limit: 5, action: 'delete' },
        badWords: { enabled: true, useBuiltInList: true, words: [], ignoredWords: [], action: 'delete', timeoutDuration: 300, autoEscalate: true },
        antiRoleSpam: { enabled: true, cooldown: 60 },
        antiLinks: { enabled: false, whitelistedDomains: [], action: 'delete' },
        antiInvites: { enabled: true, action: 'delete' }
      };
      guild.markModified('features.autoMod');

      // Color roles settings
      if (!guild.settings) guild.settings = {};
      guild.settings.colorRoles = {
        enabled: true,
        channelId: results.channels.colorRoles?.id,
        messageId: results.colorMessage?.id,
        allowMultiple: false,
        rolePrefix: '🎨 ',
        roles: colorRolesMap
      };
      guild.markModified('settings.colorRoles');

      await guild.save();

      // ==================== PHASE 9: SUCCESS MESSAGE ====================
      const successMsg = await successEmbed(message.guild.id, 'Setup Complete!',
        `${GLYPHS.SUCCESS} RAPHAEL has been successfully set up!\n\n` +
        `**Created ${createdItems.length} items:**\n${createdItems.slice(0, 10).map(i => `${GLYPHS.ARROW_RIGHT} ${i}`).join('\n')}` +
        `${createdItems.length > 10 ? `\n... and ${createdItems.length - 10} more` : ''}\n\n` +
        `**Systems Enabled:**\n` +
        `${GLYPHS.ARROW_RIGHT} 🛡️ AutoMod & Security\n` +
        `${GLYPHS.ARROW_RIGHT} 📊 Leveling System (5 level roles)\n` +
        `${GLYPHS.ARROW_RIGHT} 🎫 Ticket System\n` +
        `${GLYPHS.ARROW_RIGHT} 🎨 Color Roles (12 colors)\n` +
        `${GLYPHS.ARROW_RIGHT} 📝 Full Logging\n\n` +
        `**Queue Stats:** ${queue.stats.completed} completed, ${queue.stats.failed} failed\n\n` +
        `Use \`${guild.prefix}help\` to see all available commands.`
      );

      await setupMsg.edit({ embeds: [successMsg] });

      // Send welcome to mod log
      if (results.channels.modLog) {
        const welcomeEmbed = await infoEmbed(message.guild.id,
          `${GLYPHS.SPARKLE} RAPHAEL Activated`,
          `Thank you for choosing RAPHAEL!\n\n` +
          `${GLYPHS.SHIELD} All moderation and security features are now active.\n` +
          `${GLYPHS.RADAR} Monitoring for suspicious activity has begun.\n` +
          `🛡️ AutoMod is active.\n\n` +
          `Use \`${guild.prefix}help\` to see all available commands.`
        );
        await results.channels.modLog.send({ embeds: [welcomeEmbed] });
      }

    } catch (error) {
      console.error('Setup error:', error);
      const { errorEmbed } = await import('../../utils/embeds.js');
      const errEmbed = await errorEmbed(message.guild.id, 'Setup Failed',
        `${GLYPHS.ERROR} An error occurred during setup.\n\n` +
        `**Error:** ${error.message}\n\n` +
        `Please ensure I have Administrator permissions and try again.`
      );
      await setupMsg.edit({ embeds: [errEmbed] });
    }
  }
};
