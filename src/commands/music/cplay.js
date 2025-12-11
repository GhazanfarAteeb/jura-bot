import { EmbedBuilder } from 'discord.js';
import { getQueue, checkVoiceChannel, checkSameVoiceChannel } from '../../utils/customMusicPlayer.js';
import play from 'play-dl';

export default {
    name: 'cplay',
    description: 'Play a song using custom player',
    category: 'music',
    usage: 'cplay <song name or URL>',
    aliases: ['cp'],
    
    async execute(message, args) {
        try {
            // Check if user is in voice channel
            const voiceCheck = checkVoiceChannel(message);
            if (voiceCheck.error) {
                return message.reply(voiceCheck.message);
            }
            
            // Check if bot is in same voice channel
            const sameChannelCheck = checkSameVoiceChannel(message);
            if (sameChannelCheck.error) {
                return message.reply(sameChannelCheck.message);
            }
            
            // Check if query provided
            if (!args || args.length === 0) {
                return message.reply('❌ Please provide a song name or URL!');
            }
            
            const query = args.join(' ');
            const voiceChannel = message.member.voice.channel;
            
            await message.reply('🔍 Searching...');
            
            // Search for the song
            let songInfo;
            if (query.includes('spotify.com')) {
                // Spotify URL
                songInfo = await this.searchSpotify(query);
            } else if (query.includes('youtube.com') || query.includes('youtu.be')) {
                // YouTube URL
                songInfo = await this.searchYouTube(query);
            } else {
                // Search YouTube
                songInfo = await this.searchYouTube(query);
            }
            
            if (!songInfo) {
                return message.reply('❌ Could not find that song!');
            }
            
            // Get or create queue
            const queue = getQueue(message.guild.id);
            
            // Connect to voice if not connected
            if (!queue.connection) {
                await queue.connect(voiceChannel);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            }
            
            // Add song to queue
            queue.addSong(songInfo);
            
            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎵 Added to Queue')
                .setDescription(`**${songInfo.title}**`)
                .addFields(
                    { name: 'Artist', value: songInfo.author || 'Unknown', inline: true },
                    { name: 'Duration', value: songInfo.duration || 'Unknown', inline: true },
                    { name: 'Position', value: `${queue.songs.length}`, inline: true }
                )
                .setThumbnail(songInfo.thumbnail || null)
                .setFooter({ text: `Requested by ${message.author.tag}` });
            
            await message.channel.send({ embeds: [embed] });
            
            // Start playing if not already playing
            if (!queue.isPlaying && queue.songs.length === 1) {
                await queue.playNext();
            }
            
        } catch (error) {
            console.error('❌ Error in cplay command:', error);
            return message.reply('❌ An error occurred while trying to play the song.');
        }
    },
    
    async searchSpotify(url) {
        try {
            const spotifyData = await play.spotify(url);
            return {
                title: spotifyData.name,
                author: spotifyData.artists?.[0]?.name || 'Unknown',
                url: url,
                thumbnail: spotifyData.thumbnail?.url || null,
                duration: this.formatDuration(spotifyData.durationInMs),
                durationMs: spotifyData.durationInMs
            };
        } catch (error) {
            console.error('Error searching Spotify:', error);
            return null;
        }
    },
    
    async searchYouTube(query) {
        try {
            let videoInfo;
            
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                // Direct URL
                videoInfo = await play.video_info(query);
                videoInfo = videoInfo.video_details;
            } else {
                // Search query
                const searchResults = await play.search(query, { limit: 1, source: { youtube: 'video' } });
                if (!searchResults || searchResults.length === 0) {
                    return null;
                }
                videoInfo = searchResults[0];
            }
            
            return {
                title: videoInfo.title,
                author: videoInfo.channel?.name || 'Unknown',
                url: videoInfo.url,
                thumbnail: videoInfo.thumbnails?.[0]?.url || null,
                duration: this.formatDuration(videoInfo.durationInSec * 1000),
                durationMs: videoInfo.durationInSec * 1000
            };
        } catch (error) {
            console.error('Error searching YouTube:', error);
            return null;
        }
    },
    
    formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
};
