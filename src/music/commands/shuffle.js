import Command from '../../structures/Command.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/PlayerEmbeds.js';
import logger from '../../utils/logger.js';

export default class Shuffle extends Command {
  constructor(client) {
    super(client, {
      name: 'shuffle',
      description: 'Shuffle the queue',
      usage: 'shuffle',
      category: 'Music',
      aliases: ['mix'],
      cooldown: 3
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    const riffyManager = client.riffyManager;

    logger.info(`[Shuffle Command] Called by ${message.author.tag} in guild ${message.guild.id}`);

    const player = riffyManager.getPlayer(message.guild.id);

    if (!player || player.queue.length === 0) {
      const embed = createErrorEmbed('The queue is empty!');
      return message.reply({ embeds: [embed] });
    }

    // Check if user is in the same voice channel
    const memberVoiceChannel = message.member.voice.channel;
    const botVoiceChannel = message.guild.members.cache.get(client.user.id)?.voice.channel;

    if (!memberVoiceChannel || memberVoiceChannel.id !== botVoiceChannel?.id) {
      const embed = createErrorEmbed('You need to be in the same voice channel as me to use this command!');
      return message.reply({ embeds: [embed] });
    }

    try {
      // Fisher-Yates shuffle algorithm
      for (let i = player.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
      }

      const embed = createSuccessEmbed(
        'Queue Shuffled',
        `🔀 Shuffled **${player.queue.length}** tracks`
      );
      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Shuffle Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while shuffling the queue!');
      return message.reply({ embeds: [embed] });
    }
  }
}
