import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import Verification from '../../models/Verification.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'verify',
  description: 'Setup or manage the verification system',
  usage: '<setup|panel|config|manual> [options]',
  aliases: ['verification'],
  category: 'moderation',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🔐 Verification System')
        .setDescription('Protect your server with user verification!')
        .addFields(
          { name: `${prefix}verify setup`, value: 'Interactive setup wizard', inline: true },
          { name: `${prefix}verify panel`, value: 'Send verification panel', inline: true },
          { name: `${prefix}verify config <option>`, value: 'Configure settings', inline: true },
          { name: `${prefix}verify manual @user`, value: 'Manually verify a user', inline: true },
          { name: `${prefix}verify status`, value: 'View current settings', inline: true }
        );

      return message.reply({ embeds: [embed] });
    }

    const guildConfig = await Guild.getGuild(guildId);

    switch (subCommand) {
      case 'setup': {
        // Interactive setup
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🔐 Verification Setup')
          .setDescription('Let\'s set up verification for your server!\n\nFirst, what type of verification would you like?')
          .addFields(
            { name: '🔘 Button', value: 'Users click a button to verify', inline: true },
            { name: '🎭 Captcha', value: 'Users solve a captcha code', inline: true },
            { name: '⚛️ Reaction', value: 'Users react to verify', inline: true }
          );

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('verify_setup_button')
              .setLabel('Button')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('verify_setup_captcha')
              .setLabel('Captcha')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('verify_setup_reaction')
              .setLabel('Reaction')
              .setStyle(ButtonStyle.Secondary)
          );

        const setupMsg = await message.reply({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === message.author.id && i.customId.startsWith('verify_setup_');
        const collector = setupMsg.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async interaction => {
          const type = interaction.customId.split('_')[2];

          // Save type
          if (!guildConfig.features.verificationSystem) {
            guildConfig.features.verificationSystem = {};
          }
          guildConfig.features.verificationSystem.type = type;
          guildConfig.features.verificationSystem.enabled = true;
          await guildConfig.save();

          // Ask for verified role
          const roleEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🔐 Verification Setup - Step 2')
            .setDescription(`Great! Verification type set to **${type}**.\n\nNow, mention the role that verified users should receive:\n\n*Example: @Verified or @Member*`);

          await interaction.update({ embeds: [roleEmbed], components: [] });

          // Wait for role mention
          const roleFilter = m => m.author.id === message.author.id && m.mentions.roles.size > 0;
          const roleCollector = message.channel.createMessageCollector({ filter: roleFilter, time: 60000, max: 1 });

          roleCollector.on('collect', async roleMsg => {
            const role = roleMsg.mentions.roles.first();
            guildConfig.features.verificationSystem.role = role.id;
            guildConfig.roles.verifiedRole = role.id;
            await guildConfig.save();

            // Ask for channel
            const channelEmbed = new EmbedBuilder()
              .setColor('#5865F2')
              .setTitle('🔐 Verification Setup - Step 3')
              .setDescription(`Verified role set to ${role}!\n\nNow, mention the channel where the verification panel should be:\n\n*Example: #verify or #welcome*`);

            await message.channel.send({ embeds: [channelEmbed] });

            const channelFilter = m => m.author.id === message.author.id && m.mentions.channels.size > 0;
            const channelCollector = message.channel.createMessageCollector({ filter: channelFilter, time: 60000, max: 1 });

            channelCollector.on('collect', async channelMsg => {
              const channel = channelMsg.mentions.channels.first();
              guildConfig.features.verificationSystem.channel = channel.id;
              await guildConfig.save();

              // Send panel
              await sendVerificationPanel(channel, guildConfig, client);

              const completeEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Verification Setup Complete!')
                .setDescription(`Your verification system is now active!\n\n**Type:** ${type}\n**Role:** ${role}\n**Channel:** ${channel}\n\nNew members will need to verify to access the server.`)
                .setFooter({ text: `Use ${prefix}verify panel to resend the panel` });

              await message.channel.send({ embeds: [completeEmbed] });
            });
          });
        });
        break;
      }

      case 'panel': {
        if (!guildConfig.features?.verificationSystem?.enabled) {
          return message.reply(`❌ Verification is not set up! Use \`${prefix}verify setup\` first.`);
        }

        const channel = message.mentions.channels.first() || message.channel;
        await sendVerificationPanel(channel, guildConfig, client);

        if (channel.id !== message.channel.id) {
          await message.reply(`✅ Verification panel sent to ${channel}!`);
        }
        break;
      }

      case 'manual': {
        const targetUser = message.mentions.members.first();
        if (!targetUser) {
          return message.reply(`❌ Please mention a user to verify!\n\nUsage: \`${prefix}verify manual @user\``);
        }

        const verifiedRole = guildConfig.features?.verificationSystem?.role || guildConfig.roles?.verifiedRole;
        if (!verifiedRole) {
          return message.reply(`❌ No verified role set! Use \`${prefix}verify setup\` first.`);
        }

        try {
          await targetUser.roles.add(verifiedRole);

          // Update verification record
          const verification = await Verification.getVerification(guildId, targetUser.id);
          await verification.verify(`staff:${message.author.id}`);

          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`✅ **${targetUser.user.username}** has been manually verified!`);

          await message.reply({ embeds: [embed] });
        } catch (error) {
          return message.reply(`❌ Failed to verify user: ${error.message}`);
        }
        break;
      }

      case 'config': {
        const setting = args[1]?.toLowerCase();
        const value = args.slice(2).join(' ');

        if (!setting) {
          const configEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🔐 Verification Config')
            .addFields(
              { name: 'type <button|captcha|reaction>', value: 'Set verification type' },
              { name: 'role <@role>', value: 'Set verified role' },
              { name: 'channel <#channel>', value: 'Set verification channel' },
              { name: 'enable/disable', value: 'Toggle verification' }
            );
          return message.reply({ embeds: [configEmbed] });
        }

        if (!guildConfig.features.verificationSystem) {
          guildConfig.features.verificationSystem = {};
        }

        switch (setting) {
          case 'type':
            if (!['button', 'captcha', 'reaction'].includes(value)) {
              return message.reply('❌ Type must be: button, captcha, or reaction');
            }
            guildConfig.features.verificationSystem.type = value;
            await guildConfig.save();
            return message.reply(`✅ Verification type set to **${value}**`);

          case 'role':
            const role = message.mentions.roles.first();
            if (!role) return message.reply('❌ Please mention a role!');
            guildConfig.features.verificationSystem.role = role.id;
            guildConfig.roles.verifiedRole = role.id;
            await guildConfig.save();
            return message.reply(`✅ Verified role set to ${role}`);

          case 'channel':
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply('❌ Please mention a channel!');
            guildConfig.features.verificationSystem.channel = channel.id;
            await guildConfig.save();
            return message.reply(`✅ Verification channel set to ${channel}`);

          case 'enable':
            guildConfig.features.verificationSystem.enabled = true;
            await guildConfig.save();
            return message.reply('✅ Verification system enabled!');

          case 'disable':
            guildConfig.features.verificationSystem.enabled = false;
            await guildConfig.save();
            return message.reply('⚠️ Verification system disabled!');
        }
        break;
      }

      case 'status': {
        const vs = guildConfig.features?.verificationSystem;
        const role = vs?.role ? message.guild.roles.cache.get(vs.role) : null;
        const channel = vs?.channel ? message.guild.channels.cache.get(vs.channel) : null;

        const embed = new EmbedBuilder()
          .setColor(vs?.enabled ? '#00FF00' : '#FF0000')
          .setTitle('🔐 Verification Status')
          .addFields(
            { name: 'Status', value: vs?.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Type', value: vs?.type || 'Not set', inline: true },
            { name: 'Role', value: role ? role.toString() : 'Not set', inline: true },
            { name: 'Channel', value: channel ? channel.toString() : 'Not set', inline: true }
          );

        await message.reply({ embeds: [embed] });
        break;
      }

      default:
        return message.reply(`❌ Unknown subcommand! Use \`${prefix}verify\` for help.`);
    }
  }
};

async function sendVerificationPanel(channel, guildConfig, client) {
  const type = guildConfig.features?.verificationSystem?.type || 'button';

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🔐 Server Verification')
    .setDescription('Welcome to the server! Please verify yourself to gain access.\n\n' +
      (type === 'button' ? '**Click the button below to verify!**' :
        type === 'captcha' ? '**Click the button below to receive a captcha code!**' :
          '**React with ✅ to verify!**'))
    .setFooter({ text: 'This helps us keep the server safe from bots!' });

  if (type === 'button' || type === 'captcha') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_${type}`)
          .setLabel(type === 'captcha' ? 'Get Captcha' : 'Verify')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
      );

    await channel.send({ embeds: [embed], components: [row] });
  } else {
    const msg = await channel.send({ embeds: [embed] });
    await msg.react('✅');
  }
}
