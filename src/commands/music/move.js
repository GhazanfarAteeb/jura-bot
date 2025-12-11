import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'move',
    description: 'Move a song to a different position in the queue',
    usage: 'move <from> <to>',
    category: 'music',
    aliases: ['mv'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        
        if (queue.tracks.data.length === 0) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'The queue is empty!')]
            });
        }
        
        const from = parseInt(args[0]);
        const to = parseInt(args[1]);
        
        if (!from || !to) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide both `from` and `to` positions! Example: `!move 3 1`')]
            });
        }
        
        if (from < 1 || from > queue.tracks.data.length || to < 1 || to > queue.tracks.data.length) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Both positions must be between 1 and ${queue.tracks.data.length}!`)]
            });
        }
        
        if (from === to) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'The positions are the same!')]
            });
        }
        
        const track = queue.tracks.data[from - 1];
        
        // Remove track from original position
        queue.node.remove(track);
        
        // Insert at new position
        queue.node.insert(track, to - 1);
        
        message.reply({
            embeds: [await successEmbed(guildId, '↔️ Song Moved', `Moved **${track.title}** from position **${from}** to **${to}**`)]
        });
    }
};
