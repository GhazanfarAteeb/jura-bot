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

    if (dueReminders.length > 0) {
      console.log(`[Reminders] Found ${dueReminders.length} due reminder(s)`);
    }

    for (const reminder of dueReminders) {
      try {
        const guild = client.guilds.cache.get(reminder.guildId);
        if (!guild) {
          console.log(`[Reminders] Guild ${reminder.guildId} not found, marking complete`);
          await reminder.complete();
          continue;
        }

        const channel = guild.channels.cache.get(reminder.channelId);
        const user = await client.users.fetch(reminder.userId).catch(() => null);

        if (!user) {
          console.log(`[Reminders] User ${reminder.userId} not found, marking complete`);
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
        let sent = false;
        if (channel) {
          try {
            await channel.send({
              content: `<@${reminder.userId}>`,
              embeds: [embed]
            });
            sent = true;
            console.log(`[Reminders] Sent reminder to ${user.tag} in #${channel.name}`);
          } catch (channelError) {
            console.log(`[Reminders] Could not send to channel, trying DM`);
          }
        }
        
        if (!sent) {
          // Fall back to DM
          try {
            await user.send({ embeds: [embed] });
            console.log(`[Reminders] Sent reminder via DM to ${user.tag}`);
          } catch (dmError) {
            console.log(`[Reminders] Could not DM user ${user.tag}`);
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
