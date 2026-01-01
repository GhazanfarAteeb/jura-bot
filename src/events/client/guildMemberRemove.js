import { Events } from 'discord.js';
import Member from '../../models/Member.js';
import Guild from '../../models/Guild.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';

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

            const embed = await infoEmbed(guildId, 'Member Left',
              `${GLYPHS.ARROW_RIGHT} **User:** ${member.user.tag} (${member.user.id})\n` +
              `${GLYPHS.ARROW_RIGHT} **Joined:** ${joinedText}\n` +
              `${GLYPHS.ARROW_RIGHT} **Total Joins:** ${memberData?.joinCount || 1}\n` +
              `${GLYPHS.ARROW_RIGHT} **Total Leaves:** ${memberData?.leaveCount || 1}`
            );
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            embed.setColor('#ED4245');
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
