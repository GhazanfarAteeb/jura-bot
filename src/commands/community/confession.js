import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } from 'discord.js';
import Command from '../../structures/Command.js';
import Confession from '../../models/Confession.js';
import Guild from '../../models/Guild.js';
import { hasModPerms } from '../../utils/helpers.js';

export default class ConfessionCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'confession',
      description: 'Configure the anonymous confession system',
      category: 'community',
      usage: '<setup/disable/settings/ban/unban/pending/approve/reject>',
      examples: [
        'confession setup #confessions',
        'confession disable',
        'confession settings cooldown 120',
        'confession settings replies on',
        'confession settings approval on',
        'confession ban @user',
        'confession unban @user',
        'confession pending',
        'confession approve 1',
        'confession reject 1'
      ],
      permissions: [PermissionFlagsBits.ManageGuild],
      botPermissions: ['SendMessages', 'EmbedLinks', 'ManageChannels'],
      cooldown: 3
    });
  }

  async run(message, args, prefix) {
    const guildConfig = await Guild.findOne({ guildId: message.guild.id });

    // Check for moderator permissions (admin, mod role, or ManageGuild)
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ You need Moderator/Staff permissions to use this command.')
        ]
      });
    }

    if (!args[0]) {
      return this.showHelp(message, prefix);
    }

    const subcommand = args[0].toLowerCase();

    switch (subcommand) {
      case 'setup':
        return this.setup(message, args);
      case 'disable':
        return this.disable(message);
      case 'settings':
        return this.settings(message, args);
      case 'ban':
        return this.banUser(message, args);
      case 'unban':
        return this.unbanUser(message, args);
      case 'pending':
        return this.showPending(message);
      case 'approve':
        return this.approveConfession(message, args);
      case 'reject':
        return this.rejectConfession(message, args);
      case 'send':
        return this.sendConfessionPanel(message, args);
      case 'stats':
        return this.showStats(message);
      default:
        return this.showHelp(message, prefix);
    }
  }

  async showHelp(message, prefix) {
    const embed = new EmbedBuilder()
      .setTitle('📝 Confession System')
      .setDescription('Allow members to submit anonymous confessions!')
      .setColor('#9b59b6')
      .addFields(
        {
          name: '🔧 Setup Commands',
          value: [
            `\`${prefix}confession setup #channel\` - Set confession channel`,
            `\`${prefix}confession disable\` - Disable confessions`,
            `\`${prefix}confession send [#channel]\` - Send confession panel`
          ].join('\n'),
          inline: false
        },
        {
          name: '⚙️ Settings',
          value: [
            `\`${prefix}confession settings\` - View current settings`,
            `\`${prefix}confession settings cooldown <seconds>\` - Set cooldown`,
            `\`${prefix}confession settings replies <on/off>\` - Toggle replies`,
            `\`${prefix}confession settings anonymous <on/off>\` - Anonymous replies`,
            `\`${prefix}confession settings approval <on/off>\` - Require approval`,
            `\`${prefix}confession settings minlength <chars>\` - Min length`,
            `\`${prefix}confession settings maxlength <chars>\` - Max length`
          ].join('\n'),
          inline: false
        },
        {
          name: '🔨 Moderation',
          value: [
            `\`${prefix}confession ban @user\` - Ban user from confessions`,
            `\`${prefix}confession unban @user\` - Unban user`,
            `\`${prefix}confession pending\` - View pending confessions`,
            `\`${prefix}confession approve <id>\` - Approve confession`,
            `\`${prefix}confession reject <id>\` - Reject confession`
          ].join('\n'),
          inline: false
        },
        {
          name: '📊 Info',
          value: `\`${prefix}confession stats\` - View confession statistics`,
          inline: false
        }
      )
      .setFooter({ text: 'Confessions are anonymous but logged for moderation purposes' });

    return message.reply({ embeds: [embed] });
  }

  async setup(message, args) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

    if (!channel) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Please mention a channel or provide a channel ID.')
        ]
      });
    }

    if (channel.type !== ChannelType.GuildText) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Please select a text channel.')
        ]
      });
    }

    // Check bot permissions in the channel
    const botPerms = channel.permissionsFor(message.guild.members.me);
    if (!botPerms.has(['SendMessages', 'EmbedLinks'])) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ I need `Send Messages` and `Embed Links` permissions in that channel.')
        ]
      });
    }

    const confessionData = await Confession.findOneAndUpdate(
      { guildId: message.guild.id },
      {
        guildId: message.guild.id,
        channelId: channel.id,
        enabled: true
      },
      { upsert: true, new: true }
    );

    // Send the confession panel to the channel
    const panelMessage = await this.sendPanel(channel);
    
    // Save the panel message ID
    confessionData.panelMessageId = panelMessage.id;
    await confessionData.save();

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ Confession system has been set up in ${channel}!\n\nA confession panel has been sent to the channel. Members can click the button to submit anonymous confessions.`)
      ]
    });
  }

  async sendPanel(channel) {
    const embed = new EmbedBuilder()
      .setTitle('📝 Anonymous Confessions')
      .setDescription('Click the button below to submit an anonymous confession!\n\n*Your identity will remain completely anonymous to other members.*')
      .setColor('#9b59b6')
      .setFooter({ text: 'Confessions are moderated • Be respectful' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confession_submit')
          .setLabel('Submit a confession!')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝')
      );

    return channel.send({ embeds: [embed], components: [row] });
  }

  async disable(message) {
    await Confession.findOneAndUpdate(
      { guildId: message.guild.id },
      { enabled: false, channelId: null }
    );

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription('✅ Confession system has been disabled.')
      ]
    });
  }

  async settings(message, args) {
    let confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData) {
      confessionData = new Confession({ guildId: message.guild.id });
      await confessionData.save();
    }

    if (!args[1]) {
      // Show current settings
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Confession Settings')
        .setColor('#9b59b6')
        .addFields(
          { name: 'Status', value: confessionData.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Channel', value: confessionData.channelId ? `<#${confessionData.channelId}>` : 'Not set', inline: true },
          { name: 'Total Confessions', value: `${confessionData.confessionCount}`, inline: true },
          { name: 'Cooldown', value: `${confessionData.settings.cooldown} seconds`, inline: true },
          { name: 'Allow Replies', value: confessionData.settings.allowReplies ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Anonymous Replies', value: confessionData.settings.anonymousReplies ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Require Approval', value: confessionData.settings.requireApproval ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Min Length', value: `${confessionData.settings.minLength} chars`, inline: true },
          { name: 'Max Length', value: `${confessionData.settings.maxLength} chars`, inline: true },
          { name: 'Banned Users', value: `${confessionData.settings.bannedUsers.length} users`, inline: true }
        );

      return message.reply({ embeds: [embed] });
    }

    const setting = args[1].toLowerCase();
    const value = args[2];

    switch (setting) {
      case 'cooldown':
        const cooldown = parseInt(value);
        if (isNaN(cooldown) || cooldown < 0 || cooldown > 3600) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription('❌ Cooldown must be between 0 and 3600 seconds.')
            ]
          });
        }
        confessionData.settings.cooldown = cooldown;
        await confessionData.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`✅ Confession cooldown set to **${cooldown} seconds**.`)
          ]
        });

      case 'replies':
        const allowReplies = value?.toLowerCase() === 'on' || value?.toLowerCase() === 'true';
        confessionData.settings.allowReplies = allowReplies;
        await confessionData.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`✅ Replies have been ${allowReplies ? 'enabled' : 'disabled'}.`)
          ]
        });

      case 'anonymous':
        const anonymousReplies = value?.toLowerCase() === 'on' || value?.toLowerCase() === 'true';
        confessionData.settings.anonymousReplies = anonymousReplies;
        await confessionData.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`✅ Anonymous replies have been ${anonymousReplies ? 'enabled' : 'disabled'}.`)
          ]
        });

      case 'approval':
        const requireApproval = value?.toLowerCase() === 'on' || value?.toLowerCase() === 'true';
        confessionData.settings.requireApproval = requireApproval;
        await confessionData.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`✅ Approval requirement has been ${requireApproval ? 'enabled' : 'disabled'}.`)
          ]
        });

      case 'minlength':
        const minLength = parseInt(value);
        if (isNaN(minLength) || minLength < 1 || minLength > 500) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription('❌ Minimum length must be between 1 and 500 characters.')
            ]
          });
        }
        confessionData.settings.minLength = minLength;
        await confessionData.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`✅ Minimum confession length set to **${minLength} characters**.`)
          ]
        });

      case 'maxlength':
        const maxLength = parseInt(value);
        if (isNaN(maxLength) || maxLength < 100 || maxLength > 4000) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#ff0000')
              .setDescription('❌ Maximum length must be between 100 and 4000 characters.')
            ]
          });
        }
        confessionData.settings.maxLength = maxLength;
        await confessionData.save();
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#00ff00')
            .setDescription(`✅ Maximum confession length set to **${maxLength} characters**.`)
          ]
        });

      default:
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('❌ Invalid setting. Use: `cooldown`, `replies`, `anonymous`, `approval`, `minlength`, `maxlength`')
          ]
        });
    }
  }

  async banUser(message, args) {
    const user = message.mentions.users.first() || await this.client.users.fetch(args[1]).catch(() => null);

    if (!user) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Please mention a user or provide a user ID.')
        ]
      });
    }

    const confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Confession system is not set up.')
        ]
      });
    }

    if (confessionData.settings.bannedUsers.includes(user.id)) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ This user is already banned from confessions.')
        ]
      });
    }

    confessionData.settings.bannedUsers.push(user.id);
    await confessionData.save();

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ **${user.tag}** has been banned from submitting confessions.`)
      ]
    });
  }

  async unbanUser(message, args) {
    const user = message.mentions.users.first() || await this.client.users.fetch(args[1]).catch(() => null);

    if (!user) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Please mention a user or provide a user ID.')
        ]
      });
    }

    const confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Confession system is not set up.')
        ]
      });
    }

    const index = confessionData.settings.bannedUsers.indexOf(user.id);
    if (index === -1) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ This user is not banned from confessions.')
        ]
      });
    }

    confessionData.settings.bannedUsers.splice(index, 1);
    await confessionData.save();

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ **${user.tag}** has been unbanned from confessions.`)
      ]
    });
  }

  async showPending(message) {
    const confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData || confessionData.pendingConfessions.length === 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#9b59b6')
          .setDescription('📝 No pending confessions to review.')
        ]
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📝 Pending Confessions')
      .setColor('#9b59b6')
      .setDescription(confessionData.pendingConfessions.slice(0, 10).map((c, i) =>
        `**${i + 1}.** ${c.content.substring(0, 100)}${c.content.length > 100 ? '...' : ''}\n*Submitted <t:${Math.floor(c.timestamp.getTime() / 1000)}:R>*`
      ).join('\n\n'))
      .setFooter({ text: `Showing ${Math.min(10, confessionData.pendingConfessions.length)} of ${confessionData.pendingConfessions.length} pending` });

    return message.reply({ embeds: [embed] });
  }

  async approveConfession(message, args) {
    const index = parseInt(args[1]) - 1;

    if (isNaN(index) || index < 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Please provide a valid confession number.')
        ]
      });
    }

    const confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData || !confessionData.pendingConfessions[index]) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Confession not found.')
        ]
      });
    }

    const pending = confessionData.pendingConfessions[index];
    const channel = message.guild.channels.cache.get(confessionData.channelId);

    if (!channel) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Confession channel not found.')
        ]
      });
    }

    // Post the confession
    confessionData.confessionCount++;
    const confessionNumber = confessionData.confessionCount;

    // Delete the old panel message
    if (confessionData.panelMessageId) {
      try {
        const oldPanel = await channel.messages.fetch(confessionData.panelMessageId).catch(() => null);
        if (oldPanel) await oldPanel.delete().catch(() => {});
      } catch (error) {
        // Ignore if message doesn't exist
      }
    }

    const confessionEmbed = new EmbedBuilder()
      .setAuthor({ name: `Anonymous Confession (#${confessionNumber})` })
      .setDescription(`"${pending.content}"`)
      .setColor('#9b59b6')
      .setTimestamp();

    // Only Reply button on the confession
    const confessionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confession_reply_${confessionNumber}`)
          .setLabel('Reply')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('💬')
      );

    const sentMessage = await channel.send({ embeds: [confessionEmbed], components: [confessionRow] });

    // Post a new panel at the bottom
    const panelEmbed = new EmbedBuilder()
      .setDescription('Click the button below to submit an anonymous confession!')
      .setColor('#9b59b6');

    const panelRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confession_submit')
        .setLabel('Submit a confession!')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝')
    );

    const panelMessage = await channel.send({ embeds: [panelEmbed], components: [panelRow] });
    confessionData.panelMessageId = panelMessage.id;

    // Save confession and remove from pending
    confessionData.confessions.push({
      number: confessionNumber,
      content: pending.content,
      messageId: sentMessage.id,
      userId: pending.userId,
      timestamp: new Date()
    });
    confessionData.pendingConfessions.splice(index, 1);
    await confessionData.save();

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ Confession #${confessionNumber} has been approved and posted.`)
      ]
    });
  }

  async rejectConfession(message, args) {
    const index = parseInt(args[1]) - 1;

    if (isNaN(index) || index < 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Please provide a valid confession number.')
        ]
      });
    }

    const confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData || !confessionData.pendingConfessions[index]) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Confession not found.')
        ]
      });
    }

    confessionData.pendingConfessions.splice(index, 1);
    await confessionData.save();

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription('✅ Confession has been rejected and removed.')
      ]
    });
  }

  async sendConfessionPanel(message, args) {
    const confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData || !confessionData.enabled) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Confession system is not set up. Use `confession setup #channel` first.')
        ]
      });
    }

    const channel = message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[1]) ||
      message.guild.channels.cache.get(confessionData.channelId);

    if (!channel) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Could not find the confession channel.')
        ]
      });
    }

    await this.sendPanel(channel);

    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ Confession panel sent to ${channel}.`)
      ]
    });
  }

  async showStats(message) {
    const confessionData = await Confession.findOne({ guildId: message.guild.id });

    if (!confessionData) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#9b59b6')
          .setDescription('📝 No confession data found.')
        ]
      });
    }

    const totalConfessions = confessionData.confessionCount;
    const totalReplies = confessionData.confessions.reduce((acc, c) => acc + (c.replies?.length || 0), 0);
    const pendingCount = confessionData.pendingConfessions.length;
    const bannedCount = confessionData.settings.bannedUsers.length;

    const embed = new EmbedBuilder()
      .setTitle('📊 Confession Statistics')
      .setColor('#9b59b6')
      .addFields(
        { name: 'Total Confessions', value: `${totalConfessions}`, inline: true },
        { name: 'Total Replies', value: `${totalReplies}`, inline: true },
        { name: 'Pending Approval', value: `${pendingCount}`, inline: true },
        { name: 'Banned Users', value: `${bannedCount}`, inline: true },
        { name: 'Status', value: confessionData.enabled ? '✅ Active' : '❌ Disabled', inline: true },
        { name: 'Channel', value: confessionData.channelId ? `<#${confessionData.channelId}>` : 'Not set', inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}
