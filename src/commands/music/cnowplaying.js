import { EmbedBuilder } from 'discord.js';
import { getQueue, hasQueue, checkBotInVoice } from '../../utils/customMusicPlayer.js';

export default {
    name: 'cnowplaying',
    description: 'Show the currently playing song',
    category: 'music',
    aliases: ['cnp', 'ccurrent'],
    
    async execute(message) {
        // Check if bot is in voice
        const botCheck = checkBotInVoice(message);
        if (botCheck.error) {
            return message.reply(botCheck.message);
        }
        
        if (!hasQueue(message.guild.id)) {
            return message.reply('❌ Nothing is playing!');
        }
        
        const queue = getQueue(message.guild.id);
        
        if (!queue.currentSong) {
            return message.reply('❌ Nothing is playing!');
        }
        
        const song = queue.currentSong;
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Now Playing')
            .setDescription(`**${song.title}**`)
            .addFields(
                { name: 'Artist', value: song.author || 'Unknown', inline: true },
                { name: 'Duration', value: song.duration || 'Unknown', inline: true },
                { name: 'Queue Length', value: `${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''}`, inline: true }
            )
            .setThumbnail(song.thumbnail || null)
            .setFooter({ text: `Playing in ${message.guild.name}` });
        
        return message.reply({ embeds: [embed] });
    }
};
