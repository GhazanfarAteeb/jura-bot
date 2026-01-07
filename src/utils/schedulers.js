import cron from 'node-cron';
import Birthday from '../models/Birthday.js';
import Event from '../models/Event.js';
import Guild from '../models/Guild.js';
import { infoEmbed, GLYPHS } from '../utils/embeds.js';
import { checkGiveaways } from '../events/client/giveawayHandler.js';
import { checkReminders } from '../events/client/reminderHandler.js';
import { cleanupTempChannels } from '../events/client/tempVoiceHandler.js';

// Check birthdays every day at midnight
export function startBirthdayChecker(client) {
  cron.schedule('0 0 * * *', async () => {
    console.log('🎂 Checking birthdays...');

    try {
      // Get all guilds
      const guilds = await Guild.find({ 'features.birthdaySystem.enabled': true });

      for (const guildConfig of guilds) {
        const guild = client.guilds.cache.get(guildConfig.guildId);
        if (!guild) continue;

        // Get today's birthdays
        const birthdays = await Birthday.getTodaysBirthdays(guildConfig.guildId);

        if (birthdays.length === 0) continue;

        const channel = guildConfig.features.birthdaySystem.channel
          ? guild.channels.cache.get(guildConfig.features.birthdaySystem.channel)
          : guildConfig.channels.birthdayChannel
            ? guild.channels.cache.get(guildConfig.channels.birthdayChannel)
            : null;

        if (!channel) continue;

        // Announce each birthday
        for (const birthday of birthdays) {
          try {
            const member = await guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) continue;

            // Skip if already celebrated today
            if (birthday.lastCelebrated &&
              new Date(birthday.lastCelebrated).toDateString() === new Date().toDateString()) {
              continue;
            }

            // Assign birthday role if configured (check both possible locations)
            const birthdayRoleId = guildConfig.roles.birthdayRole || guildConfig.features.birthdaySystem.role;
            if (birthdayRoleId) {
              const birthdayRole = guild.roles.cache.get(birthdayRoleId);
              if (birthdayRole && !member.roles.cache.has(birthdayRole.id)) {
                await member.roles.add(birthdayRole);
              }
            }

            // Create birthday message
            let message = guildConfig.features.birthdaySystem.message || '**Notice:** Birthday celebration detected for {user}. Congratulations, Master.';
            message = message.replace('{user}', member.toString());

            const age = birthday.getAge();
            if (age && birthday.showAge) {
              message += `\n**Analysis:** Subject has reached ${age} years of age.`;
            }

            if (birthday.customMessage) {
              message += `\n\n**Message:** "${birthday.customMessage}"`;
            }

            // Send birthday message
            const embed = await infoEmbed(guildConfig.guildId,
              `${GLYPHS.SPARKLE} Birthday Celebration!`,
              message
            );
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
            embed.setColor('#FF69B4'); // Pink color for birthdays

            await channel.send({
              content: `@everyone`,
              embeds: [embed]
            });

            // Update last celebrated
            birthday.lastCelebrated = new Date();
            birthday.notificationSent = true;
            await birthday.save();

            // DM user if they want it
            if (birthday.celebrationPreference === 'dm') {
              try {
                await member.send({ embeds: [embed] });
              } catch (error) {
                console.log(`Could not DM birthday user: ${birthday.userId}`);
              }
            }

          } catch (error) {
            console.error(`Error celebrating birthday for ${birthday.userId}:`, error);
          }
        }
      }

    } catch (error) {
      console.error('Error in birthday checker:', error);
    }
  });

  console.log('[RAPHAEL] Birthday monitoring system initialized.');
}

