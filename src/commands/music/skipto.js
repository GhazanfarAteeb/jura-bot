import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class SkipTo extends Command {
    constructor(client) {
        super(client, {
            name: 'skipto',
            description: 'Skips to a specific track in the queue',
            usage: 'skipto <position>',
            category: 'Music',
            aliases: ['st', 'jumpto']
        });
    }

    async run(client, ctx, args) {
        const message = ctx.message;
        logger.info(`[SkipTo Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);
        
        const queue = this.client.music.getQueue(message.guild.id);
        
        if (!queue) {
            logger.warn(`[SkipTo Command] No queue found for guild ${message.guild.id}`);
            return message.reply('There is no music playing right now.');
        }

        if (message.member.voice.channelId !== queue.channelId) {
            logger.warn(`[SkipTo Command] User ${message.author.tag} not in same voice channel`);
            return message.reply('You need to be in the same voice channel as the bot!');
        }

        if (!args[0] || isNaN(args[0])) {
            logger.warn(`[SkipTo Command] Invalid argument provided: ${args[0]}`);
            return message.reply('Please provide a valid track number!');
        }

        const position = parseInt(args[0]);
        logger.debug(`[SkipTo Command] Target position: ${position}, queue size: ${queue.queue.length}`);

        if (position < 1 || position > queue.queue.length) {
            logger.warn(`[SkipTo Command] Position ${position} out of range (1-${queue.queue.length})`);
            return message.reply(`Invalid position! Queue has ${queue.queue.length} tracks.`);
        }

        // Remove all tracks before the target position
        const skipped = queue.queue.splice(0, position - 1);
        logger.info(`[SkipTo Command] Removed ${skipped.length} tracks before position ${position}`);
        logger.debug(`[SkipTo Command] Target track: ${queue.queue[0]?.info?.title || 'unknown'}`);
        
        // Skip current track to start playing the target track
        if (queue.player) {
            logger.info(`[SkipTo Command] Stopping current track to jump to position ${position}`);
            queue.player.stopTrack();
            message.reply(`⏭️ Skipped to track #${position} in the queue.`);
        } else {
            logger.error(`[SkipTo Command] Player not ready for guild ${message.guild.id}`);
            message.reply('Player is not ready yet. Please try again.');
        }
    }
}
