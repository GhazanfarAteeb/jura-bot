import { EmbedBuilder } from 'discord.js';
import Social from '../../models/Social.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'badges',
  description: 'View your or someone\'s badges',
  usage: '[@user]',
  aliases: ['mybadges', 'achievements'],
  category: 'social',
  cooldown: 5,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const targetUser = message.mentions.users.first() || message.author;
    const prefix = await getPrefix(guildId);

    try {
      const social = await Social.getSocial(targetUser.id, guildId);

      const badges = social.badges || [];

      if (badges.length === 0) {
        if (targetUser.id === message.author.id) {
          return message.reply(`🏅 You don't have any badges yet!\n\nEarn badges by being active, getting married, leveling up, and more!`);
        }
        return message.reply(`🏅 **${targetUser.username}** doesn't have any badges yet!`);
      }

      const badgeList = badges.map(b => {
        const date = new Date(b.earnedAt).toLocaleDateString();
        return `${b.emoji} **${b.name}**\n└ *${b.description}* (${date})`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(social.profile?.color || '#5865F2')
        .setTitle(`🏅 ${targetUser.username}'s Badges`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(badgeList)
        .setFooter({ text: `${badges.length} badge${badges.length !== 1 ? 's' : ''} earned` });

      // Show available badges they don't have
      if (targetUser.id === message.author.id) {
        const availableBadges = Object.values(Social.BADGES)
          .filter(b => !badges.some(earned => earned.id === b.id))
          .slice(0, 5)
          .map(b => `${b.emoji} ${b.name}`)
          .join(', ');

        if (availableBadges) {
          embed.addFields({
            name: '🔒 Badges to Earn',
            value: availableBadges
          });
        }
      }

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Badges command error:', error);
      return message.reply('❌ An error occurred while fetching badges.');
    }
  }
};
