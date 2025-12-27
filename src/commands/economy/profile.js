import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import Economy from '../../models/Economy.js';
import Member from '../../models/Member.js';
import Level from '../../models/Level.js';
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

// Calculate XP needed for level (same formula as Level model)
// Formula: 100 + (level * 50) + (level^1.5 * 25)
function xpForLevel(level) {
    return Math.floor(100 + (level * 50) + Math.pow(level, 1.5) * 25);
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
            
            // Try to get level data
            let levelData = null;
            let rank = 1;
            try {
                levelData = await Level.findOne({ userId: userId, guildId });
                if (levelData) {
                    rank = await Level.getUserRank(userId, guildId) || 1;
                }
            } catch (e) {
                // Level system might not be set up
            }
            
            const currentLevel = levelData?.level || 1;
            const currentXP = levelData?.xp || 0;
            const totalXP = levelData?.totalXP || 0;
            const dailyXP = levelData?.dailyXP || 0;
            const messagesCount = levelData?.messageCount || memberData?.messages || economy.stats.messagesCount || 0;
            const neededXP = xpForLevel(currentLevel);
            
            // Get background
            const background = getBackground(economy.profile.background || 'default');
            const accentColor = economy.profile.accentColor || '#7289DA';
            
            // Create canvas - taller for profile (rank is ~220, profile is ~420)
            const canvas = createCanvas(900, 420);
            const ctx = canvas.getContext('2d');
            
            // Draw solid background
            ctx.fillStyle = economy.profile.backgroundColor || '#2C2F33';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw accent line at TOP (like rank card)
            ctx.fillStyle = accentColor;
            ctx.fillRect(0, 0, canvas.width, 5);
            
            // ========== RANK CARD SECTION (TOP) ==========
            
            // Draw avatar border
            const avatarX = 40;
            const avatarY = 110;
            const avatarSize = 140;
            
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY, avatarSize / 2 + 4, 0, Math.PI * 2);
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
            const textX = avatarX + avatarSize + 30;
            let textY = 50;
            
            // Draw username (bold italic like rank card)
            ctx.font = 'italic bold 32px "Poppins Bold", sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(targetUser.username, textX, textY);
            
            textY += 35;
            
            // Draw Rank
            ctx.font = '18px "Poppins", sans-serif';
            ctx.fillStyle = '#B9BBBE';
            ctx.fillText(`Rank #${rank}`, textX, textY);
            
            textY += 30;
            
            // Draw Level in accent color
            ctx.font = 'bold 22px "Poppins Bold", sans-serif';
            ctx.fillStyle = accentColor;
            ctx.fillText(`Level ${currentLevel}`, textX, textY);
            
            textY += 30;
            
            // Draw XP text
            ctx.font = '16px "Poppins", sans-serif';
            ctx.fillStyle = '#B9BBBE';
            ctx.fillText(`${currentXP} / ${neededXP} XP`, textX, textY);
            
            textY += 20;
            
            // Draw XP progress bar
            const barWidth = 500;
            const barHeight = 20;
            const barX = textX;
            const barY = textY;
            const progress = Math.min(currentXP / neededXP, 1);
            
            // Bar background
            ctx.fillStyle = '#4F545C';
            roundedRect(ctx, barX, barY, barWidth, barHeight, 10);
            ctx.fill();
            
            // Bar progress
            if (progress > 0) {
                ctx.fillStyle = accentColor;
                roundedRect(ctx, barX, barY, barWidth * progress, barHeight, 10);
                ctx.fill();
            }
            
            textY += 45;
            
            // Draw bottom stats (Messages, Total XP, Daily XP) - like rank card
            ctx.font = '14px "Poppins", sans-serif';
            ctx.fillStyle = '#72767D';
            
            const statsSpacing = 180;
            ctx.fillText(`Messages: ${messagesCount.toLocaleString()}`, textX, textY);
            ctx.fillText(`Total XP: ${totalXP.toLocaleString()}`, textX + statsSpacing, textY);
            ctx.fillText(`Daily XP: ${dailyXP.toLocaleString()}`, textX + statsSpacing * 2, textY);
            
            // ========== DESCRIPTION SECTION (BOTTOM) ==========
            
            // Draw separator line
            const separatorY = 225;
            ctx.fillStyle = accentColor;
            ctx.fillRect(30, separatorY, canvas.width - 60, 3);
            
            // Description area
            const descStartY = separatorY + 30;
            const descPadding = 40;
            
            // Draw "About Me" label
            ctx.font = 'bold 20px "Poppins Bold", sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('📝 About Me', descPadding, descStartY);
            
            // Draw bio/description
            ctx.font = '16px "Poppins", sans-serif';
            ctx.fillStyle = '#DCDDDE';
            
            const description = economy.profile.description || economy.profile.bio || 'No description set. Use `setprofile description <text>` to add one!';
            const descLines = wrapText(ctx, description, canvas.width - (descPadding * 2));
            const maxDescLines = 5;
            let descY = descStartY + 35;
            
            for (let i = 0; i < Math.min(descLines.length, maxDescLines); i++) {
                const line = descLines[i] + (i === maxDescLines - 1 && descLines.length > maxDescLines ? '...' : '');
                ctx.fillText(line, descPadding, descY);
                descY += 26;
            }
            
            // Draw economy stats at bottom
            const bottomY = canvas.height - 30;
            ctx.font = '14px "Poppins", sans-serif';
            ctx.fillStyle = '#72767D';
            
            // Coins
            ctx.fillStyle = '#FFD700';
            ctx.fillText('💰', descPadding, bottomY);
            ctx.fillStyle = '#DCDDDE';
            ctx.fillText(`${economy.coins.toLocaleString()} coins`, descPadding + 25, bottomY);
            
            // Streak
            ctx.fillStyle = '#FF6B6B';
            ctx.fillText('🔥', descPadding + 180, bottomY);
            ctx.fillStyle = '#DCDDDE';
            ctx.fillText(`${economy.daily.streak || 0} day streak`, descPadding + 205, bottomY);
            
            // Reputation
            ctx.fillStyle = '#FFC0CB';
            ctx.fillText('⭐', descPadding + 360, bottomY);
            ctx.fillStyle = '#DCDDDE';
            ctx.fillText(`${economy.reputation || 0} rep`, descPadding + 385, bottomY);
            
            // Total Earned
            ctx.fillStyle = '#72767D';
            ctx.fillText(`Total Earned: ${economy.stats.totalEarned.toLocaleString()}`, descPadding + 520, bottomY);
            
            // Draw badges in top right if enabled
            if (economy.profile.showBadges !== false && economy.inventory.badges.length > 0) {
                const badgeY = 50;
                const badgeSize = 28;
                const badgeSpacing = 35;
                let badgeX = canvas.width - 50;
                
                for (let i = 0; i < Math.min(economy.inventory.badges.length, 5); i++) {
                    ctx.font = '22px sans-serif';
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText('🏅', badgeX - badgeSize / 2, badgeY);
                    badgeX -= badgeSpacing;
                }
            }
            
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
