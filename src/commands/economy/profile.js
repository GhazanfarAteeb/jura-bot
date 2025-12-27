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

// Helper function to wrap text
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

// Helper function to draw rounded rectangle
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

export default {
    name: 'profile',
    description: 'View your full profile card with bio and description',
    usage: 'profile [@user]',
    category: 'economy',
    aliases: ['prof', 'myprofile', 'fullprofile'],
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
            
            // Create canvas - taller for profile to accommodate description
            const canvas = createCanvas(900, 500);
            const ctx = canvas.getContext('2d');
            
            // Draw background (full height, will be "cut" visually)
            if (background && background.image) {
                try {
                    const bgImage = await loadImage(background.image).catch(() => null);
                    if (bgImage) {
                        // Draw background covering entire canvas
                        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
                    } else {
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
            
            // Draw gradient overlay for the top section (rank card area)
            const gradientTop = ctx.createLinearGradient(0, 0, 0, 300);
            gradientTop.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
            gradientTop.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
            ctx.fillStyle = gradientTop;
            ctx.fillRect(0, 0, canvas.width, 300);
            
            // Draw a separator line between rank section and description section
            const accentColor = economy.profile.accentColor || '#7289DA';
            ctx.fillStyle = accentColor;
            ctx.fillRect(0, 295, canvas.width, 5);
            
            // Draw darker overlay for description area (bottom section)
            const blurColor = economy.profile.blurColor || 'rgba(0, 0, 0, 0.7)';
            ctx.fillStyle = blurColor;
            ctx.fillRect(0, 300, canvas.width, 200);
            
            // ========== TOP SECTION (RANK CARD - Same as level.js) ==========
            
            // Draw avatar border
            const avatarX = 50;
            const avatarY = 150;
            const avatarSize = 180;
            
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
            
            // Text area starting position (top section)
            const textX = avatarX + avatarSize + 40;
            let textY = 60;
            
            // Draw username
            ctx.font = 'bold 36px "Poppins Bold", sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(targetUser.displayName || targetUser.username, textX, textY);
            
            textY += 40;
            
            // Draw handle/tag
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
            
            // Draw bio (short version) in top section
            if (economy.profile.bio) {
                ctx.font = '16px "Poppins", sans-serif';
                ctx.fillStyle = '#DCDDDE';
                const bioLines = wrapText(ctx, economy.profile.bio, 500);
                const maxBioLines = 2; // Only show 2 lines in top section
                
                for (let i = 0; i < Math.min(bioLines.length, maxBioLines); i++) {
                    ctx.fillText(bioLines[i] + (i === maxBioLines - 1 && bioLines.length > maxBioLines ? '...' : ''), textX, textY);
                    textY += 22;
                }
            }
            
            // Draw stats in top section
            if (economy.profile.showStats !== false) {
                const statsY = 240;
                
                // Stats background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                roundedRect(ctx, textX - 10, statsY - 20, 550, 60, 10);
                ctx.fill();
                
                ctx.font = '18px "Poppins", sans-serif';
                
                // Coins
                ctx.fillStyle = '#FFD700';
                ctx.fillText('💰', textX + 10, statsY + 10);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`${economy.coins.toLocaleString()}`, textX + 45, statsY + 10);
                
                // Streak
                ctx.fillStyle = '#FF6B6B';
                ctx.fillText('🔥', textX + 170, statsY + 10);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`${economy.daily.streak || 0} days`, textX + 205, statsY + 10);
                
                // Rep
                ctx.fillStyle = '#FFC0CB';
                ctx.fillText('⭐', textX + 340, statsY + 10);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`${economy.reputation || 0}`, textX + 375, statsY + 10);
            }
            
            // ========== BOTTOM SECTION (DESCRIPTION AREA) ==========
            
            const descSectionY = 320;
            const descPadding = 30;
            
            // Draw section label
            ctx.font = 'bold 18px "Poppins Bold", sans-serif';
            ctx.fillStyle = accentColor;
            ctx.fillText('📝 About Me', descPadding, descSectionY);
            
            // Draw description
            ctx.font = '16px "Poppins", sans-serif';
            ctx.fillStyle = '#DCDDDE';
            
            const description = economy.profile.description || 'No description set. Use `setprofile description <text>` to add one!';
            const descLines = wrapText(ctx, description, canvas.width - (descPadding * 2));
            const maxDescLines = 6;
            let descY = descSectionY + 35;
            
            for (let i = 0; i < Math.min(descLines.length, maxDescLines); i++) {
                const line = descLines[i] + (i === maxDescLines - 1 && descLines.length > maxDescLines ? '...' : '');
                ctx.fillText(line, descPadding, descY);
                descY += 24;
            }
            
            // Draw badges in bottom right corner if enabled
            if (economy.profile.showBadges !== false && economy.inventory.badges.length > 0) {
                const badgeY = 460;
                const badgeSize = 32;
                const badgeSpacing = 40;
                let badgeX = canvas.width - 60;
                
                // Badge section background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                roundedRect(ctx, badgeX - (Math.min(economy.inventory.badges.length, 5) * badgeSpacing), badgeY - badgeSize / 2 - 5, 
                           Math.min(economy.inventory.badges.length, 5) * badgeSpacing + 30, badgeSize + 10, 8);
                ctx.fill();
                
                // Draw up to 5 badges
                for (let i = 0; i < Math.min(economy.inventory.badges.length, 5); i++) {
                    ctx.font = '24px sans-serif';
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText('🏅', badgeX - badgeSize / 2, badgeY + badgeSize / 4);
                    badgeX -= badgeSpacing;
                }
            }
            
            // Draw footer with stats
            const footerY = 480;
            ctx.font = '12px "Poppins", sans-serif';
            ctx.fillStyle = '#72767D';
            ctx.fillText(`Total Earned: ${economy.stats.totalEarned.toLocaleString()} coins`, descPadding, footerY);
            
            if (economy.stats.messagesCount > 0) {
                ctx.fillText(`Messages: ${economy.stats.messagesCount.toLocaleString()}`, 230, footerY);
            }
            
            // Draw decorative accent corners
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
            
            // Bottom left corner
            ctx.beginPath();
            ctx.moveTo(10, canvas.height - 30);
            ctx.lineTo(10, canvas.height - 10);
            ctx.lineTo(30, canvas.height - 10);
            ctx.stroke();
            
            // Bottom right corner
            ctx.beginPath();
            ctx.moveTo(canvas.width - 30, canvas.height - 10);
            ctx.lineTo(canvas.width - 10, canvas.height - 10);
            ctx.lineTo(canvas.width - 10, canvas.height - 30);
            ctx.stroke();
            
            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
            
            await message.reply({ files: [attachment] });
            
        } catch (error) {
            console.error('Profile command error:', error);
            
            // Fallback to embed-based profile display
            try {
                const economy = await Economy.getEconomy(userId, guildId);
                
                const embed = new EmbedBuilder()
                    .setColor(economy.profile.accentColor || '#7289DA')
                    .setAuthor({ 
                        name: targetUser.tag, 
                        iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTitle(economy.profile.title || '📋 Profile Card')
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: '📝 Bio', value: economy.profile.bio || 'No bio set', inline: false },
                        { name: '📄 Description', value: economy.profile.description || 'No description set', inline: false },
                        { name: '💰 Coins', value: `${economy.coins.toLocaleString()}`, inline: true },
                        { name: '🔥 Streak', value: `${economy.daily.streak || 0} days`, inline: true },
                        { name: '⭐ Reputation', value: `${economy.reputation || 0}`, inline: true },
                        { name: '📊 Total Earned', value: `${economy.stats.totalEarned.toLocaleString()}`, inline: true }
                    )
                    .setFooter({ text: 'Use !setprofile to customize your profile' })
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
            } catch (fallbackError) {
                message.reply('An error occurred while generating your profile card. Please try again!');
            }
        }
    }
};
