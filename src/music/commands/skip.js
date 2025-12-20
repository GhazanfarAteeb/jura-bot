import Command from '../../structures/Command.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/PlayerEmbeds.js';
import logger from '../../../utils/logger.js';

export default class Skip extends Command {
  constructor(client) {
    super(client, {
      name: 'skip',
      description: 'Skip the currently playing track',
      usage: 'skip',
      category: 'Music',
      aliases: ['s', 'next'],
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
      const skippedTrack = player.current;
      player.stop();

      const embed = createSuccessEmbed(
        'Skipped current track',
        `⏭️ **${skippedTrack.info.title}**`
      );
      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Skip Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while skipping the track!');
      return message.reply({ embeds: [embed] });
    }
  }
}
