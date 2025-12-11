import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import Economy from '../../models/Economy.js';
import Member from '../../models/Member.js';
import { getBackground } from '../../utils/shopItems.js';

// Register fonts if available
try {
    GlobalFonts.registerFromPath('./assets/fonts/Poppins-Bold.ttf', 'Poppins Bold');
    GlobalFonts.registerFromPath('./assets/fonts/Poppins-Regular.ttf', 'Poppins');
} catch (error) {
    console.log('Custom fonts not found, using system fonts');
}

export default {
    name: 'profile',
    description: 'View your customized profile card',
    usage: 'profile [@user]',
    category: 'economy',
    aliases: ['prof', 'card', 'me'],
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
            
            // Get background
            const background = getBackground(economy.profile.background || 'default');
            
            // Create canvas
            const canvas = createCanvas(900, 300);
            const ctx = canvas.getContext('2d');
            
            // Draw background
            if (background && background.image) {
                try {
                    const bgImage = await loadImage(background.image).catch(() => null);
                    if (bgImage) {
                        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
                    } else {
                        // Fallback to solid color
                        ctx.fillStyle = background.color || economy.profile.backgroundColor || '#2C2F33';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                } catch {
                    ctx.fillStyle = background.color || economy.profile.backgroundColor || '#2C2F33';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            } else {
                ctx.fillStyle = economy.profile.backgroundColor || '#2C2F33';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw overlay for better text readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw avatar border
            const avatarX = 50;
            const avatarY = canvas.height / 2;
            const avatarSize = 200;
            
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY, avatarSize / 2 + 5, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = economy.profile.accentColor || '#7289DA';
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
            
            textY += 45;
            
            // Draw discriminator/tag
            ctx.font = '20px "Poppins", sans-serif';
            ctx.fillStyle = '#B9BBBE';
            ctx.fillText(targetUser.tag, textX, textY);
            
            textY += 35;
            
            // Draw title if set
            if (economy.profile.title) {
                ctx.font = 'italic 18px "Poppins", sans-serif';
                ctx.fillStyle = economy.profile.accentColor || '#7289DA';
                ctx.fillText(`"${economy.profile.title}"`, textX, textY);
                textY += 30;
            }
            
            // Draw bio if set
            if (economy.profile.bio) {
                ctx.font = '16px "Poppins", sans-serif';
                ctx.fillStyle = '#DCDDDE';
                const maxWidth = 550;
                const words = economy.profile.bio.split(' ');
                let line = '';
                
                for (let word of words) {
                    const testLine = line + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width > maxWidth && line !== '') {
                        ctx.fillText(line, textX, textY);
                        line = word + ' ';
                        textY += 20;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, textX, textY);
                textY += 30;
            }
            
            // Draw description if set (below bio, separate section)
            if (economy.profile.description) {
                // Description box dimensions
                const descBox = {
                    x: textX - 10,
                    y: textY + 10,
                    width: 550,
                    minHeight: 50
                };
                
                // Measure description height
                ctx.font = '14px "Poppins", sans-serif';
                const maxWidth = descBox.width - 20;
                const words = economy.profile.description.split(' ');
                let lines = [];
                let currentLine = '';
                
                for (let word of words) {
                    const testLine = currentLine + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width > maxWidth && currentLine !== '') {
                        lines.push(currentLine);
                        currentLine = word + ' ';
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) lines.push(currentLine);
                
                const lineHeight = 18;
                const descHeight = Math.max(descBox.minHeight, lines.length * lineHeight + 20);
                
                // Draw description background with custom blur color
                ctx.fillStyle = economy.profile.blurColor || 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(descBox.x, descBox.y, descBox.width, descHeight);
                
                // Draw description text
                ctx.fillStyle = '#FFFFFF';
                let descY = descBox.y + 25;
                for (let line of lines) {
                    ctx.fillText(line.trim(), descBox.x + 10, descY);
                    descY += lineHeight;
                }
                
                textY += descHeight + 20;
            }
            
            // Draw stats if enabled
            if (economy.profile.showStats !== false) {
                textY = canvas.height - 100;
                
                // Stats background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(textX - 10, textY - 25, 550, 80);
                
                ctx.font = '18px "Poppins", sans-serif';
                
                // Coins
                ctx.fillStyle = '#FFD700';
                ctx.fillText('💰', textX, textY);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`${economy.coins.toLocaleString()}`, textX + 30, textY);
                
                // Streak
                ctx.fillStyle = '#FF6B6B';
                ctx.fillText('🔥', textX + 150, textY);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`${economy.daily.streak || 0} days`, textX + 180, textY);
                
                // Rep (if available)
                if (memberData.stats && memberData.stats.reputation !== undefined) {
                    ctx.fillStyle = '#3498DB';
                    ctx.fillText('⭐', textX + 300, textY);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`${memberData.stats.reputation || 0}`, textX + 330, textY);
                }
                
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
                const badgeSize = 32;
                const badgeSpacing = 40;
                let badgeX = canvas.width - 60;
                
                // Draw up to 5 badges
                for (let i = 0; i < Math.min(economy.inventory.badges.length, 5); i++) {
                    const badge = economy.inventory.badges[i];
                    
                    // Draw badge background
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(badgeX - badgeSize / 2 - 2, badgeY - badgeSize / 2 - 2, badgeSize + 4, badgeSize + 4);
                    
                    // Draw badge emoji/icon (simplified)
                    ctx.font = '24px sans-serif';
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText('🏅', badgeX - badgeSize / 2, badgeY + badgeSize / 4);
                    
                    badgeX -= badgeSpacing;
                }
            }
            
            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
            
            await message.reply({ files: [attachment] });
            
        } catch (error) {
            console.error('Profile command error:', error);
            
            // Fallback to embed-based profile
            try {
                const economy = await Economy.getEconomy(userId, guildId);
                
                const embed = new EmbedBuilder()
                    .setColor(economy.profile.accentColor || '#7289DA')
                    .setAuthor({ 
                        name: targetUser.tag, 
                        iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTitle(economy.profile.title || 'Profile')
                    .setDescription(economy.profile.bio || 'No bio set')
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: '💰 Coins', value: `${economy.coins.toLocaleString()}`, inline: true },
                        { name: '🔥 Streak', value: `${economy.daily.streak || 0} days`, inline: true },
                        { name: '📊 Total Earned', value: `${economy.stats.totalEarned.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: `Background: ${economy.profile.background || 'default'}` })
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
            } catch (fallbackError) {
                message.reply('An error occurred while generating your profile. Please try again!');
            }
        }
    }
};