// Check for events every minute
export function startEventChecker(client) {
  cron.schedule('* * * * *', async () => {
    try {
      const events = await Event.getEventsNeedingNotification();

      for (const event of events) {
        if (!event.shouldSendReminder()) continue;

        const guild = client.guilds.cache.get(event.guildId);
        if (!guild) continue;

        const guildConfig = await Guild.getGuild(event.guildId);
        if (!guildConfig.eventSystem.enabled) continue;

        const channel = event.notificationChannel
          ? guild.channels.cache.get(event.notificationChannel)
          : guildConfig.eventSystem.channel
            ? guild.channels.cache.get(guildConfig.eventSystem.channel)
            : null;

        if (!channel) continue;

        // Calculate time until event
        const timeUntil = Math.floor((event.eventDate.getTime() - Date.now()) / (1000 * 60));

        // Create notification embed
        const embed = await infoEmbed(event.guildId,
          `${GLYPHS.BELL} Event Reminder!`,
          `**${event.title}** is starting ${timeUntil <= 1 ? 'now' : `in ${timeUntil} minutes`}!`
        );

        if (event.description) {
          embed.addFields({
            name: 'Description',
            value: event.description,
            inline: false
          });
        }

        if (event.location) {
          const locationChannel = guild.channels.cache.get(event.location);
          embed.addFields({
            name: 'Location',
            value: locationChannel ? locationChannel.toString() : event.location,
            inline: true
          });
        }

        embed.addFields({
          name: 'Time',
          value: `<t:${Math.floor(event.eventDate.getTime() / 1000)}:F>`,
          inline: true
        });

        if (event.participants.length > 0) {
          embed.addFields({
            name: 'Participants',
            value: `${event.participants.length} member${event.participants.length !== 1 ? 's' : ''}`,
            inline: true
          });
        }

        if (event.color) embed.setColor(event.color);
        if (event.imageUrl) embed.setImage(event.imageUrl);

        // Mention roles
        let mention = '';
        if (event.notificationRoles && event.notificationRoles.length > 0) {
          mention = event.notificationRoles.map(roleId => `<@&${roleId}>`).join(' ');
        }

        await channel.send({
          content: mention || '@here',
          embeds: [embed]
        });

        // Update event status
        event.status = 'notified';
        event.reminders.push({
          sentAt: new Date(),
          minutesBefore: timeUntil
        });
        await event.save();

        console.log(`[RAPHAEL] Event notification dispatched: ${event.title}`);
      }

    } catch (error) {
      console.error('Error in event checker:', error);
    }
  });

  console.log('[RAPHAEL] Event monitoring system initialized.');
}

// Remove birthday role at end of day
export function startBirthdayRoleRemover(client) {
  cron.schedule('59 23 * * *', async () => {
    console.log('🎂 Removing birthday roles...');

    try {
      const guilds = await Guild.find({
        'features.birthdaySystem.enabled': true,
        'roles.birthdayRole': { $exists: true }
      });

      for (const guildConfig of guilds) {
        const guild = client.guilds.cache.get(guildConfig.guildId);
        if (!guild) continue;

        const birthdayRole = guild.roles.cache.get(guildConfig.roles.birthdayRole);
        if (!birthdayRole) continue;

        // Remove role from all members who have it
        const membersWithRole = birthdayRole.members;
        for (const [_, member] of membersWithRole) {
          try {
            await member.roles.remove(birthdayRole);
          } catch (error) {
            console.error(`Error removing birthday role from ${member.id}:`, error.message);
          }
        }
      }

    } catch (error) {
      console.error('Error removing birthday roles:', error);
    }
  });

  console.log('[RAPHAEL] Birthday role removal scheduler initialized.');
}

// Check giveaways every 15 seconds
export function startGiveawayChecker(client) {
  setInterval(async () => {
    await checkGiveaways(client);
  }, 15000);

  console.log('[RAPHAEL] Giveaway monitoring system initialized.');
}

// Check reminders every 15 seconds for more timely delivery
export function startReminderChecker(client) {
  // Run immediately on startup to catch any missed reminders
  checkReminders(client).catch(err => console.error('Initial reminder check failed:', err));

  setInterval(async () => {
    try {
      await checkReminders(client);
    } catch (error) {
      console.error('Reminder checker error:', error);
    }
  }, 15000); // 15 seconds for faster reminder delivery

  console.log('[RAPHAEL] Reminder monitoring system initialized.');
}

