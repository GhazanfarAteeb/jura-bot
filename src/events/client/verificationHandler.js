import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  AttachmentBuilder,
  MessageFlags
} from 'discord.js';
import Guild from '../../models/Guild.js';
import Verification from '../../models/Verification.js';
import { generateCaptchaImage, generateCaptchaCode } from '../../utils/captchaGenerator.js';

// Rate limiting for verification attempts
const verificationCooldowns = new Map();
const COOLDOWN_DURATION = 30000; // 30 seconds between attempts

// Helper function to log verification events
async function logVerification(member, verificationType, guildConfig) {
  try {
    // Use verificationLog if set, fall back to memberLog
    const logChannelId = guildConfig.channels.verificationLog || guildConfig.channels.memberLog;
    if (!logChannelId) return;

    const logChannel = member.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('✅ Member Verified')
      .setColor('#00FF7F')
      .setDescription(`**${member.user.username}** has successfully verified`)
      .addFields(
        { name: 'Member', value: `${member.user.tag}`, inline: true },
        { name: 'Verification Type', value: verificationType.charAt(0).toUpperCase() + verificationType.slice(1), inline: true },
        { name: 'Verified By', value: '⚙️ System (Self-Verification)', inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging verification:', error);
  }
}

// Helper function to log manual verification
async function logManualVerification(member, executor, guildConfig) {
  try {
    // Use verificationLog if set, fall back to memberLog
    const logChannelId = guildConfig.channels.verificationLog || guildConfig.channels.memberLog;
    if (!logChannelId) return;

    const logChannel = member.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let verifiedByText;
    if (executor.bot) {
      verifiedByText = `🤖 ${executor.username} (Bot)`;
    } else {
      verifiedByText = `👤 ${executor.username}`;
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Member Manually Verified')
      .setColor('#00CED1')
      .setDescription(`**${member.user.username}** was manually verified`)
      .addFields(
        { name: 'Member', value: `${member.user.tag}`, inline: true },
        { name: 'Verification Type', value: 'Manual', inline: true },
        { name: 'Verified By', value: verifiedByText, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging manual verification:', error);
  }
}

// Export the manual verification logger for use in verify command
export { logManualVerification };

export default {
  name: 'interactionCreate',

  async execute(interaction, client) {
    // Handle verification buttons
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('verify_')) {
        await handleVerifyButton(interaction, client);
      } else if (interaction.customId.startsWith('captcha_')) {
        await handleCaptchaButton(interaction, client);
      }
    }
  }
};

async function handleVerifyButton(interaction, client) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  try {
    const guildConfig = await Guild.getGuild(guildId);
    const verification = await Verification.getVerification(guildId, userId);

    // Already verified?
    if (verification.verified) {
      return interaction.reply({
        content: '✅ You are already verified!',
        flags: MessageFlags.Ephemeral
      });
    }

    const verifiedRole = guildConfig.features?.verificationSystem?.role || guildConfig.roles?.verifiedRole;
    if (!verifiedRole) {
      return interaction.reply({
        content: '❌ Verification is not properly configured. Please contact an admin.',
        flags: MessageFlags.Ephemeral
      });
    }

    const type = interaction.customId.split('_')[1];

    if (type === 'button') {
      await handleButtonVerification(interaction, verification, verifiedRole, guildConfig);
    } else if (type === 'captcha') {
      await handleCaptchaVerification(interaction, verification, verifiedRole, guildConfig);
    }

  } catch (error) {
    console.error('Verification error:', error);
    await interaction.reply({
      content: '❌ An error occurred during verification. Please try again.',
      flags: MessageFlags.Ephemeral
    }).catch(() => { });
  }
}

// Pre-verification security checks
async function runSecurityChecks(member, guildConfig) {
  const issues = [];
  const settings = guildConfig.features?.verificationSystem?.securityChecks || {};

  // Account age check
  if (settings.minAccountAge) {
    const accountAge = Date.now() - member.user.createdTimestamp;
    const minAge = settings.minAccountAge * 24 * 60 * 60 * 1000; // Convert days to ms
    if (accountAge < minAge) {
      const daysOld = Math.floor(accountAge / (24 * 60 * 60 * 1000));
      issues.push(`⚠️ Account too new (${daysOld} days old, minimum ${settings.minAccountAge} days required)`);
    }
  }

  // Avatar check - accounts without avatars are often bots/spam
  if (settings.requireAvatar && !member.user.avatar) {
    issues.push('⚠️ No profile avatar set');
  }

  // Check if user has Discord's spam flag (Unusual DM Activity)
  if (member.user.flags) {
    const flagBits = member.user.flags.bitfield;
    // Check for SPAMMER flag (bit 20 = 1048576)
    if (flagBits & (1 << 20)) {
      issues.push('🚨 Account flagged for unusual activity by Discord');
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

async function handleButtonVerification(interaction, verification, verifiedRole, guildConfig) {
  const member = interaction.member;

  // Run security checks
  const securityResult = await runSecurityChecks(member, guildConfig);
  if (!securityResult.passed) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF9900')
          .setTitle('⚠️ Verification Blocked')
          .setDescription('Your account did not pass security checks:\n\n' + securityResult.issues.join('\n'))
          .setFooter({ text: 'Please contact a moderator if you believe this is an error.' })
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  try {
    await member.roles.add(verifiedRole);

    // Remove unverified role if configured
    const unverifiedRole = guildConfig.features?.verificationSystem?.unverifiedRole;
    if (unverifiedRole && member.roles.cache.has(unverifiedRole)) {
      await member.roles.remove(unverifiedRole).catch(() => { });
    }

    await verification.verify('button');

    // Log the verification
    await logVerification(member, 'button', guildConfig);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Verified!')
      .setDescription('You have been verified and now have access to the server!')
      .setFooter({ text: 'Welcome to the community!' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

  } catch (error) {
    console.error('Button verification error:', error);
    throw error;
  }
}

async function handleCaptchaVerification(interaction, verification, verifiedRole, guildConfig) {
  const member = interaction.member;
  const userId = interaction.user.id;

  // Check cooldown
  const cooldownKey = `${interaction.guild.id}_${userId}`;
  const cooldownEnd = verificationCooldowns.get(cooldownKey);
  if (cooldownEnd && Date.now() < cooldownEnd) {
    const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
    return interaction.reply({
      content: `⏳ Please wait ${remaining} seconds before trying again.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Run security checks
  const securityResult = await runSecurityChecks(member, guildConfig);
  if (!securityResult.passed) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF9900')
          .setTitle('⚠️ Verification Blocked')
          .setDescription('Your account did not pass security checks:\n\n' + securityResult.issues.join('\n'))
          .setFooter({ text: 'Please contact a moderator if you believe this is an error.' })
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  // Check if user already has a pending verification thread
  if (verification.captcha?.threadId) {
    try {
      const existingThread = await interaction.guild.channels.fetch(verification.captcha.threadId);
      if (existingThread) {
        return interaction.reply({
          content: `📌 You already have a verification thread open: ${existingThread}`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (e) {
      // Thread doesn't exist anymore, continue
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Create a private thread for verification (fallback to public if private fails)
    let thread;
    try {
      thread = await interaction.channel.threads.create({
        name: `verify-${interaction.user.username}`,
        type: ChannelType.PrivateThread,
        autoArchiveDuration: 60, // Auto archive after 1 hour
        invitable: false, // Only mods can add people
        reason: `Verification thread for ${interaction.user.tag}`
      });
    } catch (privateThreadError) {
      console.log('Private thread creation failed, trying public thread:', privateThreadError.message);
      // Fallback to public thread if private threads aren't available (requires Server Boost Level 2)
      thread = await interaction.channel.threads.create({
        name: `verify-${interaction.user.username}-${Date.now().toString(36)}`,
        type: ChannelType.PublicThread,
        autoArchiveDuration: 60,
        reason: `Verification thread for ${interaction.user.tag}`
      });
    }

    // Add the user to the thread
    await thread.members.add(userId);

    // Generate captcha
    const captchaCode = generateCaptchaCode(6);
    const captchaBuffer = await generateCaptchaImage(captchaCode);

    // Save captcha data with thread ID
    verification.captcha = {
      code: captchaCode,
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      threadId: thread.id
    };
    verification.pendingVerification = true;
    await verification.save();

    // Create captcha image attachment
    const attachment = new AttachmentBuilder(captchaBuffer, { name: 'captcha.png' });

    // Create buttons for the captcha thread
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`captcha_refresh_${userId}`)
          .setLabel('🔄 New Code')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`captcha_cancel_${userId}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

    // Send captcha in thread
    const captchaEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🔐 Captcha Verification')
      .setDescription(
        `Hello ${interaction.user}!\n\n` +
        '**Type the code shown in the image below to verify yourself.**\n\n' +
        '• The code is case-insensitive\n' +
        '• You have 3 attempts and 5 minutes\n' +
        '• Click "New Code" if the image is hard to read'
      )
      .setImage('attachment://captcha.png')
      .setFooter({ text: `Attempts: 0/3 • Expires in 5 minutes` });

    await thread.send({
      content: `${interaction.user}`,
      embeds: [captchaEmbed],
      files: [attachment],
      components: [row]
    });

    // Set up message collector for captcha responses
    const filter = m => m.author.id === userId && !m.author.bot;
    const collector = thread.createMessageCollector({
      filter,
      time: 5 * 60 * 1000, // 5 minutes
      max: 10 // Max messages to collect
    });

    collector.on('collect', async (message) => {
      const input = message.content.trim().toUpperCase();

      // Refresh verification data
      const currentVerification = await Verification.getVerification(interaction.guild.id, userId);

      if (!currentVerification.captcha?.code) {
        collector.stop('expired');
        return;
      }

      const result = currentVerification.checkCaptcha(input);
      await currentVerification.save();

      if (result.valid) {
        // Success!
        collector.stop('success');

        try {
          await member.roles.add(verifiedRole);

          // Remove unverified role if configured
          const unverifiedRole = guildConfig.features?.verificationSystem?.unverifiedRole;
          if (unverifiedRole && member.roles.cache.has(unverifiedRole)) {
            await member.roles.remove(unverifiedRole).catch(() => { });
          }

          await currentVerification.verify('captcha');

          // Log the verification
          await logVerification(member, 'captcha', guildConfig);

          const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Verified Successfully!')
            .setDescription(
              'You have been verified and now have access to the server!\n\n' +
              'This thread will be deleted in 10 seconds.'
            );

          await thread.send({ embeds: [successEmbed] });

          // Delete thread after delay
          setTimeout(async () => {
            try {
              await thread.delete();
            } catch (e) {
              // Thread may already be deleted
            }
          }, 10000);

        } catch (error) {
          console.error('Error adding role:', error);
          await thread.send({ content: '❌ Error adding role. Please contact a moderator.' });
        }

      } else {
        // Failed attempt
        if (currentVerification.captcha.attempts >= currentVerification.captcha.maxAttempts) {
          collector.stop('max_attempts');
        } else {
          const failEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Incorrect Code')
            .setDescription(result.error);

          await thread.send({ embeds: [failEmbed] });
        }
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'success') return;

      // Set cooldown
      verificationCooldowns.set(cooldownKey, Date.now() + COOLDOWN_DURATION);

      let endMessage;
      if (reason === 'max_attempts') {
        endMessage = '❌ Too many failed attempts. Please wait 30 seconds and try again.';
      } else if (reason === 'time') {
        endMessage = '⏰ Verification timed out. Please try again.';
      } else if (reason === 'cancelled') {
        endMessage = '🚫 Verification cancelled.';
      } else {
        endMessage = '❌ Verification ended. Please try again.';
      }

      try {
        await thread.send({ content: endMessage });

        // Clear pending verification
        const currentVerification = await Verification.getVerification(interaction.guild.id, userId);
        currentVerification.pendingVerification = false;
        currentVerification.captcha = undefined;
        await currentVerification.save();

        // Delete thread after delay
        setTimeout(async () => {
          try {
            await thread.delete();
          } catch (e) { }
        }, 5000);
      } catch (e) { }
    });

    // Reply to original interaction
    await interaction.editReply({
      content: `✅ A private verification thread has been created for you: ${thread}\n\nPlease enter the captcha code there.`
    });

  } catch (error) {
    console.error('Captcha thread creation error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      channelType: interaction.channel?.type,
      guildId: interaction.guild?.id,
      permissions: interaction.guild?.members?.me?.permissionsIn(interaction.channel)?.toArray()
    });
    await interaction.editReply({
      content: `❌ Failed to create verification thread. Error: ${error.message}\n\nPlease ensure the bot has "Create Private Threads" and "Send Messages in Threads" permissions, or contact a moderator.`
    }).catch(() => { });
  }
}

// Handle captcha button interactions (refresh, cancel)
async function handleCaptchaButton(interaction, client) {
  const [, action, targetUserId] = interaction.customId.split('_');

  // Only allow the target user
  if (interaction.user.id !== targetUserId) {
    return interaction.reply({
      content: '❌ This verification is not for you.',
      flags: MessageFlags.Ephemeral
    });
  }

  const verification = await Verification.getVerification(interaction.guild.id, targetUserId);

  if (action === 'cancel') {
    verification.pendingVerification = false;
    verification.captcha = undefined;
    await verification.save();

    await interaction.reply({ content: '🚫 Verification cancelled.' });

    // Delete thread after short delay
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (e) { }
    }, 2000);

  } else if (action === 'refresh') {
    // Generate new captcha
    const newCode = generateCaptchaCode(6);
    const captchaBuffer = await generateCaptchaImage(newCode);

    verification.captcha = {
      ...verification.captcha,
      code: newCode,
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    };
    await verification.save();

    const attachment = new AttachmentBuilder(captchaBuffer, { name: 'captcha.png' });

    const refreshEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🔄 New Captcha Code')
      .setDescription('Here\'s a fresh code. Type it below to verify.')
      .setImage('attachment://captcha.png')
      .setFooter({ text: `Attempts reset • Expires in 5 minutes` });

    await interaction.reply({ embeds: [refreshEmbed], files: [attachment] });
  }
}

// Legacy modal handler (for backwards compatibility)
export async function handleCaptchaModal(interaction, client) {
  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith('verify_captcha_modal_')) return;

  // Redirect to thread-based verification
  return interaction.reply({
    content: '⚠️ Please use the verification button to start the new captcha verification process.',
    flags: MessageFlags.Ephemeral
  });
}
