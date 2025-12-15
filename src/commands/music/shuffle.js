import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class Shuffle extends Command {
  constructor(client) {
    super(client, {
      name: 'shuffle',
      description: 'Shuffles the queue',
      usage: 'shuffle',
      category: 'Music',
      aliases: ['mix']
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    logger.info(`[Shuffle Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    const queue = this.client.music.getQueue(message.guild.id);

    if (!queue) {
      logger.warn(`[Shuffle Command] No queue found for guild ${message.guild.id}`);
      return message.reply('There is no music playing right now.');
    }

    if (message.member.voice.channelId !== queue.channelId) {
      logger.warn(`[Shuffle Command] User ${message.author.tag} not in same voice channel`);
      return message.reply('You need to be in the same voice channel as the bot!');
    }

    if (queue.queue.length < 2) {
      logger.warn(`[Shuffle Command] Not enough tracks to shuffle (${queue.queue.length})`);
      return message.reply('Not enough tracks in the queue to shuffle!');
    }

    try {
      logger.info(`[Shuffle Command] Shuffling ${queue.queue.length} tracks`);
      queue.shuffle();
      logger.info(`[Shuffle Command] Successfully shuffled ${queue.queue.length} tracks in guild ${message.guild.id}`);
      message.reply(`🔀 Shuffled **${queue.queue.length}** tracks in the queue!`);
    } catch (error) {
      logger.error(`[Shuffle Command] Failed to shuffle queue in guild ${message.guild.id}:`, error);
      message.reply('Failed to shuffle the queue: ' + error.message);
    }
  }
}
