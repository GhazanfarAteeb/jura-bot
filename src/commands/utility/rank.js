import { AttachmentBuilder } from 'discord.js';
import Level from '../../models/Level.js';
import { errorEmbed } from '../../utils/embeds.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    name: 'rank',
    aliases: ['level', 'xp'],
    description: 'View your or another user\'s rank card',
    usage: 'rank [@user]',
    category: 'utility',
    cooldown: 5,
    
    async execute(message, args) {
        const guildId = message.guild.id;
        const targetUser = message.mentions.users.first() || message.author;
        
        try {
            // Get level data
            const levelData = await Level.findOne({
                userId: targetUser.id,
                guildId: message.guild.id
            });
            
            if (!levelData) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `${targetUser.username} hasn't gained any XP yet!`)]
                });
            }
            
            // Get rank
            const leaderboard = await Level.getLeaderboard(guildId, 1000);
            const rank = leaderboard.findIndex(u => u.userId === targetUser.id) + 1;
            
            // Create rank card
            const canvas = createCanvas(900, 300);
            const ctx = canvas.getContext('2d');
            
            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, 900, 300);
            gradient.addColorStop(0, '#2C2F33');
            gradient.addColorStop(1, '#23272A');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 900, 300);
            
            // Accent bar
            const accentGradient = ctx.createLinearGradient(0, 0, 900, 0);
            accentGradient.addColorStop(0, '#667eea');
            accentGradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = accentGradient;
            ctx.fillRect(0, 0, 900, 10);
            
            // Load and draw avatar
            try {
                const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
                const avatar = await loadImage(avatarURL);
                
                // Draw circular avatar with glow
                ctx.shadowColor = '#667eea';
                ctx.shadowBlur = 20;
                ctx.save();
                ctx.beginPath();
                ctx.arc(120, 150, 70, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 50, 80, 140, 140);
                ctx.restore();
                ctx.shadowBlur = 0;
                
                // Avatar border
                ctx.strokeStyle = '#667eea';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(120, 150, 70, 0, Math.PI * 2);
                ctx.stroke();
            } catch (error) {
                console.error('Error loading avatar:', error);
            }
            
            // Username
            ctx.font = 'bold 36px "Poppins Bold", Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(targetUser.username, 230, 90);
            
            // Rank and Level
            ctx.font = 'bold 24px "Poppins Bold", Arial';
            ctx.fillStyle = '#b9bbbe';
            ctx.fillText(`Rank #${rank}`, 230, 130);
            ctx.fillText(`Level ${levelData.level}`, 230, 165);
            
            // XP Progress
            const xpForNext = levelData.xpForNextLevel();
            ctx.font = '20px "Poppins Regular", Arial';
            ctx.fillStyle = '#b9bbbe';
            ctx.fillText(`${levelData.xp} / ${xpForNext} XP`, 230, 200);
            
            // Progress bar background
            ctx.fillStyle = '#40444b';
            ctx.beginPath();
            ctx.roundRect(230, 215, 620, 35, 17.5);
            ctx.fill();
            
            // Progress bar fill
            const progress = levelData.xp / xpForNext;
            const progressGradient = ctx.createLinearGradient(230, 0, 850, 0);
            progressGradient.addColorStop(0, '#667eea');
            progressGradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = progressGradient;
            ctx.beginPath();
            ctx.roundRect(230, 215, 620 * progress, 35, 17.5);
            ctx.fill();
            
            // Stats at bottom
            ctx.font = '18px "Poppins Regular", Arial';
            ctx.fillStyle = '#72767d';
            ctx.fillText(`Messages: ${levelData.messageCount}`, 230, 280);
            ctx.fillText(`Total XP: ${levelData.totalXP}`, 450, 280);
            ctx.fillText(`Daily XP: ${levelData.dailyXP}`, 670, 280);
            
            // Create attachment
            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
                name: 'rank.png'
            });
            
            await message.reply({ files: [attachment] });
            
        } catch (error) {
            console.error('Error creating rank card:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to create rank card. Please try again later.')]
            });
        }
    }
};
