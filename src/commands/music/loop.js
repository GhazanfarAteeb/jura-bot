import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class Loop extends Command {
  constructor(client) {
    super(client, {
      name: 'loop',
      description: 'Sets the loop mode (none/track/queue)',
      usage: 'loop <none|track|queue>',
      category: 'Music',
      aliases: ['repeat', 'l']
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    logger.info(`[Loop Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    const queue = this.client.music.getQueue(message.guild.id);

    if (!queue) {
      logger.warn(`[Loop Command] No queue found for guild ${message.guild.id}`);
      return message.reply('There is no music playing right now.');
    }

    if (message.member.voice.channelId !== queue.channelId) {
      logger.warn(`[Loop Command] User ${message.author.tag} not in same voice channel`);
      return message.reply('You need to be in the same voice channel as the bot!');
    }

    if (!args[0]) {
      logger.info(`[Loop Command] No mode provided, showing current mode: ${queue.loop}`);
      return message.reply(`Current loop mode: **${queue.loop}**\nUsage: \`loop <none|track|queue>\``);
    }

    const mode = args[0].toLowerCase();
    logger.info(`[Loop Command] Requested mode: ${mode}`);

    if (!['none', 'track', 'queue'].includes(mode)) {
      logger.warn(`[Loop Command] Invalid mode provided: ${mode}`);
      return message.reply('Invalid loop mode! Use: `none`, `track`, or `queue`');
    }

    try {
      const oldMode = queue.loop;
      queue.setLoop(mode);
      logger.info(`[Loop Command] Changed loop mode from ${oldMode} to ${mode} in guild ${message.guild.id}`);

      const emoji = mode === 'track' ? '🔂' : mode === 'queue' ? '🔁' : '▶️';
      message.reply(`${emoji} Loop mode set to **${mode}**`);
    } catch (error) {
      logger.error(`[Loop Command] Failed to set loop mode in guild ${message.guild.id}:`, error);
      message.reply('Failed to set loop mode: ' + error.message);
    }
  }
}
