import { players } from '../../utils/shoukaku.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'resume',
    description: 'Resume the paused song',
    usage: 'resume',
    category: 'music',
    aliases: ['unpause'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        const playerData = players.get(guildId);
        
        if (!playerData || !playerData.nowPlaying) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Not Playing', 'There is no song currently playing!')]
            });
        }
        
        if (!playerData.player.paused) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Not Paused', 'The music is not paused!')]
            });
        }
        
        playerData.player.setPaused(false);
        
        message.reply({
            embeds: [await successEmbed(guildId, '▶️ Resumed', 'Music has been resumed.')]
        });
    }
};
