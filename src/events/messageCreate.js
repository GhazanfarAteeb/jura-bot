import { Events, AttachmentBuilder } from 'discord.js';
import Guild from '../models/Guild.js';
import Member from '../models/Member.js';
import ModLog from '../models/ModLog.js';
import Level from '../models/Level.js';
import Economy from '../models/Economy.js';
import { hasInviteLink, extractInviteCode } from '../utils/helpers.js';
import { warningEmbed, modLogEmbed, GLYPHS } from '../utils/embeds.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load fonts
try {
    GlobalFonts.registerFromPath(join(__dirname, '../assets/fonts/Poppins-Bold.ttf'), 'Poppins Bold');
    GlobalFonts.registerFromPath(join(__dirname, '../assets/fonts/Poppins-Regular.ttf'), 'Poppins Regular');
} catch (error) {
    console.log('Note: Custom fonts not loaded, using default fonts');
}

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;
        
        try {
            const guildId = message.guild.id;
            const guildConfig = await Guild.getGuild(guildId, message.guild.name);
            
            // XP System - Award XP for messages
            if (guildConfig.features.levelSystem.enabled) {
                await handleXPGain(message, guildConfig, client);
            }
            
            // Check for invite links
            if (guildConfig.features.inviteVerification.enabled && hasInviteLink(message.content)) {
                await handleInviteLink(message, guildConfig);
            }
            
            // Handle commands
            const prefix = guildConfig.prefix.toLowerCase();
            const messageContent = message.content.toLowerCase();
            
            // Check if message starts with prefix (case-insensitive)
            if (!messageContent.startsWith(prefix)) return;
            
            // Extract command and args, handling optional space after prefix
            const contentAfterPrefix = message.content.slice(prefix.length).trim();
            if (!contentAfterPrefix) return;
            
            const args = contentAfterPrefix.split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Get command
            const command = client.commands.get(commandName) || 
                           client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            
            if (!command) return;
            
            // Check permissions
            if (command.permissions) {
                const hasPerms = command.permissions.every(perm => 
                    message.member.permissions.has(perm)
                );
                
                if (!hasPerms) {
                    const embed = await warningEmbed(guildId, 'Missing Permissions',
                        `${GLYPHS.LOCK} You don't have permission to use this command.`
                    );
                    return message.reply({ embeds: [embed] });
                }
            }
            
            // Check cooldowns
            if (command.cooldown) {
                const { cooldowns } = client;
                
                if (!cooldowns.has(command.name)) {
                    cooldowns.set(command.name, new Map());
                }
                
                const now = Date.now();
                const timestamps = cooldowns.get(command.name);
                const cooldownAmount = (command.cooldown || 3) * 1000;
                
                if (timestamps.has(message.author.id)) {
                    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
                    
                    if (now < expirationTime) {
                        const timeLeft = Math.ceil((expirationTime - now) / 1000);
                        
                        // Format time left nicely
                        let timeString;
                        if (timeLeft >= 60) {
                            const minutes = Math.floor(timeLeft / 60);
                            const seconds = timeLeft % 60;
                            timeString = `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
                        } else {
                            timeString = `${timeLeft} second${timeLeft !== 1 ? 's' : ''}`;
                        }
                        
                        const embed = await warningEmbed(guildId, '⏰ Cooldown Active',
                            `${GLYPHS.LOADING} Please wait **${timeString}** before using \`${command.name}\` again.\n\n⏱️ Available <t:${Math.floor(expirationTime / 1000)}:R>`
                        );
                        return message.reply({ embeds: [embed] });
                    }
                }
                
                timestamps.set(message.author.id, now);
                setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            }
            
            // Execute command
            try {
                const startTime = Date.now();
                await command.execute(message, args, client);
                const duration = Date.now() - startTime;
                
                logger.command(command.name, message.author, message.guild, true);
                logger.performance(`Command: ${command.name}`, duration, {
                    user: message.author.tag,
                    guild: message.guild.name
                });
            } catch (cmdError) {
                logger.command(command.name, message.author, message.guild, false, cmdError);
                logger.error(`Command execution failed: ${command.name}`, cmdError);
                throw cmdError;
            }
            
        } catch (error) {
            console.error('Error in messageCreate event:', error);
            
            try {
                const { errorEmbed } = await import('../utils/embeds.js');
                const embed = await errorEmbed(message.guild.id, 'Error',
                    'An error occurred while executing this command.'
                );
                await message.reply({ embeds: [embed] });
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }
    }
};

