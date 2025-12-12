import { players } from '../../utils/shoukaku.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'stop',
    aliases: ['leave', 'disconnect', 'dc'],
    description: 'Stop the music and clear the queue',
    usage: 'stop',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        const playerData = players.get(guildId);
        
        if (!playerData) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Not Playing', 'I am not currently playing anything!')]
            });
        }
        
        try {
            // Stop playback and clear queue
            playerData.player.stopTrack();
            playerData.queue = [];
            playerData.nowPlaying = null;
            
            // Disconnect from voice channel
            await playerData.player.connection.disconnect();
            
            // Remove player data
            players.delete(guildId);
            
            return message.reply({
                embeds: [await successEmbed(guildId, '👋 Stopped', 'Stopped playing and disconnected from voice channel.')]
            });
        } catch (error) {
            console.error('Error in stop command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Error', `Failed to stop: ${error.message}`)]
            });
        }
    }
};
