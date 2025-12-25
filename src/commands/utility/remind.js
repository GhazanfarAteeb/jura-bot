import { EmbedBuilder } from 'discord.js';
import Reminder from '../../models/Reminder.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'remind',
  description: 'Set a reminder',
  usage: '<time> <message> | list | delete <id>',
  aliases: ['reminder', 'remindme', 'rm'],
  cooldown: 5,

  async execute(message, args) {
    if (!args[0]) {
      return showHelp(message);
    }

    const action = args[0].toLowerCase();

    if (action === 'list') {
      return listReminders(message);
    }

    if (action === 'delete' || action === 'remove' || action === 'cancel') {
      return deleteReminder(message, args[1]);
    }

    // Otherwise, create a reminder
    return createReminder(message, args);
  }
};

async function showHelp(message) {
  const embed = await infoEmbed(message.guild.id, '⏰ Reminder Commands',
    `**Create a reminder:**\n` +
    `\`remind <time> <message>\`\n` +
    `Example: \`remind 2h check the oven\`\n\n` +
    `**List your reminders:**\n` +
    `\`remind list\`\n\n` +
    `**Delete a reminder:**\n` +
    `\`remind delete <number>\`\n\n` +
    `**Time formats:**\n` +
    `${GLYPHS.DOT} \`s\` - seconds (30s)\n` +
    `${GLYPHS.DOT} \`m\` - minutes (10m)\n` +
    `${GLYPHS.DOT} \`h\` - hours (2h)\n` +
    `${GLYPHS.DOT} \`d\` - days (1d)\n` +
    `${GLYPHS.DOT} \`w\` - weeks (1w)\n\n` +
    `**Combined formats:**\n` +
    `\`1h30m\` - 1 hour 30 minutes\n` +
    `\`2d12h\` - 2 days 12 hours`
  );
  return message.reply({ embeds: [embed] });
}

async function createReminder(message, args) {
  const timeStr = args[0];
  const duration = parseDuration(timeStr);

  if (!duration || duration < 10000) { // Minimum 10 seconds
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Time',
        'Please provide a valid time (e.g., 10m, 2h, 1d).\nMinimum reminder time is 10 seconds.')]
    });
  }

  if (duration > 30 * 24 * 60 * 60 * 1000) { // Max 30 days
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Time Too Long',
        'Maximum reminder time is 30 days.')]
    });
  }

  const reminderMessage = args.slice(1).join(' ') || 'No message specified';
  const remindAt = new Date(Date.now() + duration);

  // Check user's reminder count (max 25)
  const userReminders = await Reminder.getUserReminders(message.author.id);
  if (userReminders.length >= 25) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Reminder Limit',
        'You have reached the maximum of 25 active reminders.\n' +
        'Delete some reminders with `remind delete <number>`.')]
    });
  }

  // Create reminder
  await Reminder.createReminder({
    guildId: message.guild.id,
    channelId: message.channel.id,
    userId: message.author.id,
    message: reminderMessage,
    remindAt
  });

  const embed = await successEmbed(message.guild.id, '⏰ Reminder Set!',
    `${GLYPHS.SUCCESS} I'll remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>\n\n` +
    `**Message:** ${reminderMessage}`
  );

  return message.reply({ embeds: [embed] });
}

async function listReminders(message) {
  const reminders = await Reminder.getUserReminders(message.author.id);

  if (reminders.length === 0) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, '⏰ Your Reminders',
        'You have no active reminders.')]
    });
  }

  const reminderList = reminders.map((r, i) =>
    `**${i + 1}.** ${r.message.slice(0, 50)}${r.message.length > 50 ? '...' : ''}\n` +
    `   ${GLYPHS.DOT} Reminds: <t:${Math.floor(r.remindAt.getTime() / 1000)}:R>`
  ).join('\n\n');

  const embed = await infoEmbed(message.guild.id, '⏰ Your Reminders',
    `${reminderList}\n\n` +
    `Use \`remind delete <number>\` to remove a reminder.`
  );

  return message.reply({ embeds: [embed] });
}

async function deleteReminder(message, indexStr) {
  const reminders = await Reminder.getUserReminders(message.author.id);

  if (reminders.length === 0) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'No Reminders',
        'You have no active reminders to delete.')]
    });
  }

  const index = parseInt(indexStr) - 1;
  if (isNaN(index) || index < 0 || index >= reminders.length) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Number',
        `Please provide a number between 1 and ${reminders.length}.`)]
    });
  }

  const reminder = reminders[index];
  await Reminder.findByIdAndDelete(reminder._id);

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Reminder Deleted',
      `${GLYPHS.SUCCESS} Deleted reminder: "${reminder.message.slice(0, 50)}${reminder.message.length > 50 ? '...' : ''}"`)]
  });
}

// Helper function to parse duration (supports combined formats like 1h30m)
function parseDuration(str) {
  const regex = /(\d+)(s|m|h|d|w)/gi;
  let match;
  let totalMs = 0;

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    totalMs += value * multipliers[unit];
  }

  return totalMs > 0 ? totalMs : null;
}
