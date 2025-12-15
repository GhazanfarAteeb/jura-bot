import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class ClearQueue extends Command {
    constructor(client) {
        super(client, {
            name: 'clear',
            description: 'Clears the queue (keeps current track playing)',
            usage: 'clear',
            category: 'Music',
            aliases: ['clearqueue', 'cq']
        });
    }

    async run(client, ctx, args) {
        const message = ctx.message;
        logger.info(`[Clear Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);
        
        const queue = this.client.music.getQueue(message.guild.id);
        
        if (!queue) {
            logger.warn(`[Clear Command] No queue found for guild ${message.guild.id}`);
            return message.reply('There is no music playing right now.');
        }

        if (message.member.voice.channelId !== queue.channelId) {
            logger.warn(`[Clear Command] User ${message.author.tag} not in same voice channel`);
            return message.reply('You need to be in the same voice channel as the bot!');
        }

        if (queue.queue.length === 0) {
            logger.warn(`[Clear Command] Queue already empty for guild ${message.guild.id}`);
            return message.reply('The queue is already empty!');
        }

        const clearedCount = queue.queue.length;
        logger.info(`[Clear Command] Clearing ${clearedCount} tracks from guild ${message.guild.id}`);
        queue.clear();
        logger.info(`[Clear Command] Successfully cleared ${clearedCount} tracks in guild ${message.guild.id}`);
        message.reply(`🗑️ Cleared **${clearedCount}** tracks from the queue!`);
    }
}
