import { EmbedBuilder } from 'discord.js';
import Birthday from '../../models/Birthday.js';
import { errorEmbed, infoEmbed } from '../../utils/embeds.js';

export default {
  name: 'mybirthday',
  description: 'View your registered birthday',
  usage: 'mybirthday',
  aliases: ['mybday', 'checkbirthday', 'viewbirthday'],
  category: 'community',
  execute: async (message, args) => {
    const guildId = message.guild.id;
    const userId = message.author.id;

    try {
      const birthday = await Birthday.findOne({ guildId, userId });

      if (!birthday) {
        return message.reply({
          embeds: [await infoEmbed(guildId, '🎂 No Birthday Set',
            'You don\'t have a birthday registered!\n\n' +
            '**To set your birthday:**\n' +
            '• Ask a staff member to set it using `!setbirthday`\n' +
            '• Or submit a request using `!requestbirthday <month> <day> [year]`')]
        });
      }

      const { month, day, year } = birthday.birthday;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      
      const dateStr = `${monthNames[month - 1]} ${day}${year ? `, ${year}` : ''}`;
      
      // Calculate days until birthday
      const today = new Date();
      const currentYear = today.getFullYear();
      let birthdayDate = new Date(currentYear, month - 1, day);
      
      if (birthdayDate < today) {
        birthdayDate.setFullYear(currentYear + 1);
      }
      
      const daysUntil = Math.ceil((birthdayDate - today) / (1000 * 60 * 60 * 24));
      
      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎂 Your Birthday')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '📅 Birthday', value: dateStr, inline: true },
          { name: '⏳ Days Until', value: daysUntil === 0 ? '🎉 **Today!**' : `${daysUntil} days`, inline: true }
        );

      // Age info
      if (year && birthday.showAge) {
        const age = birthday.getAge();
        if (age !== null) {
          embed.addFields({ name: '🎈 Age', value: `${age} (turning ${age + 1})`, inline: true });
        }
      } else if (year && !birthday.showAge) {
        embed.addFields({ name: '🔒 Age', value: 'Hidden', inline: true });
      }

      // Source info
      let sourceText = 'Self-set';
      if (birthday.source === 'staff') {
        const setter = birthday.setBy ? await message.client.users.fetch(birthday.setBy).catch(() => null) : null;
        sourceText = `Staff${setter ? ` (${setter.tag})` : ''}`;
      } else if (birthday.source === 'request') {
        sourceText = 'Approved request';
      }
      
      embed.addFields({ name: '📋 Source', value: sourceText, inline: true });

      // Verification status
      if (birthday.verified) {
        embed.addFields({ name: '✅ Status', value: 'Verified', inline: true });
      }

      // Celebration preference
      const prefMap = {
        'public': '📢 Public announcement',
        'dm': '📬 DM only',
        'role': '🎭 Role assignment',
        'none': '🔕 No celebration'
      };
      embed.addFields({ 
        name: '🎊 Celebration', 
        value: prefMap[birthday.celebrationPreference] || 'Public', 
        inline: true 
      });

      // Custom message
      if (birthday.customMessage) {
        embed.addFields({ name: '💬 Custom Message', value: birthday.customMessage, inline: false });
      }

      embed.setFooter({ text: 'Use !birthdaypreference to change settings' });

      message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching birthday:', error);
      message.reply({
        embeds: [await errorEmbed(guildId, 'Failed to fetch your birthday. Please try again.')]
      });
    }
  }
};
