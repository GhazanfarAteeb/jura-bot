import { EmbedBuilder } from 'discord.js';
import { getQueue, hasQueue, checkBotInVoice } from '../../utils/customMusicPlayer.js';

export default {
    name: 'cqueue',
    description: 'Show the current music queue',
    category: 'music',
    aliases: ['cq'],
    
    async execute(message) {
        // Check if bot is in voice
        const botCheck = checkBotInVoice(message);
        if (botCheck.error) {
            return message.reply(botCheck.message);
        }
        
        if (!hasQueue(message.guild.id)) {
            return message.reply('❌ There is no queue!');
        }
        
        const queue = getQueue(message.guild.id);
        
        if (!queue.currentSong && queue.songs.length === 0) {
            return message.reply('❌ The queue is empty!');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Music Queue')
            .setFooter({ text: `${message.guild.name}` });
        
        // Current song
        if (queue.currentSong) {
            embed.addFields({
                name: '🎵 Now Playing',
                value: `**${queue.currentSong.title}** by ${queue.currentSong.author}\n${queue.currentSong.duration || 'Unknown duration'}`,
                inline: false
            });
        }
        
        // Queue
        if (queue.songs.length > 0) {
            const queueList = queue.songs
                .slice(0, 10)
                .map((song, index) => `${index + 1}. **${song.title}** by ${song.author}`)
                .join('\n');
            
            embed.addFields({
                name: `📋 Up Next (${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''})`,
                value: queueList + (queue.songs.length > 10 ? `\n... and ${queue.songs.length - 10} more` : ''),
                inline: false
            });
        }
        
        return message.reply({ embeds: [embed] });
    }
};
