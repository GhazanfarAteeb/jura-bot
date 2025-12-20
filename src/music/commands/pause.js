import Command from '../../structures/Command.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/PlayerEmbeds.js';
import logger from '../../../utils/logger.js';

export default class Pause extends Command {
  constructor(client) {
    super(client, {
      name: 'pause',
      description: 'Pause or resume the currently playing track',
      usage: 'pause',
      category: 'Music',
      aliases: ['resume'],
      cooldown: 2
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    const riffyManager = client.riffyManager;

    const player = riffyManager.getPlayer(message.guild.id);

    if (!player || !player.current) {
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
      if (player.paused) {
        player.pause(false);
        const embed = createSuccessEmbed('Resumed playback', '▶️ Music is now playing');
        return message.reply({ embeds: [embed] });
      } else {
        player.pause(true);
        const embed = createSuccessEmbed('Paused playback', '⏸️ Music is now paused');
        return message.reply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('[Pause Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while pausing/resuming the track!');
      return message.reply({ embeds: [embed] });
    }
  }
}
