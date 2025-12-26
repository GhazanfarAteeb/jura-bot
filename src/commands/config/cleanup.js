import { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, warningEmbed, GLYPHS } from '../../utils/embeds.js';
import RateLimitQueue from '../../utils/RateLimitQueue.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'cleanup',
  description: 'Remove all roles and channels created by the bot during setup',
  usage: '',
  aliases: ['reset', 'unsetup', 'removesetup'],
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 30,

  async execute(message) {
    const guildId = message.guild.id;

    try {
      const guildConfig = await Guild.getGuild(guildId);

      // Find all bot-created items
      const itemsToDelete = {
        roles: [],
        channels: [],
        categories: []
      };

      // Bot-created role patterns
      const botRolePatterns = [
        '🚨 Sus/Radar',
        '🥚 New Account',
        '🔇 Muted',
        '⭐ Level 5',
        '🌟 Level 10',
        '✨ Level 20',
        '💫 Level 30',
        '🏆 Level 50'
      ];

      // Find roles by name pattern
      for (const roleName of botRolePatterns) {
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          itemsToDelete.roles.push({ id: role.id, name: role.name });
        }
      }

      // Find color roles (🎨 prefix)
      const colorRoles = message.guild.roles.cache.filter(r => r.name.startsWith('🎨 '));
      colorRoles.forEach(role => {
        itemsToDelete.roles.push({ id: role.id, name: role.name });
      });

      // Bot-created channel patterns
      const botChannelPatterns = [
        'mod-log', 'modlog', '📋-mod-log',
        'alerts', '🚨-alerts',
        'ticket-log', 'ticket-logs', '📝-ticket-logs',
        'create-ticket', 'ticket-panel', '🎫-create-ticket',
        'message-log', 'message-logs', '💬-message-log',
        'voice-log', 'voice-logs', '🔊-voice-log',
        'member-log', 'member-logs', '👤-member-log',
        'server-log', 'server-logs', '⚙️-server-log',
        'welcome', '👋-welcome',
        'level-up', '🎉-level-up',
        'color-roles', '🎨-color-roles'
      ];

      // Find channels by name pattern
      for (const channelName of botChannelPatterns) {
        const channel = message.guild.channels.cache.find(c => 
          c.name === channelName || c.name.toLowerCase().includes(channelName.toLowerCase())
        );
        if (channel && !itemsToDelete.channels.find(c => c.id === channel.id)) {
          itemsToDelete.channels.push({ id: channel.id, name: channel.name });
        }
      }

      // Find categories
      const botCategoryPatterns = ['📋 Logs', 'Logs', '🎫 Tickets', 'Tickets'];
      for (const catName of botCategoryPatterns) {
        const category = message.guild.channels.cache.find(c => 
          c.name === catName && c.type === 4 // GuildCategory
        );
        if (category && !itemsToDelete.categories.find(c => c.id === category.id)) {
          itemsToDelete.categories.push({ id: category.id, name: category.name });
        }
      }

      // Check if there's anything to delete
      const totalItems = itemsToDelete.roles.length + itemsToDelete.channels.length + itemsToDelete.categories.length;

      if (totalItems === 0) {
        const embed = await errorEmbed(guildId, 'Nothing to Clean',
          `${GLYPHS.ERROR} No bot-created roles or channels were found.\n\n` +
          `Either setup was never run or items were already deleted.`
        );
        return message.reply({ embeds: [embed] });
      }

      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('⚠️ Cleanup Confirmation')
        .setDescription(
          `**This action will permanently delete the following items:**\n\n` +
          `${itemsToDelete.roles.length > 0 ? `**Roles (${itemsToDelete.roles.length}):**\n${itemsToDelete.roles.map(r => `• ${r.name}`).join('\n')}\n\n` : ''}` +
          `${itemsToDelete.channels.length > 0 ? `**Channels (${itemsToDelete.channels.length}):**\n${itemsToDelete.channels.map(c => `• #${c.name}`).join('\n')}\n\n` : ''}` +
          `${itemsToDelete.categories.length > 0 ? `**Categories (${itemsToDelete.categories.length}):**\n${itemsToDelete.categories.map(c => `• 📁 ${c.name}`).join('\n')}\n\n` : ''}` +
          `**Total: ${totalItems} items**\n\n` +
          `⚠️ **This action cannot be undone!**\n` +
          `The bot configuration will also be reset.`
        )
        .setFooter({ text: 'You have 60 seconds to confirm' })
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('cleanup_confirm')
          .setLabel('Confirm Cleanup')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId('cleanup_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

      const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [buttons] });

      // Wait for button interaction
      try {
        const interaction = await confirmMsg.awaitMessageComponent({
          filter: i => i.user.id === message.author.id && ['cleanup_confirm', 'cleanup_cancel'].includes(i.customId),
          componentType: ComponentType.Button,
          time: 60000
        });

        if (interaction.customId === 'cleanup_cancel') {
          const cancelEmbed = await errorEmbed(guildId, 'Cleanup Cancelled',
            `${GLYPHS.ERROR} Cleanup operation has been cancelled.\n\nNo changes were made.`
          );
          await interaction.update({ embeds: [cancelEmbed], components: [] });
          return;
        }

        // User confirmed - proceed with cleanup
        await interaction.update({
          embeds: [new EmbedBuilder()
            .setColor('#5865F2')
            .setDescription(`${GLYPHS.LOADING} Cleaning up... Please wait.\nThis may take a moment due to rate limiting.`)
          ],
          components: []
        });

        const deletedItems = [];
        const failedItems = [];
        const queue = RateLimitQueue.forDiscord();

        // Queue channel deletions first (before categories)
        for (const channel of itemsToDelete.channels) {
          queue.add(async () => {
            const ch = message.guild.channels.cache.get(channel.id);
            if (ch) {
              await ch.delete('RAPHAEL Cleanup');
              deletedItems.push(`Channel: #${channel.name}`);
            }
          }, `Delete channel #${channel.name}`);
        }

        // Wait for channels to be deleted before categories
        await queue.onIdle();

        // Queue category deletions (including any remaining child channels)
        for (const category of itemsToDelete.categories) {
          queue.add(async () => {
            const cat = message.guild.channels.cache.get(category.id);
            if (cat) {
              // First delete any remaining child channels
              const childChannels = message.guild.channels.cache.filter(c => c.parentId === cat.id);
              for (const [, child] of childChannels) {
                try {
                  await child.delete('RAPHAEL Cleanup - Category deletion');
                  deletedItems.push(`Channel: #${child.name}`);
                  // Small delay for child channel deletions
                  await new Promise(r => setTimeout(r, 200));
                } catch (e) {
                  failedItems.push(`Channel: #${child.name}`);
                }
              }
              await cat.delete('RAPHAEL Cleanup');
              deletedItems.push(`Category: ${category.name}`);
            }
          }, `Delete category ${category.name}`);
        }

        // Wait for categories to be deleted
        await queue.onIdle();

        // Queue role deletions
        for (const role of itemsToDelete.roles) {
          queue.add(async () => {
            const r = message.guild.roles.cache.get(role.id);
            if (r) {
              await r.delete('RAPHAEL Cleanup');
              deletedItems.push(`Role: ${role.name}`);
            }
          }, `Delete role ${role.name}`);
        }

        // Wait for all deletions to complete
        await queue.onIdle();

        // Collect failed items from queue stats
        if (queue.stats.failed > 0) {
          failedItems.push(`${queue.stats.failed} operations failed during cleanup`);
        }

        // Reset guild configuration
        guildConfig.roles = {
          susRole: null,
          newAccountRole: null,
          mutedRole: null,
          staffRoles: [],
          modRoles: [],
          adminRoles: []
        };

        guildConfig.channels = {
          modLog: null,
          alertChannel: null,
          welcomeChannel: null,
          levelUpChannel: null,
          messageLog: null,
          voiceLog: null,
          memberLog: null,
          serverLog: null,
          ticketLog: null,
          ticketCategory: null,
          ticketPanelChannel: null
        };

        // Reset level rewards
        guildConfig.features.levelSystem.rewards = [];

        // Reset color roles settings
        if (guildConfig.settings?.colorRoles) {
          guildConfig.settings.colorRoles = {
            enabled: false,
            channelId: null,
            messageId: null,
            allowMultiple: false,
            rolePrefix: '🎨 ',
            roles: []
          };
          guildConfig.markModified('settings.colorRoles');
        }

        // Reset ticket settings
        guildConfig.features.ticketSystem = {
          enabled: false,
          category: null,
          logChannel: null,
          supportRoles: [],
          maxTickets: 3,
          naming: 'ticket-{number}',
          ticketCount: 0
        };

        await guildConfig.save();

        // Send success message
        const stats = queue.stats;
        const prefix = await getPrefix(guildId);
        const resultEmbed = new EmbedBuilder()
          .setColor(failedItems.length > 0 ? '#FEE75C' : '#57F287')
          .setTitle(failedItems.length > 0 ? '⚠️ Cleanup Completed with Errors' : '✅ Cleanup Complete!')
          .setDescription(
            `**Successfully deleted ${deletedItems.length} items:**\n` +
            `${deletedItems.slice(0, 15).map(i => `${GLYPHS.SUCCESS} ${i}`).join('\n')}` +
            `${deletedItems.length > 15 ? `\n... and ${deletedItems.length - 15} more` : ''}\n\n` +
            (failedItems.length > 0 ? 
              `**Failed operations:**\n` +
              `${failedItems.map(i => `${GLYPHS.ERROR} ${i}`).join('\n')}\n\n` : '') +
            `${GLYPHS.SUCCESS} Bot configuration has been reset.\n` +
            `Use \`${prefix}setup\` to set up the bot again.`
          )
          .setFooter({ text: `Queue stats: ${stats.completed} completed, ${stats.failed} failed` })
          .setTimestamp();

        await confirmMsg.edit({ embeds: [resultEmbed], components: [] });

      } catch (err) {
        // Timeout or error
        const timeoutEmbed = await errorEmbed(guildId, 'Cleanup Timed Out',
          `${GLYPHS.ERROR} No response received within 60 seconds.\n\nCleanup has been cancelled.`
        );
        await confirmMsg.edit({ embeds: [timeoutEmbed], components: [] });
      }

    } catch (error) {
      console.error('Cleanup error:', error);
      const errEmbed = await errorEmbed(guildId, 'Cleanup Failed',
        `${GLYPHS.ERROR} An error occurred during cleanup.\n\n**Error:** ${error.message}`
      );
      return message.reply({ embeds: [errEmbed] });
    }
  }
};
