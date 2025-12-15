import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class Volume extends Command {
  constructor(client) {
    super(client, {
      name: 'volume',
      description: 'Sets the player volume',
      usage: 'volume <0-100>',
      category: 'Music',
      aliases: ['vol', 'v']
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    logger.info(`[Volume Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    const queue = this.client.music.getQueue(message.guild.id);

    if (!queue) {
      logger.warn(`[Volume Command] No queue found for guild ${message.guild.id}`);
      return message.reply('There is no music playing right now.');
    }

    if (message.member.voice.channelId !== queue.channelId) {
      logger.warn(`[Volume Command] User ${message.author.tag} not in same voice channel`);
      return message.reply('You need to be in the same voice channel as the bot!');
    }

    if (!args[0] || isNaN(args[0])) {
      logger.warn(`[Volume Command] Invalid argument provided: ${args[0]}`);
      return message.reply('Please provide a valid volume level (0-100)!');
    }

    const volume = parseInt(args[0]);
    logger.info(`[Volume Command] Requested volume: ${volume}%`);

    if (volume < 0 || volume > 100) {
      logger.warn(`[Volume Command] Volume ${volume} out of range (0-100)`);
      return message.reply('Volume must be between 0 and 100!');
    }

    if (!queue.player) {
      logger.error(`[Volume Command] Player not ready for guild ${message.guild.id}`);
      return message.reply('Player is not ready yet. Please try again.');
    }

    try {
      logger.info(`[Volume Command] Setting volume to ${volume / 100} (${volume}%)`);
      // Shoukaku v4: setFilterVolume accepts 0.0 to 1.0
      await queue.player.setFilterVolume(volume / 100);
      logger.info(`[Volume Command] Successfully set volume to ${volume}% in guild ${message.guild.id}`);
      message.reply(`🔊 Volume set to **${volume}%**`);
    } catch (error) {
      logger.error(`[Volume Command] Failed to set volume in guild ${message.guild.id}:`, error);
      message.reply('Failed to set volume: ' + error.message);
    }
  }
}
