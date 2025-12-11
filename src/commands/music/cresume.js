import { getQueue, checkBotInVoice, checkSameVoiceChannel } from '../../utils/customMusicPlayer.js';

export default {
    name: 'cresume',
    description: 'Resume the paused song',
    category: 'music',
    
    async execute(message) {
        const botCheck = checkBotInVoice(message);
        if (botCheck.error) {
            return message.reply(botCheck.message);
        }
        
        const sameCheck = checkSameVoiceChannel(message);
        if (sameCheck.error) {
            return message.reply(sameCheck.message);
        }
        
        const queue = getQueue(message.guild.id);
        queue.resume();
        
        return message.reply('▶️ Resumed the music!');
    }
};
