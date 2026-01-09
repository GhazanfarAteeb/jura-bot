import {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import Confession from '../../models/Confession.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle confession button clicks
    if (interaction.isButton()) {
      if (interaction.customId === 'confession_submit') {
        return handleConfessionSubmit(interaction);
      }
      if (interaction.customId.startsWith('confession_reply_')) {
        return handleConfessionReply(interaction);
      }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'confession_modal') {
        return handleConfessionModalSubmit(interaction, client);
      }
      if (interaction.customId.startsWith('confession_reply_modal_')) {
        return handleConfessionReplyModalSubmit(interaction, client);
      }
    }
  }
};

async function handleConfessionSubmit(interaction) {
  const confessionData = await Confession.findOne({ guildId: interaction.guild.id });

  if (!confessionData || !confessionData.enabled) {
    return interaction.reply({
      content: '❌ The confession system is not enabled in this server.',
      ephemeral: true
    });
  }

  // Check if user is banned
  if (confessionData.settings.bannedUsers.includes(interaction.user.id)) {
    return interaction.reply({
      content: '❌ You have been banned from submitting confessions.',
      ephemeral: true
    });
  }

  // Check cooldown
  const lastConfession = confessionData.userCooldowns?.get(interaction.user.id);
  if (lastConfession) {
    const cooldownEnd = new Date(lastConfession).getTime() + (confessionData.settings.cooldown * 1000);
    if (Date.now() < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
      return interaction.reply({
        content: `⏳ Please wait **${remaining} seconds** before submitting another confession.`,
        ephemeral: true
      });
    }
  }

  // Show the confession modal
  const modal = new ModalBuilder()
    .setCustomId('confession_modal')
    .setTitle('Submit Anonymous Confession');

  const confessionInput = new TextInputBuilder()
    .setCustomId('confession_content')
    .setLabel('Your Confession')
    .setPlaceholder('Write your anonymous confession here...')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(confessionData.settings.minLength)
    .setMaxLength(confessionData.settings.maxLength)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(confessionInput);
  modal.addComponents(actionRow);

  return interaction.showModal(modal);
}

async function handleConfessionReply(interaction) {
  const confessionData = await Confession.findOne({ guildId: interaction.guild.id });

  if (!confessionData || !confessionData.settings.allowReplies) {
    return interaction.reply({
      content: '❌ Replies are not enabled for this server.',
      ephemeral: true
    });
  }

  const confessionNumber = interaction.customId.replace('confession_reply_', '');

  // Show the reply modal
  const modal = new ModalBuilder()
    .setCustomId(`confession_reply_modal_${confessionNumber}`)
    .setTitle(`Reply to Confession #${confessionNumber}`);

  const replyInput = new TextInputBuilder()
    .setCustomId('reply_content')
    .setLabel('Your Reply')
    .setPlaceholder('Write your reply here...')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(5)
    .setMaxLength(1000)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(replyInput);
  modal.addComponents(actionRow);

  return interaction.showModal(modal);
}

