import Command from '../../structures/Command.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/PlayerEmbeds.js';
import logger from '../../utils/logger.js';

export default class Volume extends Command {
  constructor(client) {
    super(client, {
      name: 'volume',
      description: 'Adjust the playback volume (0-200)',
      usage: 'volume <0-200>',
      category: 'Music',
      aliases: ['vol', 'v'],
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

    // Show current volume if no argument
    if (!args[0]) {
      const embed = createSuccessEmbed(
        'Current Volume',
        `🔊 Volume is set to **${player.volume || 100}%**`
      );
      return message.reply({ embeds: [embed] });
    }

    const volume = parseInt(args[0]);

    if (isNaN(volume) || volume < 0 || volume > 200) {
      const embed = createErrorEmbed('Please provide a valid volume between 0 and 200!');
      return message.reply({ embeds: [embed] });
    }

    try {
      player.setVolume(volume);

      const volumeEmoji = volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';
      const embed = createSuccessEmbed(
        'Volume Updated',
        `${volumeEmoji} Volume set to **${volume}%**`
      );
      return message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Volume Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while adjusting the volume!');
      return message.reply({ embeds: [embed] });
    }
  }
}
