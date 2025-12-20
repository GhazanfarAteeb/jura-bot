import Command from '../../../structures/Command.js';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/PlayerEmbeds.js';
import logger from '../../../utils/logger.js';

export default class Stop extends Command {
  constructor(client) {
    super(client, {
      name: 'stop',
      description: 'Stop the music and clear the queue',
      usage: 'stop',
      category: 'Music',
      aliases: ['leave', 'disconnect'],
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

    try {
      player.destroy();

      const embed = createSuccessEmbed(
        'Stopped music playback',
        '👋 Queue cleared and disconnected from voice channel'
      );
      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Stop Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while stopping the music!');
      return message.reply({ embeds: [embed] });
    }
  }
}
