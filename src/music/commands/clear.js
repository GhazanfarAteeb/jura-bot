import Command from '../../structures/Command.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/PlayerEmbeds.js';
import logger from '../../utils/logger.js';

export default class Clear extends Command {
  constructor(client) {
    super(client, {
      name: 'clear',
      description: 'Clear the entire queue',
      usage: 'clear',
      category: 'Music',
      aliases: ['clearqueue'],
      cooldown: 3
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    const riffyManager = client.riffyManager;

    const player = riffyManager.getPlayer(message.guild.id);

    if (!player) {
      const embed = createErrorEmbed('No music is currently playing!');
      return message.reply({ embeds: [embed] });
    }

    // Check if user is in the same voice channel
    const memberVoiceChannel = message.member.voice.channel;
    const botVoiceChannel = message.guild.members.cache.get(client.user.id)?.voice.channel;

    if (!memberVoiceChannel || memberVoiceChannel.id !== botVoiceChannel?.id) {
      const embed = createErrorEmbed('You need to be in the same voice channel as me to use this command!');
      return message.reply({ embeds: [embed] });
    }

    const queueLength = player.queue.length;

    if (queueLength === 0) {
      const embed = createErrorEmbed('The queue is already empty!');
      return message.reply({ embeds: [embed] });
    }

    try {
      player.queue.clear();

      const embed = createSuccessEmbed(
        'Queue Cleared',
        `🗑️ Removed **${queueLength}** tracks from the queue`
      );
      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Clear Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while clearing the queue!');
      return message.reply({ embeds: [embed] });
    }
  }
}
