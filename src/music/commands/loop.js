import Command from '../../structures/Command.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/PlayerEmbeds.js';
import logger from '../../../utils/logger.js';

export default class Loop extends Command {
  constructor(client) {
    super(client, {
      name: 'loop',
      description: 'Set the loop mode (track, queue, or off)',
      usage: 'loop <track | queue | off>',
      category: 'Music',
      aliases: ['repeat', 'l'],
      cooldown: 2
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

    const mode = args[0]?.toLowerCase();

    if (!mode) {
      const currentMode = player.loop === 'track' ? '🔂 Track' : player.loop === 'queue' ? '🔁 Queue' : '➡️ Off';
      const embed = createSuccessEmbed(
        'Current Loop Mode',
        `Loop is set to: **${currentMode}**`
      );
      return message.reply({ embeds: [embed] });
    }

    try {
      let loopMode;
      let emoji;
      let description;

      switch (mode) {
        case 'track':
        case 'song':
        case 't':
          loopMode = 'track';
          emoji = '🔂';
          description = 'Looping current track';
          break;

        case 'queue':
        case 'q':
        case 'all':
          loopMode = 'queue';
          emoji = '🔁';
          description = 'Looping entire queue';
          break;

        case 'off':
        case 'none':
        case 'disable':
          loopMode = 'none';
          emoji = '➡️';
          description = 'Loop disabled';
          break;

        default:
          const embed = createErrorEmbed(
            'Invalid loop mode!',
            'Valid modes: `track`, `queue`, or `off`'
          );
          return message.reply({ embeds: [embed] });
      }

      player.setLoop(loopMode);

      const embed = createSuccessEmbed(
        'Loop Mode Updated',
        `${emoji} ${description}`
      );
      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Loop Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while setting the loop mode!');
      return message.reply({ embeds: [embed] });
    }
  }
}
