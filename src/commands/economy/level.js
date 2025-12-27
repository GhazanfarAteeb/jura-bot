import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import Economy from '../../models/Economy.js';
import Member from '../../models/Member.js';
import Guild from '../../models/Guild.js';
import { getBackground } from '../../utils/shopItems.js';

// Register fonts if available
try {
  GlobalFonts.registerFromPath('./assets/fonts/Poppins-Bold.ttf', 'Poppins Bold');
  GlobalFonts.registerFromPath('./assets/fonts/Poppins-Regular.ttf', 'Poppins');
} catch (error) {
  console.log('Custom fonts not found, using system fonts');
}

export default {
  name: 'level',
  description: 'View your compact rank card',
  usage: 'level [@user]',
  category: 'economy',
  aliases: ['lvl', 'rank', 'xp', 'card', 'me'],
  cooldown: 5,

  execute: async (message, args) => {
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;
    const guildId = message.guild.id;

    try {
      await message.channel.sendTyping();

      const economy = await Economy.getEconomy(userId, guildId);
      const memberData = await Member.getMember(userId, guildId, {
        username: targetUser.username,
        discriminator: targetUser.discriminator,
        displayName: targetUser.displayName,
        globalName: targetUser.globalName,
        avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
        tag: targetUser.tag,
        createdAt: targetUser.createdAt
      });

      // Get guild config for fallback background
      const guildConfig = await Guild.getGuild(guildId);
      const fallbackBg = guildConfig.economy?.fallbackBackground;

      // Get background - check user's background, then custom shop items, then fallback
      let background = getBackground(economy.profile.background || 'default');

      // If user has a custom background from shop, find it in custom items
      if (!background || !background.image) {
        const customBg = (guildConfig.customShopItems || []).find(
          item => item.type === 'background' && item.id === economy.profile.background
        );
        if (customBg) {
          background = {
            id: customBg.id,
            name: customBg.name,
            image: customBg.image || '',
            color: customBg.color || '#2C2F33'
          };
        }
      }

      // Use fallback if no image
      const bgImage = background?.image || fallbackBg?.image || '';
      const bgColor = background?.color || fallbackBg?.color || economy.profile.backgroundColor || '#2C2F33';

      // Create canvas
      const canvas = createCanvas(900, 300);
      const ctx = canvas.getContext('2d');

      // Draw background
      if (bgImage) {
        try {
          const loadedBg = await loadImage(bgImage).catch(() => null);
          if (loadedBg) {
            ctx.drawImage(loadedBg, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        } catch {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw overlay for better text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bottom gradient to create "cut-off" effect (indicates there's more in profile)
      const bottomGradient = ctx.createLinearGradient(0, canvas.height - 50, 0, canvas.height);
      bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

      // Draw accent line at bottom to indicate continuation
      const accentColor = economy.profile.accentColor || '#7289DA';
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, canvas.height - 5, canvas.width, 5);

      // Draw avatar border
      const avatarX = 50;
      const avatarY = canvas.height / 2;
      const avatarSize = 200;

      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY, avatarSize / 2 + 5, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = accentColor;
      ctx.fill();

      // Draw avatar
      const avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();

      // Text area starting position
      const textX = avatarX + avatarSize + 40;
      let textY = 70;

      // Draw username
      ctx.font = 'bold 36px "Poppins Bold", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(targetUser.displayName || targetUser.username, textX, textY);

      textY += 40;

      // Draw handle
      ctx.font = '20px "Poppins", sans-serif';
      ctx.fillStyle = '#B9BBBE';
      ctx.fillText(`@${targetUser.username}`, textX, textY);

      textY += 35;

      // Draw title if set
      if (economy.profile.title) {
        ctx.font = 'italic 18px "Poppins", sans-serif';
        ctx.fillStyle = accentColor;
        ctx.fillText(`"${economy.profile.title}"`, textX, textY);
        textY += 30;
      }

      // Draw short bio preview (max 1 line in rank card)
      if (economy.profile.bio) {
        ctx.font = '15px "Poppins", sans-serif';
        ctx.fillStyle = '#DCDDDE';
        const maxWidth = 500;
        let bioText = economy.profile.bio;

        // Truncate if too long
        while (ctx.measureText(bioText).width > maxWidth && bioText.length > 0) {
          bioText = bioText.slice(0, -1);
        }
        if (bioText.length < economy.profile.bio.length) {
          bioText = bioText.slice(0, -3) + '...';
        }

        ctx.fillText(bioText, textX, textY);
      }

      // NOTE: Full bio and description shown in !profile command

      // Draw stats if enabled
      if (economy.profile.showStats !== false) {
        textY = canvas.height - 100;

        // Stats background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(textX - 10, textY - 25, 550, 80);

        ctx.font = '18px "Poppins", sans-serif';

        // Coins - colored circle indicator
        ctx.beginPath();
        ctx.arc(textX + 8, textY - 5, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${economy.coins.toLocaleString()}`, textX + 25, textY);

        // Streak - colored circle indicator
        ctx.beginPath();
        ctx.arc(textX + 158, textY - 5, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FF6B6B';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${economy.daily.streak || 0} days`, textX + 175, textY);

        // Rep - colored circle indicator
        ctx.beginPath();
        ctx.arc(textX + 308, textY - 5, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFC0CB';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${economy.reputation || 0}`, textX + 325, textY);

        textY += 35;

        // Total earned
        ctx.font = '14px "Poppins", sans-serif';
        ctx.fillStyle = '#B9BBBE';
        ctx.fillText(`Total Earned: ${economy.stats.totalEarned.toLocaleString()} coins`, textX, textY);

        // Messages sent
        if (economy.stats.messagesCount > 0) {
          ctx.fillText(`Messages: ${economy.stats.messagesCount.toLocaleString()}`, textX + 250, textY);
        }
      }

      // Draw badges if enabled
      if (economy.profile.showBadges !== false && economy.inventory.badges.length > 0) {
        const badgeY = 40;
        const badgeSize = 28;
        const badgeSpacing = 36;
        let badgeX = canvas.width - 60;

        // Draw up to 5 badges
        for (let i = 0; i < Math.min(economy.inventory.badges.length, 5); i++) {
          const badge = economy.inventory.badges[i];

          // Draw badge as golden circle
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFD700';
          ctx.fill();
          ctx.strokeStyle = '#B8860B';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw star character in center
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('★', badgeX, badgeY + 5);
          ctx.textAlign = 'left';

          badgeX -= badgeSpacing;
        }
      }

      // Draw decorative accent corners (same style as profile)
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;

      // Top left corner
      ctx.beginPath();
      ctx.moveTo(10, 30);
      ctx.lineTo(10, 10);
      ctx.lineTo(30, 10);
      ctx.stroke();

      // Top right corner
      ctx.beginPath();
      ctx.moveTo(canvas.width - 30, 10);
      ctx.lineTo(canvas.width - 10, 10);
      ctx.lineTo(canvas.width - 10, 30);
      ctx.stroke();

      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'rank.png' });

      await message.reply({ files: [attachment] });

    } catch (error) {
      console.error('Level command error:', error);

      // Fallback to embed-based level display
      try {
        const economy = await Economy.getEconomy(userId, guildId);

        const embed = new EmbedBuilder()
          .setColor(economy.profile.accentColor || '#7289DA')
          .setAuthor({
            name: targetUser.tag,
            iconURL: targetUser.displayAvatarURL({ dynamic: true })
          })
          .setTitle(economy.profile.title || 'Level Card')
          .setDescription(economy.profile.bio || 'No bio set')
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: '💰 Coins', value: `${economy.coins.toLocaleString()}`, inline: true },
            { name: '🔥 Streak', value: `${economy.daily.streak || 0} days`, inline: true },
            { name: '⭐ Reputation', value: `${economy.reputation || 0}`, inline: true },
            { name: '📊 Total Earned', value: `${economy.stats.totalEarned.toLocaleString()}`, inline: true }
          )
          .setFooter({ text: 'Use !profile to see full profile with description' })
          .setTimestamp();

        message.reply({ embeds: [embed] });
      } catch (fallbackError) {
        message.reply('An error occurred while generating your level card. Please try again!');
      }
    }
  }
};
