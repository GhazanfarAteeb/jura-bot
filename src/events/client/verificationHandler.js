import { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import Guild from '../../models/Guild.js';
import Verification from '../../models/Verification.js';

export default {
  name: 'interactionCreate',

  async execute(interaction, client) {
    // Only handle verification buttons
    if (!interaction.isButton() || !interaction.customId.startsWith('verify_')) return;

    const guildId = interaction.guild.id;
    const odId = interaction.user.id;

    try {
      const guildConfig = await Guild.getGuild(guildId);
      const verification = await Verification.getVerification(guildId, odId);

      // Already verified?
      if (verification.verified) {
        return interaction.reply({
          content: '✅ You are already verified!',
          ephemeral: true
        });
      }

      const verifiedRole = guildConfig.features?.verificationSystem?.role || guildConfig.roles?.verifiedRole;
      if (!verifiedRole) {
        return interaction.reply({
          content: '❌ Verification is not properly configured. Please contact an admin.',
          ephemeral: true
        });
      }

      const type = interaction.customId.split('_')[1];

      if (type === 'button') {
        // Simple button verification
        await handleButtonVerification(interaction, verification, verifiedRole);
      } else if (type === 'captcha') {
        // Captcha verification - show modal
        await handleCaptchaVerification(interaction, verification, verifiedRole);
      } else if (type === 'submit') {
        // Captcha submission (from modal)
        // This is handled separately
      }

    } catch (error) {
      console.error('Verification error:', error);
      await interaction.reply({
        content: '❌ An error occurred during verification. Please try again.',
        ephemeral: true
      }).catch(() => { });
    }
  }
};

async function handleButtonVerification(interaction, verification, verifiedRole) {
  const member = interaction.member;

  try {
    await member.roles.add(verifiedRole);
    await verification.verify('button');

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Verified!')
      .setDescription('You have been verified and now have access to the server!')
      .setFooter({ text: 'Welcome to the community!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Button verification error:', error);
    throw error;
  }
}

async function handleCaptchaVerification(interaction, verification, verifiedRole) {
  // Generate captcha
  const captchaCode = Verification.generateCaptcha();

  // Save captcha to verification record
  verification.captcha = {
    code: captchaCode,
    attempts: 0,
    maxAttempts: 3,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  };
  verification.pendingVerification = true;
  await verification.save();

  // Create modal for captcha input
  const modal = new ModalBuilder()
    .setCustomId(`verify_captcha_modal_${interaction.user.id}`)
    .setTitle('Captcha Verification');

  const captchaInput = new TextInputBuilder()
    .setCustomId('captcha_code')
    .setLabel(`Enter this code: ${captchaCode}`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the code shown above')
    .setRequired(true)
    .setMinLength(6)
    .setMaxLength(6);

  const row = new ActionRowBuilder().addComponents(captchaInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

// Handle modal submission
export async function handleCaptchaModal(interaction, client) {
  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith('verify_captcha_modal_')) return;

  const guildId = interaction.guild.id;
  const odId = interaction.user.id;

  try {
    const guildConfig = await Guild.getGuild(guildId);
    const verification = await Verification.getVerification(guildId, odId);

    const input = interaction.fields.getTextInputValue('captcha_code');
    const result = verification.checkCaptcha(input);

    if (result.valid) {
      const verifiedRole = guildConfig.features?.verificationSystem?.role || guildConfig.roles?.verifiedRole;

      await interaction.member.roles.add(verifiedRole);
      await verification.verify('captcha');

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Verified!')
        .setDescription('Captcha correct! You have been verified and now have access to the server!')
        .setFooter({ text: 'Welcome to the community!' });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else {
      await verification.save(); // Save attempt count

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Incorrect Code')
        .setDescription(result.error)
        .setFooter({ text: 'Click the button to try again' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

  } catch (error) {
    console.error('Captcha verification error:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    }).catch(() => { });
  }
}
