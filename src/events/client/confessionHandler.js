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
      flags: 64
    });
  }

  // Check if user is banned
  if (confessionData.settings.bannedUsers.includes(interaction.user.id)) {
    return interaction.reply({
      content: '❌ You have been banned from submitting confessions.',
      flags: 64
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
        flags: 64
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
      flags: 64
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
  // Defer reply immediately to prevent timeout
  await interaction.deferReply({ flags: 64 }); // 64 = ephemeral

  const confessionContent = interaction.fields.getTextInputValue('confession_content');
  const confessionData = await Confession.findOne({ guildId: interaction.guild.id });

  if (!confessionData || !confessionData.enabled) {
    return interaction.editReply({
      content: '❌ The confession system is not enabled in this server.'
    });
  }

  const channel = interaction.guild.channels.cache.get(confessionData.channelId);
  if (!channel) {
    return interaction.editReply({
      content: '❌ The confession channel no longer exists.'
    });
  }

  // Check for blocked words
  if (confessionData.settings.blockedWords?.length > 0) {
    const lowerContent = confessionContent.toLowerCase();
    const hasBlockedWord = confessionData.settings.blockedWords.some(word =>
      lowerContent.includes(word.toLowerCase())
    );
    if (hasBlockedWord) {
      return interaction.editReply({
        content: '❌ Your confession contains blocked words. Please revise and try again.'
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

    return interaction.editReply({
      content: '✅ Your confession has been submitted and is pending approval by moderators.'
    });
  }

  // Post the confession directly
  confessionData.confessionCount++;
  const confessionNumber = confessionData.confessionCount;

  // Find the previous latest confession and remove all buttons from it
  const previousConfession = confessionData.confessions[confessionData.confessions.length - 1];
  if (previousConfession && previousConfession.messageId) {
    try {
      const prevMessage = await channel.messages.fetch(previousConfession.messageId).catch(() => null);
      if (prevMessage) {
        // Remove all buttons from the previous confession
        await prevMessage.edit({ components: [] }).catch(() => { });
      }
    } catch (error) {
      // Ignore errors
    }
  }

  const confessionEmbed = new EmbedBuilder()
    .setAuthor({
      name: `Anonymous Confession (#${confessionNumber})`
    })
    .setDescription(`"${confessionContent}"`)
    .setColor('#9b59b6')
    .setTimestamp();

  // Latest confession gets both Submit and Reply buttons
  const buttons = [
    new ButtonBuilder()
      .setCustomId('confession_submit')
      .setLabel('Submit a confession!')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝')
  ];

  if (confessionData.settings.allowReplies) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`confession_reply_${confessionNumber}`)
        .setLabel('Reply')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💬')
    );
  }

  const row = new ActionRowBuilder().addComponents(buttons);

  const sentMessage = await channel.send({
    embeds: [confessionEmbed],
    components: [row]
  });

  // Save the confession (thread will be created when first reply is submitted)
  confessionData.confessions.push({
    number: confessionNumber,
    content: confessionContent,
    messageId: sentMessage.id,
    threadId: null,
    userId: interaction.user.id, // Stored for moderation purposes only
    timestamp: new Date()
  });
  await confessionData.save();

  return interaction.editReply({
    content: `✅ Your anonymous confession (#${confessionNumber}) has been posted!`
  });
}

async function handleConfessionReplyModalSubmit(interaction, client) {
  // Defer reply immediately to prevent timeout
  await interaction.deferReply({ flags: 64 }); // 64 = ephemeral

  const replyContent = interaction.fields.getTextInputValue('reply_content');
  const confessionNumber = interaction.customId.replace('confession_reply_modal_', '');

  const confessionData = await Confession.findOne({ guildId: interaction.guild.id });

  if (!confessionData) {
    return interaction.editReply({
      content: '❌ Confession data not found.'
    });
  }

  const confession = confessionData.confessions.find(c => c.number === parseInt(confessionNumber));
  if (!confession) {
    return interaction.editReply({
      content: '❌ Original confession not found.'
    });
  }

  const channel = interaction.guild.channels.cache.get(confessionData.channelId);
  if (!channel) {
    return interaction.editReply({
      content: '❌ The confession channel no longer exists.'
    });
  }

  // Increment the confession count for the reply (replies get their own number)
  confessionData.confessionCount++;
  const replyNumber = confessionData.confessionCount;

  // Create reply embed
  const replyEmbed = new EmbedBuilder()
    .setAuthor({
      name: `Anonymous Reply (#${replyNumber})`
    })
    .setDescription(`"${replyContent}"`)
    .setColor('#7289da')
    .setTimestamp();

  // Post the reply in the confession's thread
  let thread = null;
  try {
    if (confession.threadId) {
      // Try to get the existing thread
      thread = await channel.threads.fetch(confession.threadId).catch(() => null);
    }

    if (!thread) {
      // Thread doesn't exist or was archived, try to create from original message
      const originalMessage = await channel.messages.fetch(confession.messageId).catch(() => null);
      if (originalMessage) {
        thread = await originalMessage.startThread({
          name: `Confession #${confessionNumber} Replies`,
          autoArchiveDuration: 1440
        }).catch(() => null);
        if (thread) {
          confession.threadId = thread.id;
        }
      }
    }

    if (thread) {
      await thread.send({ embeds: [replyEmbed] });
    } else {
      // Fallback: send to channel as a message if thread creation fails
      await channel.send({ embeds: [replyEmbed] });
    }
  } catch (error) {
    console.error('Failed to post reply:', error);
    // Fallback: send to channel
    await channel.send({ embeds: [replyEmbed] });
  }

  // Save the reply
  confessionData.confessions.push({
    number: replyNumber,
    content: replyContent,
    messageId: null, // Reply is in thread
    threadId: confession.threadId,
    userId: interaction.user.id,
    replyTo: parseInt(confessionNumber),
    timestamp: new Date()
  });
  await confessionData.save();

  return interaction.editReply({
    content: `✅ Your anonymous reply (#${replyNumber}) to confession #${confessionNumber} has been posted in the thread!`
  });
}
