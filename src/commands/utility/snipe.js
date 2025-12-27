// COMMAND DISABLED - Commented out by request
/*
import { EmbedBuilder } from 'discord.js';
import { infoEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

// Store deleted messages (in-memory cache)
// This will be populated by the messageLogging event
const deletedMessages = new Map(); // channelId -> { message, deletedAt }

export function cacheDeletedMessage(message) {
    if (message.author?.bot) return;
    
    deletedMessages.set(message.channel.id, {
        content: message.content,
        author: message.author,
        attachments: [...message.attachments.values()],
        deletedAt: new Date(),
        messageId: message.id
    });
    
    // Auto-clear after 5 minutes
    setTimeout(() => {
        const cached = deletedMessages.get(message.channel.id);
        if (cached && cached.messageId === message.id) {
            deletedMessages.delete(message.channel.id);
        }
    }, 5 * 60 * 1000);
}

export default {
    name: 'snipe',
    aliases: ['s'],
    description: 'Show the last deleted message in this channel',
    usage: 'snipe',
    category: 'utility',
    cooldown: 5,
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        
        const deleted = deletedMessages.get(message.channel.id);
        
        if (!deleted) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Nothing to snipe! No recently deleted messages found.')]
            });
        }
        
        const timeSince = Math.floor((Date.now() - deleted.deletedAt.getTime()) / 1000);
        let timeText;
        if (timeSince < 60) {
            timeText = `${timeSince} seconds ago`;
        } else if (timeSince < 3600) {
            timeText = `${Math.floor(timeSince / 60)} minutes ago`;
        } else {
            timeText = `${Math.floor(timeSince / 3600)} hours ago`;
        }
        
        const embed = new EmbedBuilder()
            .setAuthor({
                name: deleted.author.tag,
                iconURL: deleted.author.displayAvatarURL({ extension: 'png', size: 64 })
            })
            .setDescription(deleted.content || '*No text content*')
            .setColor('#FF6B6B')
            .setFooter({ text: `Deleted ${timeText}` })
            .setTimestamp(deleted.deletedAt);
        
        // Add attachment info
        if (deleted.attachments.length > 0) {
            const attachmentList = deleted.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({
                name: '📎 Attachments',
                value: attachmentList.substring(0, 1024)
            });
            
            // Show first image if exists
            const firstImage = deleted.attachments.find(a => 
                a.contentType?.startsWith('image/') || 
                a.url.match(/\.(png|jpg|jpeg|gif|webp)$/i)
            );
            if (firstImage) {
                embed.setImage(firstImage.url);
            }
        }
        
        message.reply({ embeds: [embed] });
    }
};

export { deletedMessages };
*/
