import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class Skip extends Command {
    constructor(client) {
        super(client, {
            name: 'skip',
            description: 'Skips the current song',
            usage: 'skip',
            category: 'Music',
            aliases: ['s', 'next']
        });
    }

    async run(client, ctx, args) {
        const message = ctx.message;
        logger.info(`[Skip Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);
        
        const queue = this.client.music.getQueue(message.guild.id);
        if (!queue) {
            logger.warn(`[Skip Command] No queue found for guild ${message.guild.id}`);
            return message.reply('There is no music playing right now.');
        }

        if (message.member.voice.channelId !== queue.channelId) {
            logger.warn(`[Skip Command] User ${message.author.tag} not in same voice channel`);
            return message.reply('You need to be in the same voice channel as the bot!');
        }

        if (!queue.player) {
            logger.error(`[Skip Command] Player not ready for guild ${message.guild.id}`);
            return message.reply('Player is not ready yet. Please try again.');
        }
        
        logger.debug(`[Skip Command] Current track: ${queue.current?.info?.title || 'unknown'}`);
        logger.debug(`[Skip Command] Queue size: ${queue.queue.length}`);
        
        // Kazagumo-style skip method
        const skipped = queue.skip();
        if (skipped) {
            logger.info(`[Skip Command] Successfully skipped track in guild ${message.guild.id}`);
            message.reply('⏭️ Skipped the current track.');
        } else {
            logger.error(`[Skip Command] Failed to skip track in guild ${message.guild.id}`);
            message.reply('Failed to skip the track.');
        }
    }
}
