import { EmbedBuilder } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';

// Store edited messages (in-memory cache)
const editedMessages = new Map(); // channelId -> { oldContent, newContent, author, editedAt }

export function cacheEditedMessage(oldMessage, newMessage) {
    if (newMessage.author?.bot) return;
    
    editedMessages.set(newMessage.channel.id, {
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        author: newMessage.author,
        editedAt: new Date(),
        messageId: newMessage.id,
        messageUrl: newMessage.url
    });
    
    // Auto-clear after 5 minutes
    setTimeout(() => {
        const cached = editedMessages.get(newMessage.channel.id);
        if (cached && cached.messageId === newMessage.id) {
            editedMessages.delete(newMessage.channel.id);
        }
    }, 5 * 60 * 1000);
}

export default {
    name: 'editsnipe',
    aliases: ['esnipe', 'es'],
    description: 'Show the last edited message in this channel',
    usage: 'editsnipe',
    category: 'utility',
    cooldown: 5,
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        
        const edited = editedMessages.get(message.channel.id);
        
        if (!edited) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Nothing to snipe! No recently edited messages found.')]
            });
        }
        
        const timeSince = Math.floor((Date.now() - edited.editedAt.getTime()) / 1000);
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
                name: edited.author.tag,
                iconURL: edited.author.displayAvatarURL({ extension: 'png', size: 64 })
            })
            .setColor('#FFA500')
            .addFields(
                {
                    name: '📝 Before',
                    value: edited.oldContent?.substring(0, 1024) || '*No content*',
                    inline: false
                },
                {
                    name: '✏️ After',
                    value: edited.newContent?.substring(0, 1024) || '*No content*',
                    inline: false
                }
            )
            .setFooter({ text: `Edited ${timeText}` })
            .setTimestamp(edited.editedAt);
        
        if (edited.messageUrl) {
            embed.addFields({
                name: '🔗 Jump to Message',
                value: `[Click here](${edited.messageUrl})`,
                inline: false
            });
        }
        
        message.reply({ embeds: [embed] });
    }
};

export { editedMessages };
