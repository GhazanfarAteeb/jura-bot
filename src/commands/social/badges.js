import { EmbedBuilder } from 'discord.js';
import Social from '../../models/Social.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'badges',
  description: 'Display achievement records for a user, Master',
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
          return message.reply(`**Notice:** No achievements detected in your profile, Master.\n\nAchievements are earned through activity, bonds, and progression.`);
        }
        return message.reply(`**Notice:** **${targetUser.username}** has not acquired any achievements yet.`);
      }

      const badgeList = badges.map(b => {
        const date = new Date(b.earnedAt).toLocaleDateString();
        return `${b.emoji} **${b.name}**\n└ *${b.description}* (${date})`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(social.profile?.color || '#00CED1')
        .setTitle(`『 ${targetUser.username}'s Achievements 』`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(badgeList)
        .setFooter({ text: `${badges.length} achievement${badges.length !== 1 ? 's' : ''} acquired • Analysis complete.` });

      // Show available badges they don't have
      if (targetUser.id === message.author.id) {
        const availableBadges = Object.values(Social.BADGES)
          .filter(b => !badges.some(earned => earned.id === b.id))
          .slice(0, 5)
          .map(b => `${b.emoji} ${b.name}`)
          .join(', ');

        if (availableBadges) {
          embed.addFields({
            name: '◈ Locked Achievements',
            value: availableBadges
          });
        }
      }

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Badges command error:', error);
      return message.reply('**Error:** An anomaly occurred while retrieving achievement data, Master.');
    }
  }
};