// Clean up bot economy and member entries every 5 minutes (for monitoring)
export function startBotEconomyCleanup(client) {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🧹 Cleaning up bot economy and member entries...');

    try {
      const Economy = (await import('../models/Economy.js')).default;
      const Member = (await import('../models/Member.js')).default;

      let totalEconomyDeleted = 0;
      let totalMemberDeleted = 0;
      const guilds = client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        try {
          // Fetch all members to ensure we have the latest data
          await guild.members.fetch();

          // Get all economy entries for this guild
          const economyEntries = await Economy.find({ guildId });
          const memberEntries = await Member.find({ guildId });

          for (const entry of economyEntries) {
            try {
              // Try to get the user from Discord
              const user = await client.users.fetch(entry.userId).catch(() => null);

              // Delete if user is a bot (including this bot itself)
              if ((user && user.bot) || entry.userId === client.user.id) {
                // Log the data before deletion
                const username = user ? user.tag : entry.userId;
                console.log(`[BOT CLEANUP] Deleting economy data for bot: ${username} (${entry.userId})`);
                console.log(`  Guild: ${guild.name} (${guildId})`);
                console.log(`  Coins: ${entry.coins || 0}`);
                console.log(`  Bank: ${entry.bank || 0}`);
                console.log(`  Total Wealth: ${(entry.coins || 0) + (entry.bank || 0)}`);
                console.log(`  Daily Streak: ${entry.dailyStreak || 0}`);
                console.log(`  Last Daily: ${entry.lastDaily || 'Never'}`);
                console.log(`  Rep Given: ${entry.repGiven || 0}`);
                console.log(`  Profile Background: ${entry.profileBackground || 'None'}`);
                console.log(`  Entry Created: ${entry.createdAt || 'Unknown'}`);
                console.log(`---`);
                
                await Economy.deleteOne({ _id: entry._id });
                totalEconomyDeleted++;
              }
            } catch (error) {
              console.error(`Error checking user ${entry.userId}:`, error.message);
            }
          }

          for (const entry of memberEntries) {
            try {
              // Try to get the user from Discord
              const user = await client.users.fetch(entry.userId).catch(() => null);

              // Delete if user is a bot (including this bot itself)
              if ((user && user.bot) || entry.userId === client.user.id) {
                // Log the member data before deletion
                const username = user ? user.tag : entry.userId;
                console.log(`[BOT CLEANUP] Deleting member data for bot: ${username} (${entry.userId})`);
                console.log(`  Guild: ${guild.name} (${guildId})`);
                console.log(`  Warnings: ${entry.warnings?.length || 0}`);
                console.log(`  Mutes: ${entry.mutes?.length || 0}`);
                console.log(`  Kicks: ${entry.kicks?.length || 0}`);
                console.log(`  Bans: ${entry.bans?.length || 0}`);
                console.log(`  Entry Created: ${entry.createdAt || 'Unknown'}`);
                console.log(`---`);
                
                await Member.deleteOne({ _id: entry._id });
                totalMemberDeleted++;
              }
            } catch (error) {
              console.error(`Error checking member ${entry.userId}:`, error.message);
            }
          }
        } catch (error) {
          console.error(`Error processing guild ${guildId}:`, error.message);
        }
      }

      console.log(`🧹 Bot cleanup complete. Deleted ${totalEconomyDeleted} economy entries and ${totalMemberDeleted} member entries.`);
    } catch (error) {
      console.error('Error in bot economy and member cleanup:', error);
    }
  });

  console.log('[RAPHAEL] Bot economy and member cleanup scheduler initialized (runs every 5 minutes).');
}

// Initialize all schedulers
export function initializeSchedulers(client) {
  startBirthdayChecker(client);
  startEventChecker(client);
  startBirthdayRoleRemover(client);
  startGiveawayChecker(client);
  startReminderChecker(client);
  startBotEconomyCleanup(client);

  // Cleanup orphaned temp channels on startup
  cleanupTempChannels(client);
}
