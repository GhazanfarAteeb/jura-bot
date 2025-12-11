import { getQueue, checkBotInVoice, checkSameVoiceChannel, deleteQueue } from '../../utils/customMusicPlayer.js';

export default {
    name: 'cstop',
    description: 'Stop the music and clear the queue',
    category: 'music',
    aliases: ['cstop', 'cleave'],
    
    async execute(message) {
        // Check if bot is in voice
        const botCheck = checkBotInVoice(message);
        if (botCheck.error) {
            return message.reply(botCheck.message);
        }
        
        // Check same voice channel
        const sameCheck = checkSameVoiceChannel(message);
        if (sameCheck.error) {
            return message.reply(sameCheck.message);
        }
        
        // Get queue and stop
        const queue = getQueue(message.guild.id);
        queue.stop();
        queue.disconnect();
        deleteQueue(message.guild.id);
        
        return message.reply('⏹️ Stopped the music and left the voice channel!');
    }
};
