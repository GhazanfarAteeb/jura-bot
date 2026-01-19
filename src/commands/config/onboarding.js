import { EmbedBuilder, PermissionFlagsBits, ChannelType, GuildOnboardingPromptType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'onboarding',
  description: 'Manage server onboarding settings, questions, and default channels',
  usage: '<view|enable|disable|channels|questions> [options]',
  aliases: ['onboard', 'serveronboarding'],
  category: 'config',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3,

  async execute(message, args, client) {
    const prefix = await getPrefix(message.guild.id);
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Check permissions
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Manage Server permissions to manage onboarding.`)]
      });
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      return this.showHelp(message, prefix, guildConfig);
    }

    try {
      switch (subcommand) {
        case 'view':
        case 'info':
        case 'status':
          return this.viewOnboarding(message, guildConfig);

        case 'enable':
          return this.toggleOnboarding(message, true, guildConfig);

        case 'disable':
          return this.toggleOnboarding(message, false, guildConfig);

        case 'channels':
        case 'channel':
          return this.manageChannels(message, args.slice(1), prefix, guildConfig);

        case 'questions':
        case 'question':
        case 'prompts':
        case 'prompt':
          return this.manageQuestions(message, args.slice(1), prefix, guildConfig);

        default:
          return this.showHelp(message, prefix, guildConfig);
      }
    } catch (error) {
      console.error('Onboarding command error:', error);

      // Handle specific Discord API errors
      if (error.code === 50001) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Missing Access',
            `${GLYPHS.ERROR} I don't have permission to manage onboarding.\n\nMake sure I have the **Manage Server** permission.`)]
        });
      }

      if (error.code === 30029) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Community Required',
            `${GLYPHS.ERROR} Onboarding requires a **Community Server**.\n\nEnable Community in Server Settings → Enable Community.`)]
        });
      }

      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Error',
          `${GLYPHS.ERROR} An error occurred: ${error.message}`)]
      });
    }
  },

  async showHelp(message, prefix, guildConfig) {
    let onboardingStatus = 'Unknown';
    try {
      const onboarding = await message.guild.fetchOnboarding();
      onboardingStatus = onboarding.enabled ? '✅ Enabled' : '❌ Disabled';
    } catch (e) {
      onboardingStatus = '⚠️ Not available (Community required)';
    }

    const embed = new EmbedBuilder()
      .setTitle('『 Onboarding Management 』')
      .setColor(guildConfig.embedStyle?.color || '#5865F2')
      .setDescription(
        `Manage your server's onboarding experience for new members.\n\n` +
        `**Current Status:** ${onboardingStatus}`
      )
      .addFields(
        {
          name: '📋 General Commands',
          value: [
            `\`${prefix}onboarding view\` - View current settings`,
            `\`${prefix}onboarding enable\` - Enable onboarding`,
            `\`${prefix}onboarding disable\` - Disable onboarding`
          ].join('\n'),
          inline: false
        },
        {
          name: '📺 Default Channels',
          value: [
            `\`${prefix}onboarding channels list\` - View default channels`,
            `\`${prefix}onboarding channels add #channel\` - Add default channel`,
            `\`${prefix}onboarding channels remove #channel\` - Remove channel`
          ].join('\n'),
          inline: false
        },
        {
          name: '❓ Questions (Prompts)',
          value: [
            `\`${prefix}onboarding questions list\` - View all questions`,
            `\`${prefix}onboarding questions add <title>\` - Create question`,
            `\`${prefix}onboarding questions edit <id> <setting> <value>\``,
            `\`${prefix}onboarding questions delete <id>\` - Delete question`,
            `\`${prefix}onboarding questions options <id>\` - Manage options`
          ].join('\n'),
          inline: false
        },
        {
          name: '🎯 Question Options',
          value: [
            `\`${prefix}onboarding questions options <id> add <title>\``,
            `\`${prefix}onboarding questions options <id> remove <optionId>\``,
            `\`${prefix}onboarding questions options <id> role <optionId> @role\``,
            `\`${prefix}onboarding questions options <id> channel <optionId> #channel\``
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Onboarding requires Community Server to be enabled' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async viewOnboarding(message, guildConfig) {
    const onboarding = await message.guild.fetchOnboarding();

    const embed = new EmbedBuilder()
      .setTitle('『 Onboarding Settings 』')
      .setColor(guildConfig.embedStyle?.color || '#5865F2')
      .setDescription(`Server onboarding configuration for **${message.guild.name}**`)
      .addFields(
        {
          name: '📊 Status',
          value: [
            `**Enabled:** ${onboarding.enabled ? '✅ Yes' : '❌ No'}`,
            `**Mode:** ${onboarding.mode === 0 ? 'Default' : 'Advanced'}`,
          ].join('\n'),
          inline: true
        },
        {
          name: '📺 Default Channels',
          value: onboarding.defaultChannelIds.length > 0
            ? onboarding.defaultChannelIds.map(id => `<#${id}>`).join('\n')
            : '*No default channels*',
          inline: true
        },
        {
          name: '❓ Questions',
          value: `${onboarding.prompts.size} question(s) configured`,
          inline: true
        }
      );

    // Add questions summary
    if (onboarding.prompts.size > 0) {
      const questionsList = onboarding.prompts.map((prompt, index) => {
        const flags = [];
        if (prompt.required) flags.push('Required');
        if (prompt.singleSelect) flags.push('Single');
        else flags.push('Multi');

        return `**${index + 1}.** ${prompt.title}\n` +
          `   └ ${prompt.options.size} options | ${flags.join(', ')} | ID: \`${prompt.id}\``;
      }).join('\n');

      embed.addFields({
        name: '📝 Questions List',
        value: questionsList.substring(0, 1024) || '*None*',
        inline: false
      });
    }

    embed.setTimestamp();
    return message.reply({ embeds: [embed] });
  },

  async toggleOnboarding(message, enable, guildConfig) {
    const onboarding = await message.guild.fetchOnboarding();

    if (onboarding.enabled === enable) {
      return message.reply({
        embeds: [await infoEmbed(message.guild.id, 'No Change',
          `${GLYPHS.INFO} Onboarding is already ${enable ? 'enabled' : 'disabled'}.`)]
      });
    }

    // To enable, we need at least some defaults
    if (enable) {
      if (onboarding.defaultChannelIds.length === 0) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Cannot Enable',
            `${GLYPHS.ERROR} You need at least **1 default channel** before enabling onboarding.\n\n` +
            `Use \`${await getPrefix(message.guild.id)}onboarding channels add #channel\` to add one.`)]
        });
      }
    }

    await message.guild.editOnboarding({
      enabled: enable,
      defaultChannelIds: onboarding.defaultChannelIds,
      prompts: onboarding.prompts.map(p => ({
        id: p.id,
        title: p.title,
        singleSelect: p.singleSelect,
        required: p.required,
        inOnboarding: p.inOnboarding,
        type: p.type,
        options: p.options.map(o => ({
          id: o.id,
          title: o.title,
          description: o.description,
          emoji: o.emoji,
          channelIds: o.channelIds,
          roleIds: o.roleIds
        }))
      }))
    });

    return message.reply({
      embeds: [await successEmbed(message.guild.id, `Onboarding ${enable ? 'Enabled' : 'Disabled'}`,
        `${GLYPHS.SUCCESS} Server onboarding has been ${enable ? 'enabled' : 'disabled'}!`)]
    });
  },

  async manageChannels(message, args, prefix, guildConfig) {
    const action = args[0]?.toLowerCase();
    const onboarding = await message.guild.fetchOnboarding();

    if (!action || action === 'list') {
      // List default channels
      const embed = new EmbedBuilder()
        .setTitle('『 Default Channels 』')
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .setDescription(
          onboarding.defaultChannelIds.length > 0
            ? onboarding.defaultChannelIds.map((id, i) => `**${i + 1}.** <#${id}>`).join('\n')
            : '*No default channels configured*'
        )
        .addFields({
          name: 'Commands',
          value: [
            `\`${prefix}onboarding channels add #channel\` - Add channel`,
            `\`${prefix}onboarding channels remove #channel\` - Remove channel`
          ].join('\n')
        })
        .setFooter({ text: `${onboarding.defaultChannelIds.length} default channel(s)` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

    if (action === 'add') {
      if (!channel) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Channel Required',
            `${GLYPHS.ERROR} Please mention a channel to add.\n\n**Usage:** \`${prefix}onboarding channels add #channel\``)]
        });
      }

      if (onboarding.defaultChannelIds.includes(channel.id)) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Already Added',
            `${GLYPHS.ERROR} ${channel} is already a default channel.`)]
        });
      }

      const newChannelIds = [...onboarding.defaultChannelIds, channel.id];

      await message.guild.editOnboarding({
        enabled: onboarding.enabled,
        defaultChannelIds: newChannelIds,
        prompts: onboarding.prompts.map(p => ({
          id: p.id,
          title: p.title,
          singleSelect: p.singleSelect,
          required: p.required,
          inOnboarding: p.inOnboarding,
          type: p.type,
          options: p.options.map(o => ({
            id: o.id,
            title: o.title,
            description: o.description,
            emoji: o.emoji,
            channelIds: o.channelIds,
            roleIds: o.roleIds
          }))
        }))
      });

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Channel Added',
          `${GLYPHS.SUCCESS} ${channel} has been added to default channels.`)]
      });
    }

    if (action === 'remove') {
      if (!channel) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Channel Required',
            `${GLYPHS.ERROR} Please mention a channel to remove.\n\n**Usage:** \`${prefix}onboarding channels remove #channel\``)]
        });
      }

      if (!onboarding.defaultChannelIds.includes(channel.id)) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} ${channel} is not a default channel.`)]
        });
      }

      const newChannelIds = onboarding.defaultChannelIds.filter(id => id !== channel.id);

      // Check if we can remove (need at least 1 if onboarding is enabled)
      if (onboarding.enabled && newChannelIds.length === 0) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Cannot Remove',
            `${GLYPHS.ERROR} You need at least 1 default channel while onboarding is enabled.\n\n` +
            `Disable onboarding first or add another channel.`)]
        });
      }

      await message.guild.editOnboarding({
        enabled: onboarding.enabled,
        defaultChannelIds: newChannelIds,
        prompts: onboarding.prompts.map(p => ({
          id: p.id,
          title: p.title,
          singleSelect: p.singleSelect,
          required: p.required,
          inOnboarding: p.inOnboarding,
          type: p.type,
          options: p.options.map(o => ({
            id: o.id,
            title: o.title,
            description: o.description,
            emoji: o.emoji,
            channelIds: o.channelIds,
            roleIds: o.roleIds
          }))
        }))
      });

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Channel Removed',
          `${GLYPHS.SUCCESS} ${channel} has been removed from default channels.`)]
      });
    }

    return this.showHelp(message, prefix, guildConfig);
  },

  async manageQuestions(message, args, prefix, guildConfig) {
    const action = args[0]?.toLowerCase();
    const onboarding = await message.guild.fetchOnboarding();

    if (!action || action === 'list') {
      // List all questions
      const embed = new EmbedBuilder()
        .setTitle('『 Onboarding Questions 』')
        .setColor(guildConfig.embedStyle?.color || '#5865F2');

      if (onboarding.prompts.size === 0) {
        embed.setDescription('*No questions configured*');
      } else {
        const questionsList = onboarding.prompts.map((prompt, index) => {
          const flags = [];
          if (prompt.required) flags.push('📌 Required');
          else flags.push('📎 Optional');
          if (prompt.singleSelect) flags.push('1️⃣ Single');
          else flags.push('🔢 Multi');

          let optionsList = prompt.options.map(o => {
            const roleCount = o.roleIds?.length || 0;
            const channelCount = o.channelIds?.length || 0;
            return `    • ${o.title}${roleCount > 0 ? ` (${roleCount} roles)` : ''}${channelCount > 0 ? ` (${channelCount} channels)` : ''}`;
          }).join('\n');

          return `**${index + 1}. ${prompt.title}**\n` +
            `   ${flags.join(' | ')}\n` +
            `   ID: \`${prompt.id}\`\n` +
            (optionsList ? `${optionsList}\n` : '   *No options*\n');
        }).join('\n');

        embed.setDescription(questionsList.substring(0, 4000));
      }

      embed.addFields({
        name: 'Commands',
        value: [
          `\`${prefix}onboarding questions add <title>\` - Create question`,
          `\`${prefix}onboarding questions edit <id> <setting> <value>\``,
          `\`${prefix}onboarding questions delete <id>\``,
          `\`${prefix}onboarding questions options <id>\` - Manage options`
        ].join('\n')
      });

      embed.setFooter({ text: `${onboarding.prompts.size} question(s)` });
      embed.setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'add' || action === 'create') {
      const title = args.slice(1).join(' ');

      if (!title) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Title Required',
            `${GLYPHS.ERROR} Please provide a question title.\n\n**Usage:** \`${prefix}onboarding questions add What do you want to do?\``)]
        });
      }

      if (title.length > 100) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Title Too Long',
            `${GLYPHS.ERROR} Question title must be 100 characters or less.`)]
        });
      }

      // Create new prompt
      const newPrompt = {
        title: title,
        singleSelect: false,
        required: false,
        inOnboarding: true,
        type: GuildOnboardingPromptType.MultipleChoice,
        options: []
      };

      const existingPrompts = onboarding.prompts.map(p => ({
        id: p.id,
        title: p.title,
        singleSelect: p.singleSelect,
        required: p.required,
        inOnboarding: p.inOnboarding,
        type: p.type,
        options: p.options.map(o => ({
          id: o.id,
          title: o.title,
          description: o.description,
          emoji: o.emoji,
          channelIds: o.channelIds,
          roleIds: o.roleIds
        }))
      }));

      await message.guild.editOnboarding({
        enabled: onboarding.enabled,
        defaultChannelIds: onboarding.defaultChannelIds,
        prompts: [...existingPrompts, newPrompt]
      });

      // Fetch updated onboarding to get the new prompt ID
      const updatedOnboarding = await message.guild.fetchOnboarding();
      const createdPrompt = updatedOnboarding.prompts.find(p => p.title === title);

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Question Created',
          `${GLYPHS.SUCCESS} Question created!\n\n` +
          `**Title:** ${title}\n` +
          `**ID:** \`${createdPrompt?.id || 'Unknown'}\`\n` +
          `**Single Select:** No\n` +
          `**Required:** No\n\n` +
          `Use \`${prefix}onboarding questions options ${createdPrompt?.id || '<id>'} add <answer>\` to add options.`)]
      });
    }

    if (action === 'edit') {
      const promptId = args[1];
      const setting = args[2]?.toLowerCase();
      const value = args.slice(3).join(' ');

      if (!promptId) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'ID Required',
            `${GLYPHS.ERROR} Please provide the question ID.\n\n**Usage:** \`${prefix}onboarding questions edit <id> <setting> <value>\`\n\n` +
            `**Settings:** title, required, singleselect`)]
        });
      }

      const prompt = onboarding.prompts.find(p => p.id === promptId);
      if (!prompt) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} Question with ID \`${promptId}\` not found.\n\nUse \`${prefix}onboarding questions list\` to see all question IDs.`)]
        });
      }

      if (!setting) {
        // Show current settings
        const embed = new EmbedBuilder()
          .setTitle(`『 Edit Question 』`)
          .setColor(guildConfig.embedStyle?.color || '#5865F2')
          .setDescription(`**${prompt.title}**`)
          .addFields(
            { name: 'ID', value: `\`${prompt.id}\``, inline: true },
            { name: 'Required', value: prompt.required ? 'Yes' : 'No', inline: true },
            { name: 'Single Select', value: prompt.singleSelect ? 'Yes' : 'No', inline: true },
            { name: 'Options', value: `${prompt.options.size}`, inline: true }
          )
          .addFields({
            name: 'Edit Commands',
            value: [
              `\`${prefix}onboarding questions edit ${promptId} title <new title>\``,
              `\`${prefix}onboarding questions edit ${promptId} required yes/no\``,
              `\`${prefix}onboarding questions edit ${promptId} singleselect yes/no\``
            ].join('\n')
          })
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      // Build updated prompts array
      const updatedPrompts = onboarding.prompts.map(p => {
        const promptData = {
          id: p.id,
          title: p.title,
          singleSelect: p.singleSelect,
          required: p.required,
          inOnboarding: p.inOnboarding,
          type: p.type,
          options: p.options.map(o => ({
            id: o.id,
            title: o.title,
            description: o.description,
            emoji: o.emoji,
            channelIds: o.channelIds,
            roleIds: o.roleIds
          }))
        };

        if (p.id === promptId) {
          if (setting === 'title') {
            if (!value) {
              throw new Error('Please provide a new title.');
            }
            promptData.title = value;
          } else if (setting === 'required') {
            promptData.required = ['yes', 'true', 'on', '1'].includes(value?.toLowerCase());
          } else if (setting === 'singleselect' || setting === 'single') {
            promptData.singleSelect = ['yes', 'true', 'on', '1'].includes(value?.toLowerCase());
          } else {
            throw new Error(`Unknown setting: ${setting}. Valid: title, required, singleselect`);
          }
        }

        return promptData;
      });

      await message.guild.editOnboarding({
        enabled: onboarding.enabled,
        defaultChannelIds: onboarding.defaultChannelIds,
        prompts: updatedPrompts
      });

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Question Updated',
          `${GLYPHS.SUCCESS} Question \`${promptId}\` has been updated!\n\n**${setting}** → ${value || 'changed'}`)]
      });
    }

    if (action === 'delete' || action === 'remove') {
      const promptId = args[1];

      if (!promptId) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'ID Required',
            `${GLYPHS.ERROR} Please provide the question ID to delete.\n\n**Usage:** \`${prefix}onboarding questions delete <id>\``)]
        });
      }

      const prompt = onboarding.prompts.find(p => p.id === promptId);
      if (!prompt) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} Question with ID \`${promptId}\` not found.`)]
        });
      }

      const updatedPrompts = onboarding.prompts
        .filter(p => p.id !== promptId)
        .map(p => ({
          id: p.id,
          title: p.title,
          singleSelect: p.singleSelect,
          required: p.required,
          inOnboarding: p.inOnboarding,
          type: p.type,
          options: p.options.map(o => ({
            id: o.id,
            title: o.title,
            description: o.description,
            emoji: o.emoji,
            channelIds: o.channelIds,
            roleIds: o.roleIds
          }))
        }));

      await message.guild.editOnboarding({
        enabled: onboarding.enabled,
        defaultChannelIds: onboarding.defaultChannelIds,
        prompts: updatedPrompts
      });

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Question Deleted',
          `${GLYPHS.SUCCESS} Question **"${prompt.title}"** has been deleted.`)]
      });
    }

    if (action === 'options' || action === 'option') {
      return this.manageOptions(message, args.slice(1), prefix, guildConfig, onboarding);
    }

    return this.showHelp(message, prefix, guildConfig);
  },

  async manageOptions(message, args, prefix, guildConfig, onboarding) {
    const promptId = args[0];
    const optionAction = args[1]?.toLowerCase();

    if (!promptId) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'ID Required',
          `${GLYPHS.ERROR} Please provide the question ID.\n\n**Usage:** \`${prefix}onboarding questions options <questionId> <action>\``)]
      });
    }

    const prompt = onboarding.prompts.find(p => p.id === promptId);
    if (!prompt) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Not Found',
          `${GLYPHS.ERROR} Question with ID \`${promptId}\` not found.`)]
      });
    }

    if (!optionAction || optionAction === 'list') {
      // List options for this question
      const embed = new EmbedBuilder()
        .setTitle(`『 Options: ${prompt.title} 』`)
        .setColor(guildConfig.embedStyle?.color || '#5865F2');

      if (prompt.options.size === 0) {
        embed.setDescription('*No options configured*');
      } else {
        const optionsList = prompt.options.map((opt, index) => {
          const roles = opt.roleIds?.length > 0
            ? `\n     Roles: ${opt.roleIds.map(id => `<@&${id}>`).join(', ')}`
            : '';
          const channels = opt.channelIds?.length > 0
            ? `\n     Channels: ${opt.channelIds.map(id => `<#${id}>`).join(', ')}`
            : '';
          const emoji = opt.emoji ? `${opt.emoji.name || opt.emoji} ` : '';

          return `**${index + 1}. ${emoji}${opt.title}**\n` +
            `   ID: \`${opt.id}\`` +
            (opt.description ? `\n   ${opt.description}` : '') +
            roles + channels;
        }).join('\n\n');

        embed.setDescription(optionsList.substring(0, 4000));
      }

      embed.addFields({
        name: 'Commands',
        value: [
          `\`${prefix}onboarding questions options ${promptId} add <title>\``,
          `\`${prefix}onboarding questions options ${promptId} remove <optionId>\``,
          `\`${prefix}onboarding questions options ${promptId} role <optionId> @role\``,
          `\`${prefix}onboarding questions options ${promptId} channel <optionId> #channel\``,
          `\`${prefix}onboarding questions options ${promptId} emoji <optionId> <emoji>\``,
          `\`${prefix}onboarding questions options ${promptId} desc <optionId> <description>\``
        ].join('\n')
      });

      embed.setFooter({ text: `Question ID: ${promptId} | ${prompt.options.size} option(s)` });
      embed.setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Helper to update onboarding with modified prompts
    const updateOnboarding = async (updatedPrompts) => {
      await message.guild.editOnboarding({
        enabled: onboarding.enabled,
        defaultChannelIds: onboarding.defaultChannelIds,
        prompts: updatedPrompts
      });
    };

    // Build prompts mapper
    const mapPrompts = (modifier) => {
      return onboarding.prompts.map(p => {
        const promptData = {
          id: p.id,
          title: p.title,
          singleSelect: p.singleSelect,
          required: p.required,
          inOnboarding: p.inOnboarding,
          type: p.type,
          options: p.options.map(o => ({
            id: o.id,
            title: o.title,
            description: o.description,
            emoji: o.emoji,
            channelIds: o.channelIds || [],
            roleIds: o.roleIds || []
          }))
        };

        if (p.id === promptId) {
          return modifier(promptData);
        }
        return promptData;
      });
    };

    if (optionAction === 'add' || optionAction === 'create') {
      const title = args.slice(2).join(' ');

      if (!title) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Title Required',
            `${GLYPHS.ERROR} Please provide an option title.\n\n**Usage:** \`${prefix}onboarding questions options ${promptId} add <title>\``)]
        });
      }

      const updatedPrompts = mapPrompts(promptData => {
        promptData.options.push({
          title: title,
          description: null,
          emoji: null,
          channelIds: [],
          roleIds: []
        });
        return promptData;
      });

      await updateOnboarding(updatedPrompts);

      // Fetch to get the new option ID
      const updated = await message.guild.fetchOnboarding();
      const updatedPrompt = updated.prompts.find(p => p.id === promptId);
      const newOption = updatedPrompt?.options.find(o => o.title === title);

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Option Added',
          `${GLYPHS.SUCCESS} Option added to **"${prompt.title}"**!\n\n` +
          `**Title:** ${title}\n` +
          `**ID:** \`${newOption?.id || 'Unknown'}\`\n\n` +
          `Use \`${prefix}onboarding questions options ${promptId} role ${newOption?.id || '<optionId>'} @role\` to assign a role.`)]
      });
    }

    if (optionAction === 'remove' || optionAction === 'delete') {
      const optionId = args[2];

      if (!optionId) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Option ID Required',
            `${GLYPHS.ERROR} Please provide the option ID to remove.\n\n**Usage:** \`${prefix}onboarding questions options ${promptId} remove <optionId>\``)]
        });
      }

      const option = prompt.options.find(o => o.id === optionId);
      if (!option) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} Option with ID \`${optionId}\` not found in this question.`)]
        });
      }

      const updatedPrompts = mapPrompts(promptData => {
        promptData.options = promptData.options.filter(o => o.id !== optionId);
        return promptData;
      });

      await updateOnboarding(updatedPrompts);

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Option Removed',
          `${GLYPHS.SUCCESS} Option **"${option.title}"** has been removed.`)]
      });
    }

    if (optionAction === 'role') {
      const optionId = args[2];
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[3]);
      const removeFlag = args[3]?.toLowerCase() === 'remove' || args[4]?.toLowerCase() === 'remove';

      if (!optionId) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Option ID Required',
            `${GLYPHS.ERROR} Please provide the option ID.\n\n**Usage:** \`${prefix}onboarding questions options ${promptId} role <optionId> @role\``)]
        });
      }

      const option = prompt.options.find(o => o.id === optionId);
      if (!option) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} Option with ID \`${optionId}\` not found.`)]
        });
      }

      if (!role && !removeFlag) {
        // Show current roles
        const currentRoles = option.roleIds?.length > 0
          ? option.roleIds.map(id => `<@&${id}>`).join(', ')
          : '*None*';

        return message.reply({
          embeds: [await infoEmbed(message.guild.id, `Roles for "${option.title}"`,
            `**Current Roles:** ${currentRoles}\n\n` +
            `**Add role:** \`${prefix}onboarding questions options ${promptId} role ${optionId} @role\`\n` +
            `**Remove role:** \`${prefix}onboarding questions options ${promptId} role ${optionId} @role remove\``)]
        });
      }

      const updatedPrompts = mapPrompts(promptData => {
        const opt = promptData.options.find(o => o.id === optionId);
        if (opt) {
          if (!opt.roleIds) opt.roleIds = [];

          if (removeFlag && role) {
            opt.roleIds = opt.roleIds.filter(id => id !== role.id);
          } else if (role) {
            if (!opt.roleIds.includes(role.id)) {
              opt.roleIds.push(role.id);
            }
          }
        }
        return promptData;
      });

      await updateOnboarding(updatedPrompts);

      return message.reply({
        embeds: [await successEmbed(message.guild.id, removeFlag ? 'Role Removed' : 'Role Added',
          `${GLYPHS.SUCCESS} ${removeFlag ? 'Removed' : 'Added'} ${role} ${removeFlag ? 'from' : 'to'} option **"${option.title}"**.`)]
      });
    }

    if (optionAction === 'channel') {
      const optionId = args[2];
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[3]);
      const removeFlag = args[3]?.toLowerCase() === 'remove' || args[4]?.toLowerCase() === 'remove';

      if (!optionId) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Option ID Required',
            `${GLYPHS.ERROR} Please provide the option ID.\n\n**Usage:** \`${prefix}onboarding questions options ${promptId} channel <optionId> #channel\``)]
        });
      }

      const option = prompt.options.find(o => o.id === optionId);
      if (!option) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} Option with ID \`${optionId}\` not found.`)]
        });
      }

      if (!channel && !removeFlag) {
        const currentChannels = option.channelIds?.length > 0
          ? option.channelIds.map(id => `<#${id}>`).join(', ')
          : '*None*';

        return message.reply({
          embeds: [await infoEmbed(message.guild.id, `Channels for "${option.title}"`,
            `**Current Channels:** ${currentChannels}\n\n` +
            `**Add channel:** \`${prefix}onboarding questions options ${promptId} channel ${optionId} #channel\`\n` +
            `**Remove channel:** \`${prefix}onboarding questions options ${promptId} channel ${optionId} #channel remove\``)]
        });
      }

      const updatedPrompts = mapPrompts(promptData => {
        const opt = promptData.options.find(o => o.id === optionId);
        if (opt) {
          if (!opt.channelIds) opt.channelIds = [];

          if (removeFlag && channel) {
            opt.channelIds = opt.channelIds.filter(id => id !== channel.id);
          } else if (channel) {
            if (!opt.channelIds.includes(channel.id)) {
              opt.channelIds.push(channel.id);
            }
          }
        }
        return promptData;
      });

      await updateOnboarding(updatedPrompts);

      return message.reply({
        embeds: [await successEmbed(message.guild.id, removeFlag ? 'Channel Removed' : 'Channel Added',
          `${GLYPHS.SUCCESS} ${removeFlag ? 'Removed' : 'Added'} ${channel} ${removeFlag ? 'from' : 'to'} option **"${option.title}"**.`)]
      });
    }

    if (optionAction === 'emoji') {
      const optionId = args[2];
      const emoji = args[3];

      if (!optionId || !emoji) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Usage',
            `${GLYPHS.ERROR} **Usage:** \`${prefix}onboarding questions options ${promptId} emoji <optionId> <emoji>\`\n\n` +
            `Use \`none\` to remove the emoji.`)]
        });
      }

      const option = prompt.options.find(o => o.id === optionId);
      if (!option) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} Option with ID \`${optionId}\` not found.`)]
        });
      }

      const updatedPrompts = mapPrompts(promptData => {
        const opt = promptData.options.find(o => o.id === optionId);
        if (opt) {
          if (emoji.toLowerCase() === 'none' || emoji.toLowerCase() === 'remove') {
            opt.emoji = null;
          } else {
            // Check if it's a custom emoji
            const customEmojiMatch = emoji.match(/<a?:(\w+):(\d+)>/);
            if (customEmojiMatch) {
              opt.emoji = { id: customEmojiMatch[2], name: customEmojiMatch[1] };
            } else {
              opt.emoji = { id: null, name: emoji };
            }
          }
        }
        return promptData;
      });

      await updateOnboarding(updatedPrompts);

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Emoji Updated',
          `${GLYPHS.SUCCESS} Emoji for **"${option.title}"** has been ${emoji.toLowerCase() === 'none' ? 'removed' : `set to ${emoji}`}.`)]
      });
    }

    if (optionAction === 'desc' || optionAction === 'description') {
      const optionId = args[2];
      const description = args.slice(3).join(' ');

      if (!optionId) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Usage',
            `${GLYPHS.ERROR} **Usage:** \`${prefix}onboarding questions options ${promptId} desc <optionId> <description>\`\n\n` +
            `Use \`none\` to remove the description.`)]
        });
      }

      const option = prompt.options.find(o => o.id === optionId);
      if (!option) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} Option with ID \`${optionId}\` not found.`)]
        });
      }

      const updatedPrompts = mapPrompts(promptData => {
        const opt = promptData.options.find(o => o.id === optionId);
        if (opt) {
          if (!description || description.toLowerCase() === 'none') {
            opt.description = null;
          } else {
            opt.description = description.substring(0, 100);
          }
        }
        return promptData;
      });

      await updateOnboarding(updatedPrompts);

      return message.reply({
        embeds: [await successEmbed(message.guild.id, 'Description Updated',
          `${GLYPHS.SUCCESS} Description for **"${option.title}"** has been ${!description || description.toLowerCase() === 'none' ? 'removed' : 'updated'}.`)]
      });
    }

    // Unknown option action
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Unknown Action',
        `${GLYPHS.ERROR} Unknown action: \`${optionAction}\`\n\n` +
        `**Valid actions:** list, add, remove, role, channel, emoji, desc`)]
    });
  }
};