async function handleInviteLink(message, guildConfig) {
    const inviteCodes = extractInviteCode(message.content);
    
    // Check if any invite is whitelisted
    const whitelisted = inviteCodes.some(code => 
        guildConfig.features.inviteVerification.whitelist.includes(code)
    );
    
    if (whitelisted) return;
    
    // Log invite in member data
    try {
        const memberData = await Member.findOne({
            userId: message.author.id,
            guildId: message.guild.id
        });
        
        if (memberData) {
            for (const code of inviteCodes) {
                memberData.inviteLinks.push({
                    link: `discord.gg/${code}`,
                    code,
                    timestamp: new Date()
                });
            }
            await memberData.save();
        }
    } catch (error) {
        console.error('Error logging invite link:', error);
    }
    
    // Take action based on configuration
    const action = guildConfig.features.inviteVerification.action;
    
    if (action === 'delete' || action === 'warn' || action === 'kick') {
        try {
            await message.delete();
            
            const { warningEmbed, GLYPHS } = await import('../utils/embeds.js');
            const embed = await warningEmbed(message.guild.id, 'Invite Link Detected',
                `${GLYPHS.SHIELD} ${message.author}, posting invite links is not allowed here.`
            );
            const warningMsg = await message.channel.send({ embeds: [embed] });
            
            // Delete warning after 5 seconds
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
            
        } catch (error) {
            console.error('Error deleting invite message:', error);
        }
    }
    
    if (action === 'warn') {
        // Add warning to member
        try {
            const memberData = await Member.findOne({
                userId: message.author.id,
                guildId: message.guild.id
            });
            
            if (memberData) {
                memberData.warnings.push({
                    moderatorId: message.client.user.id,
                    moderatorTag: message.client.user.tag,
                    reason: 'Posted invite link',
                    timestamp: new Date()
                });
                await memberData.save();
            }
        } catch (error) {
            console.error('Error adding warning:', error);
        }
    }
    
    if (action === 'kick') {
        try {
            await message.member.kick('Posted invite link (auto-moderation)');
        } catch (error) {
            console.error('Error kicking member:', error);
        }
    }
    
    // Log to mod log
    if (guildConfig.channels.modLog) {
        try {
            const modLogChannel = message.guild.channels.cache.get(guildConfig.channels.modLog);
            if (modLogChannel) {
                const caseNumber = await ModLog.getNextCaseNumber(message.guild.id);
                
                const logEmbed = await modLogEmbed(message.guild.id, 'invite_delete', {
                    caseNumber,
                    targetTag: message.author.tag,
                    targetId: message.author.id,
                    moderatorTag: 'Auto-Mod',
                    reason: `Posted invite link: ${inviteCodes.join(', ')}`
                });
                
                await modLogChannel.send({ embeds: [logEmbed] });
                
                // Save to database
                await ModLog.create({
                    guildId: message.guild.id,
                    caseNumber,
                    action: 'invite_delete',
                    moderatorId: message.client.user.id,
                    moderatorTag: 'Auto-Mod',
                    targetId: message.author.id,
                    targetTag: message.author.tag,
                    reason: `Posted invite link: ${inviteCodes.join(', ')}`,
                    channelId: message.channel.id
                });
            }
        } catch (error) {
            console.error('Error logging to mod log:', error);
        }
    }
}

