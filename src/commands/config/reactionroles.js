import { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'reactionroles',
  description: 'Manage reaction role panels',
  usage: 'reactionroles <list|add|remove|clear>',
  aliases: ['rr', 'rroles'],
  permissions: {
    user: PermissionFlagsBits.ManageRoles,
    client: PermissionFlagsBits.ManageRoles
  },
  cooldown: 5,

  async execute(message, args) {
    const guildId = message.guild.id;
    const subCommand = args[0]?.toLowerCase();
    const prefix = await getPrefix(guildId);

    try {
      const guildConfig = await Guild.getGuild(guildId);

      if (!subCommand || subCommand === 'list') {
        // List all reaction role panels
        const panels = guildConfig.settings?.reactionRoles?.messages || [];

        if (panels.length === 0) {
          const embed = await infoEmbed(guildId, '📋 Reaction Roles',
            `${GLYPHS.INFO} No reaction role panels set up.\n\n` +
            `Use \`${prefix}colorroles\` to set up a color roles panel, or\n` +
            `Use \`${prefix}reactionroles add\` to create a custom panel.`
          );
          return message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📋 Reaction Role Panels')
          .setDescription(
            `**Total Panels:** ${panels.length}\n\n` +
            panels.map((panel, i) => {
              const channel = message.guild.channels.cache.get(panel.channelId);
              return `**${i + 1}.** ${channel ? `<#${channel.id}>` : 'Unknown Channel'}\n` +
                `${GLYPHS.DOT} Message ID: \`${panel.messageId}\`\n` +
                `${GLYPHS.DOT} Roles: ${panel.roles.length}`;
            }).join('\n\n')
          )
          .setFooter({ text: `Use ${prefix}reactionroles remove <number> to remove a panel` })
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      if (subCommand === 'remove' || subCommand === 'delete') {
        const panelIndex = parseInt(args[1]) - 1;
        const panels = guildConfig.settings?.reactionRoles?.messages || [];

        if (isNaN(panelIndex) || panelIndex < 0 || panelIndex >= panels.length) {
          const embed = await errorEmbed(guildId, 'Invalid Panel',
            `${GLYPHS.ERROR} Please provide a valid panel number.\n\n` +
            `Use \`${prefix}reactionroles list\` to see all panels.`
          );
          return message.reply({ embeds: [embed] });
        }

        const panel = panels[panelIndex];

        // Try to delete the message
        try {
          const channel = message.guild.channels.cache.get(panel.channelId);
          if (channel) {
            const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
            if (msg) {
              await msg.delete().catch(() => { });
            }
          }
        } catch (err) {
          // Message might be already deleted
        }

        // Remove from database
        const updatedMessages = [...guildConfig.settings.reactionRoles.messages];
        updatedMessages.splice(panelIndex, 1);
        await Guild.updateGuild(guildId, { $set: { 'settings.reactionRoles.messages': updatedMessages } });

        const embed = await successEmbed(guildId, 'Panel Removed',
          `${GLYPHS.SUCCESS} Reaction role panel #${panelIndex + 1} has been removed.`
        );
        return message.reply({ embeds: [embed] });
      }

      if (subCommand === 'clear') {
        const panels = guildConfig.settings?.reactionRoles?.messages || [];

        if (panels.length === 0) {
          const embed = await infoEmbed(guildId, 'No Panels',
            `${GLYPHS.INFO} There are no reaction role panels to clear.`
          );
          return message.reply({ embeds: [embed] });
        }

        // Confirmation
        const confirmEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⚠️ Confirm Clear')
          .setDescription(
            `Are you sure you want to remove **all ${panels.length}** reaction role panels?\n\n` +
            `This will also delete the panel messages.`
          );

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('confirm_clear')
              .setLabel('Yes, Clear All')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('cancel_clear')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

        const collector = confirmMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter: (i) => i.user.id === message.author.id,
          time: 30000,
          max: 1
        });

        collector.on('collect', async (interaction) => {
          if (interaction.customId === 'confirm_clear') {
            // Delete all panel messages
            for (const panel of panels) {
              try {
                const channel = message.guild.channels.cache.get(panel.channelId);
                if (channel) {
                  const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
                  if (msg) {
                    await msg.delete().catch(() => { });
                  }
                }
              } catch (err) {
                // Ignore
              }
            }

            // Clear from database
            await Guild.updateGuild(guildId, {
              $set: {
                'settings.reactionRoles.messages': [],
                'settings.reactionRoles.enabled': false
              }
            });

            const embed = await successEmbed(guildId, 'All Panels Cleared',
              `${GLYPHS.SUCCESS} All ${panels.length} reaction role panels have been removed.`
            );
            await interaction.update({ embeds: [embed], components: [] });
          } else {
            await interaction.update({
              content: 'Cancelled.',
              embeds: [],
              components: []
            });
          }
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            confirmMsg.edit({ content: 'Timed out.', embeds: [], components: [] }).catch(() => { });
          }
        });

        return;
      }

      if (subCommand === 'add') {
        // Custom reaction role setup (simplified)
        const embed = await infoEmbed(guildId, '➕ Add Reaction Role',
          `**Quick Setup Commands:**\n\n` +
          `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles [#channel]\` - Color roles panel\n\n` +
          `**Custom Setup (Coming Soon):**\n` +
          `A full custom reaction role builder will be added soon!`
        );
        return message.reply({ embeds: [embed] });
      }

      // Unknown subcommand
      const embed = await infoEmbed(guildId, '📋 Reaction Roles Help',
        `**Available Commands:**\n\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}reactionroles list\` - List all panels\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}reactionroles remove <#>\` - Remove a panel\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}reactionroles clear\` - Remove all panels\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles [#channel]\` - Create color roles panel`
      );
      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Reaction roles error:', error);
      const embed = await errorEmbed(guildId, 'Error',
        `${GLYPHS.ERROR} An error occurred. Please try again.`
      );
      return message.reply({ embeds: [embed] });
    }
  }
};
