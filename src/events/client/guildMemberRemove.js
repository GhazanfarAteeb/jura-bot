import { Events } from 'discord.js';
import Member from '../../models/Member.js';
import Guild from '../../models/Guild.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const guildId = member.guild.id;

    try {
      // Update member record
      const memberData = await Member.findOne({
        userId: member.user.id,
        guildId
      });

      if (memberData) {
        memberData.leaveCount += 1;
        memberData.leaveHistory.push({
          timestamp: new Date(),
          reason: 'Left/Kicked'
        });

        // Recalculate sus level
        memberData.calculateSusLevel();
        await memberData.save();
      }

      // Log leave event
      const guildConfig = await Guild.getGuild(guildId);
      const leaveLogChannelId = guildConfig?.channels?.leaveLog || guildConfig?.channels?.joinLog;
      if (leaveLogChannelId) {
        try {
          const leaveLogChannel = member.guild.channels.cache.get(leaveLogChannelId);
          if (leaveLogChannel) {
            // Get the most recent join timestamp from database, fallback to Discord's joinedTimestamp
            const lastJoin = memberData?.joinHistory?.length > 0
              ? memberData.joinHistory[memberData.joinHistory.length - 1].timestamp
              : null;
            const joinedTimestamp = lastJoin
              ? Math.floor(new Date(lastJoin).getTime() / 1000)
              : (member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null);

            const joinedText = joinedTimestamp
              ? `<t:${joinedTimestamp}:R>`
              : 'Unknown';

            const embed = await infoEmbed(guildId, 'Entity Departure',
              `**Notice:** A member has departed from this server.`
            );
            embed.addFields(
              { name: '▸ Subject', value: `${member.user.tag} (\`${member.user.id}\`)`, inline: true },
              { name: '▸ First Detected', value: joinedText, inline: true },
              { name: '▸ Join Records', value: `${memberData?.joinCount || 1}`, inline: true },
              { name: '▸ Departure Count', value: `${memberData?.leaveCount || 1}`, inline: true }
            );
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            embed.setColor('#FF4757');
            embed.setFooter({ text: getRandomFooter() });
            await leaveLogChannel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error('Error logging leave:', error.message);
        }
      }

    } catch (error) {
      console.error('Error in guildMemberRemove event:', error);
    }
  }
};
