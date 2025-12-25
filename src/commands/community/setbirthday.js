import { PermissionFlagsBits } from 'discord.js';
import Birthday from '../../models/Birthday.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'setbirthday',
  description: 'Set a member\'s birthday for celebrations (Staff command)',
  usage: 'setbirthday <@user> <month> <day> [year] [--fake] [--private]',
  category: 'community',
  permissions: [PermissionFlagsBits.ManageRoles],
  cooldown: 5,
  execute: async (message, args) => {
    const guildId = message.guild.id;

    // Check if user has staff role or admin permissions
    const guildConfig = await Guild.getGuild(guildId, message.guild.name);
    const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageRoles) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      (guildConfig.roles.staffRoles && guildConfig.roles.staffRoles.some(roleId =>
        message.member.roles.cache.has(roleId)
      ));

    if (!isStaff) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'You need staff permissions to use this command!')]
      });
    }

    if (args.length < 3) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Please provide a user and their birthday!\n\nUsage: `!setbirthday <@user> <month> <day> [year] [--fake] [--private]`\n\nExamples:\n• `!setbirthday @User 12 25` - December 25th\n• `!setbirthday @User 12 25 2000` - December 25th, 2000\n• `!setbirthday @User 12 25 --fake` - Fake birthday (for privacy)\n• `!setbirthday @User 12 25 --private` - No age will be shown')]
      });
    }

    // Parse target user
    const targetUser = message.mentions.users.first() ||
      await message.client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);

    if (!targetUser) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Could not find that user! Please mention them or provide their ID.')]
      });
    }

    const userId = targetUser.id;

    // Remove user mention from args
    const birthdayArgs = args.slice(1);

    // Parse flags
    const flags = birthdayArgs.filter(arg => arg.startsWith('--'));
    const isFake = flags.includes('--fake');
    const isPrivate = flags.includes('--private');

    // Remove flags from args
    const cleanArgs = birthdayArgs.filter(arg => !arg.startsWith('--'));

    const month = parseInt(cleanArgs[0]);
    const day = parseInt(cleanArgs[1]);
    const year = cleanArgs[2] ? parseInt(cleanArgs[2]) : null;

    // Validate month (1-12)
    if (isNaN(month) || month < 1 || month > 12) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid month! Please use 1-12.')]
      });
    }

    // Validate day (1-31)
    if (isNaN(day) || day < 1 || day > 31) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid day! Please use 1-31.')]
      });
    }

    // Validate year if provided
    if (year !== null && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) {
      return message.reply({
        embeds: [await errorEmbed(guildId, `Invalid year! Please use 1900-${new Date().getFullYear()}.`)]
      });
    }

    // Check if date exists (basic validation)
    const testDate = new Date(year || 2000, month - 1, day);
    if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid date! This day doesn\'t exist in this month.')]
      });
    }

    try {
      // Find or create birthday
      let birthday = await Birthday.findOne({ guildId, userId });

      if (birthday) {
        // Update existing - using the nested birthday object structure
        birthday.birthday = {
          month: month,
          day: day,
          year: year
        };
        birthday.username = targetUser.username;
        birthday.isActualBirthday = !isFake;
        birthday.showAge = !isPrivate;
      } else {
        // Create new - using the nested birthday object structure
        birthday = new Birthday({
          guildId,
          userId,
          username: targetUser.username,
          birthday: {
            month: month,
            day: day,
            year: year
          },
          isActualBirthday: !isFake,
          showAge: !isPrivate
        });
      }

      await birthday.save();

      // Create success message
      const dateStr = `${month}/${day}${year ? `/${year}` : ''}`;
      let description = `${GLYPHS.SUCCESS} Birthday for **${targetUser.tag}** set to **${dateStr}**!`;

      if (isFake) {
        description += '\n🎭 Marked as fake birthday (for privacy)';
      }

      if (isPrivate) {
        description += '\n🔒 Age will not be shown in announcements';
      }

      if (!isFake && year) {
        const age = birthday.getAge();
        if (age !== null) {
          description += `\n🎂 They'll turn ${age + 1} on their next birthday!`;
        }
      }

      const embed = await successEmbed(guildId, 'Birthday Set!', description);
      embed.addFields({
        name: 'Celebration Preference',
        value: `Current: **${birthday.celebrationPreference}**\nMember can change with: \`!birthdaypreference <public|dm|role|none>\``,
        inline: false
      });

      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error setting birthday:', error);
      message.reply({
        embeds: [await errorEmbed(guildId, 'Failed to set birthday. Please try again.')]
      });
    }
  }
};