async function handleConfessionModalSubmit(interaction, client) {
  const confessionContent = interaction.fields.getTextInputValue('confession_content');
  const confessionData = await Confession.findOne({ guildId: interaction.guild.id });

  if (!confessionData || !confessionData.enabled) {
    return interaction.reply({
      content: '❌ The confession system is not enabled in this server.',
      ephemeral: true
    });
  }

  const channel = interaction.guild.channels.cache.get(confessionData.channelId);
  if (!channel) {
    return interaction.reply({
      content: '❌ The confession channel no longer exists.',
      ephemeral: true
    });
  }

  // Check for blocked words
  if (confessionData.settings.blockedWords?.length > 0) {
    const lowerContent = confessionContent.toLowerCase();
    const hasBlockedWord = confessionData.settings.blockedWords.some(word =>
      lowerContent.includes(word.toLowerCase())
    );
    if (hasBlockedWord) {
      return interaction.reply({
        content: '❌ Your confession contains blocked words. Please revise and try again.',
        ephemeral: true
      });
    }
  }

  // Update cooldown
  if (!confessionData.userCooldowns) {
    confessionData.userCooldowns = new Map();
  }
  confessionData.userCooldowns.set(interaction.user.id, new Date());

  // Check if approval is required
  if (confessionData.settings.requireApproval) {
    confessionData.pendingConfessions.push({
      content: confessionContent,
      userId: interaction.user.id,
      timestamp: new Date()
    });
    await confessionData.save();

    return interaction.reply({
      content: '✅ Your confession has been submitted and is pending approval by moderators.',
      ephemeral: true
    });
  }

  // Post the confession directly
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
    .setAuthor({
      name: `Anonymous Confession (#${confessionNumber})`
    })
    .setDescription(`"${confessionContent}"`)
    .setColor('#9b59b6')
    .setTimestamp();

  // Confession only gets Reply button (not submit)
  const confessionButtons = [];
  if (confessionData.settings.allowReplies) {
    confessionButtons.push(
      new ButtonBuilder()
        .setCustomId(`confession_reply_${confessionNumber}`)
        .setLabel('Reply')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💬')
    );
  }

  const confessionRow = confessionButtons.length > 0 ? new ActionRowBuilder().addComponents(confessionButtons) : null;

  const sentMessage = await channel.send({ 
    embeds: [confessionEmbed], 
    components: confessionRow ? [confessionRow] : [] 
  });

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

  // Save the confession
  confessionData.confessions.push({
    number: confessionNumber,
    content: confessionContent,
    messageId: sentMessage.id,
    userId: interaction.user.id, // Stored for moderation purposes only
    timestamp: new Date()
  });
  await confessionData.save();

  return interaction.reply({
    content: `✅ Your anonymous confession (#${confessionNumber}) has been posted!`,
    ephemeral: true
  });
}

async function handleConfessionReplyModalSubmit(interaction, client) {
  const replyContent = interaction.fields.getTextInputValue('reply_content');
  const confessionNumber = interaction.customId.replace('confession_reply_modal_', '');

  const confessionData = await Confession.findOne({ guildId: interaction.guild.id });

  if (!confessionData) {
    return interaction.reply({
      content: '❌ Confession data not found.',
      ephemeral: true
    });
  }

  const confession = confessionData.confessions.find(c => c.number === parseInt(confessionNumber));
  if (!confession) {
    return interaction.reply({
      content: '❌ Original confession not found.',
      ephemeral: true
    });
  }

  const channel = interaction.guild.channels.cache.get(confessionData.channelId);
  if (!channel) {
    return interaction.reply({
      content: '❌ The confession channel no longer exists.',
      ephemeral: true
    });
  }

  // Increment the confession count for the reply (replies get their own number)
  confessionData.confessionCount++;
  const replyNumber = confessionData.confessionCount;

  // Create reply embed (styled like the example - Anonymous Reply with its own number)
  const replyEmbed = new EmbedBuilder()
    .setAuthor({
      name: `Anonymous Reply (#${replyNumber})`
    })
    .setDescription(`"${replyContent}"`)
    .setColor('#7289da')
    .setTimestamp();

  // Create Reply button for this reply (so people can reply to replies)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confession_reply_${replyNumber}`)
      .setLabel('Reply')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💬')
  );

  // Post the reply as a new message in the channel
  const sentMessage = await channel.send({ embeds: [replyEmbed], components: [row] });

  // Save the reply as a new confession entry (since it has its own number)
  confessionData.confessions.push({
    number: replyNumber,
    content: replyContent,
    messageId: sentMessage.id,
    userId: interaction.user.id,
    replyTo: parseInt(confessionNumber), // Track which confession this is replying to
    timestamp: new Date()
  });
  await confessionData.save();

  return interaction.reply({
    content: `✅ Your anonymous reply (#${replyNumber}) to confession #${confessionNumber} has been posted!`,
    ephemeral: true
  });
}
