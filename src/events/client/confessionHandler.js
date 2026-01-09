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

  // Find the previous latest confession and remove all buttons from it
  const previousConfession = confessionData.confessions[confessionData.confessions.length - 1];
  if (previousConfession && previousConfession.messageId) {
    try {
      const prevMessage = await channel.messages.fetch(previousConfession.messageId).catch(() => null);
      if (prevMessage) {
        // Remove all buttons from the previous confession
        await prevMessage.edit({ components: [] }).catch(() => {});
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

  // Create a thread for replies
  let threadId = null;
  if (confessionData.settings.allowReplies) {
    try {
      const thread = await sentMessage.startThread({
        name: `Confession #${confessionNumber} Replies`,
        autoArchiveDuration: 1440 // 24 hours
      });
      threadId = thread.id;
    } catch (error) {
      console.error('Failed to create confession thread:', error);
    }
  }

  // Save the confession
  confessionData.confessions.push({
    number: confessionNumber,
    content: confessionContent,
    messageId: sentMessage.id,
    threadId: threadId,
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

  return interaction.reply({
    content: `✅ Your anonymous reply (#${replyNumber}) to confession #${confessionNumber} has been posted in the thread!`,
    ephemeral: true
  });
}
