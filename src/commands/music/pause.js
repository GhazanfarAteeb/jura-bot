import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class Pause extends Command {
  constructor(client) {
    super(client, {
      name: 'pause',
      description: 'Pauses or resumes the current song',
      usage: 'pause',
      category: 'Music',
      aliases: ['resume']
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    logger.info(`[Pause Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    const queue = this.client.music.getQueue(message.guild.id);
    if (!queue) {
      logger.warn(`[Pause Command] No queue found for guild ${message.guild.id}`);
      return message.reply('There is no music playing right now.');
    }

    if (message.member.voice.channelId !== queue.channelId) {
      logger.warn(`[Pause Command] User ${message.author.tag} not in same voice channel`);
      return message.reply('You need to be in the same voice channel as the bot!');
    }

    if (!queue.player) {
      logger.error(`[Pause Command] Player not ready for guild ${message.guild.id}`);
      return message.reply('Player is not ready yet. Please try again.');
    }

    // Toggle pause state
    const newPauseState = !queue.paused;
    logger.info(`[Pause Command] Current state: ${queue.paused ? 'paused' : 'playing'}, toggling to: ${newPauseState ? 'paused' : 'playing'}`);

    const success = queue.pause(newPauseState);

    if (success) {
      logger.info(`[Pause Command] Successfully ${newPauseState ? 'paused' : 'resumed'} music in guild ${message.guild.id}`);
      message.reply(newPauseState ? '⏸️ Paused the music.' : '▶️ Resumed the music.');
    } else {
      logger.error(`[Pause Command] Failed to ${newPauseState ? 'pause' : 'resume'} music in guild ${message.guild.id}`);
      message.reply('Failed to pause/resume the music.');
    }
  }
}
