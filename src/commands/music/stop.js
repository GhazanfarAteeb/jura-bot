import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class Stop extends Command {
  constructor(client) {
    super(client, {
      name: 'stop',
      description: 'Stops the music and clears the queue',
      usage: 'stop',
      category: 'Music',
      aliases: ['leave', 'dc']
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    logger.info(`[Stop Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    const queue = this.client.music.getQueue(message.guild.id);
    if (!queue) {
      logger.warn(`[Stop Command] No queue found for guild ${message.guild.id}`);
      return message.reply('There is no music playing right now.');
    }

    if (message.member.voice.channelId !== queue.channelId) {
      logger.warn(`[Stop Command] User ${message.author.tag} not in same voice channel`);
      return message.reply('You need to be in the same voice channel as the bot!');
    }

    logger.info(`[Stop Command] Destroying queue for guild ${message.guild.id}`);
    logger.info(`[Stop Command] Queue had ${queue.queue.length} tracks, current: ${queue.current?.info?.title || 'none'}`);

    queue.destroy();
    logger.info(`[Stop Command] Successfully stopped music in guild ${message.guild.id}`);
    message.reply('Stopped the music and cleared the queue.');
  }
}