// XP Handler Function
async function handleXPGain(message, guildConfig, client) {
    try {
        const cooldown = guildConfig.features.levelSystem.cooldown || 60;
        const xpAmount = guildConfig.features.levelSystem.xpPerMessage || 10;
        
        // Get or create user level data
        let levelData = await Level.findOne({
            userId: message.author.id,
            guildId: message.guild.id
        });
        
        if (!levelData) {
            levelData = await Level.create({
                userId: message.author.id,
                guildId: message.guild.id,
                username: message.author.username
            });
        }
        
        // Check cooldown
        if (levelData.lastMessageTime) {
            const timeSinceLastMessage = Date.now() - levelData.lastMessageTime.getTime();
            if (timeSinceLastMessage < cooldown * 1000) {
                return; // Still on cooldown
            }
        }
        
        // Update last message time
        levelData.lastMessageTime = new Date();
        levelData.messageCount++;
        
        // Random XP (80-120% of base)
        const randomXP = Math.floor(xpAmount * (0.8 + Math.random() * 0.4));
        
        // Add XP and check for level up
        const leveledUp = levelData.addXP(randomXP);
        await levelData.save();
        
        // Handle level ups
        if (leveledUp.length > 0 && guildConfig.features.levelSystem.announceLevelUp) {
            for (const newLevel of leveledUp) {
                await sendLevelUpMessage(message, levelData, newLevel, guildConfig, client);
                
                // Check for role rewards
                const roleReward = guildConfig.features.levelSystem.roleRewards.find(
                    r => r.level === newLevel
                );
                
                if (roleReward && roleReward.roleId) {
                    const role = message.guild.roles.cache.get(roleReward.roleId);
                    if (role) {
                        try {
                            await message.member.roles.add(role);
                        } catch (error) {
                            console.error('Error adding role reward:', error);
                        }
                    }
                }
            }
        }
        
        // Award coins if economy is enabled
        const coinsPerMessage = Math.floor(randomXP / 2); // 5 coins per message on average
        if (coinsPerMessage > 0) {
            const economy = await Economy.getEconomy(message.author.id, message.guild.id);
            economy.messagesCount = (economy.messagesCount || 0) + 1;
            await economy.addCoins(coinsPerMessage, 'Message XP');
            await economy.save();
        }
        
    } catch (error) {
        console.error('Error handling XP gain:', error);
    }
}

// Send visual level up message
async function sendLevelUpMessage(message, levelData, newLevel, guildConfig, client) {
    try {
        // Create canvas
        const canvas = createCanvas(900, 300);
        const ctx = canvas.getContext('2d');
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 900, 300);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 900, 300);
        
        // Add shine effect
        const shine = ctx.createLinearGradient(0, 0, 900, 100);
        shine.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shine;
        ctx.fillRect(0, 0, 900, 100);
        
        // Load and draw avatar
        try {
            const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarURL);
            
            // Draw circular avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(150, 150, 80, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 70, 70, 160, 160);
            ctx.restore();
            
            // Avatar border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(150, 150, 80, 0, Math.PI * 2);
            ctx.stroke();
        } catch (error) {
            console.error('Error loading avatar:', error);
        }
        
        // "LEVEL UP!" text
        ctx.font = 'bold 48px "Poppins Bold", Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('LEVEL UP!', 270, 100);
        
        // Username
        ctx.font = 'bold 36px "Poppins Bold", Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(message.author.username, 270, 150);
        
        // Level info
        ctx.font = '28px "Poppins Regular", Arial';
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText(`Level ${newLevel} unlocked — @${message.author.username} has`, 270, 190);
        ctx.fillText('taken another step towards mastery.', 270, 225);
        
        // Decorative elements - stars
        ctx.fillStyle = '#ffffff';
        const stars = [
            { x: 800, y: 50, size: 20 },
            { x: 850, y: 100, size: 15 },
            { x: 820, y: 150, size: 18 },
            { x: 780, y: 80, size: 12 }
        ];
        
        stars.forEach(star => {
            ctx.font = `${star.size}px Arial`;
            ctx.fillText('✨', star.x, star.y);
        });
        
        // Create attachment
        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
            name: 'levelup.png'
        });
        
        // Send to designated channel or current channel
        let targetChannel = message.channel;
        if (guildConfig.features.levelSystem.levelUpChannel) {
            const levelUpChannel = message.guild.channels.cache.get(
                guildConfig.features.levelSystem.levelUpChannel
            );
            if (levelUpChannel) {
                targetChannel = levelUpChannel;
            }
        }
        
        await targetChannel.send({
            content: `🎉 <@${message.author.id}>`,
            files: [attachment]
        });
        
    } catch (error) {
        console.error('Error creating level up image:', error);
        
        // Fallback to text message
        const targetChannel = guildConfig.features.levelSystem.levelUpChannel
            ? message.guild.channels.cache.get(guildConfig.features.levelSystem.levelUpChannel)
            : message.channel;
        
        if (targetChannel) {
            const msg = guildConfig.features.levelSystem.levelUpMessage
                .replace('{user}', `<@${message.author.id}>`)
                .replace('{level}', newLevel);
            
            await targetChannel.send(msg);
        }
    }
}
