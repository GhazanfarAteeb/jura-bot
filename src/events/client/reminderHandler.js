import { EmbedBuilder } from 'discord.js';
import Reminder from '../../models/Reminder.js';
import Guild from '../../models/Guild.js';

/**
 * Check and send due reminders
 * Should be called periodically (e.g., every 30 seconds)
 */
export async function checkReminders(client) {
  try {
    const dueReminders = await Reminder.getDueReminders();

    for (const reminder of dueReminders) {
      try {
        const guild = client.guilds.cache.get(reminder.guildId);
        if (!guild) {
          await reminder.complete();
          continue;
        }

        const channel = guild.channels.cache.get(reminder.channelId);
        const user = await client.users.fetch(reminder.userId).catch(() => null);

        if (!user) {
          await reminder.complete();
          continue;
        }

        const guildConfig = await Guild.getGuild(reminder.guildId, guild.name);

        const embed = new EmbedBuilder()
          .setColor(guildConfig.embedStyle?.color || '#5865F2')
          .setTitle('⏰ Reminder!')
          .setDescription(reminder.message)
          .setFooter({
            text: `Set ${formatTimeAgo(reminder.createdAt)}`
          })
          .setTimestamp();

        // Try to send in channel first
        if (channel) {
          await channel.send({
            content: `<@${reminder.userId}>`,
            embeds: [embed]
          });
        } else {
          // Fall back to DM
          try {
            await user.send({ embeds: [embed] });
          } catch (dmError) {
            // Can't send DM, just mark as completed
          }
        }

        // Mark as completed
        await reminder.complete();
      } catch (error) {
        console.error('Error sending reminder:', error);
        // Mark as completed to prevent spam
        await reminder.complete();
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
