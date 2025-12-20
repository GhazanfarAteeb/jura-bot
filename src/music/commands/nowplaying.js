import Command from '../../../structures/Command.js';
import { createNowPlayingEmbed, createPlayerButtons, createErrorEmbed } from '../../utils/PlayerEmbeds.js';
import logger from '../../../utils/logger.js';

export default class NowPlaying extends Command {
  constructor(client) {
    super(client, {
      name: 'nowplaying',
      description: 'Display the currently playing track with interactive controls',
      usage: 'nowplaying',
      category: 'Music',
      aliases: ['np', 'current'],
      cooldown: 3
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

    try {
      const embed = await createNowPlayingEmbed(player.current, player, client);
      const buttons = createPlayerButtons(player);

      await message.reply({ embeds: [embed], components: [buttons] });
    } catch (error) {
      logger.error('[NowPlaying Command] Error:', error);
      const embed = createErrorEmbed('An error occurred while displaying the now playing information!');
      return message.reply({ embeds: [embed] });
    }
  }
}
