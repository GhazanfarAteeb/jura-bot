/**
 * Clear Command
 * Clear the music queue
 */

import Command from '../../structures/Command.js';

export default class Clear extends Command {
  constructor(client) {
    super(client, {
      name: 'clearqueue',
      description: {
        content: 'Clear the music queue',
        usage: '',
        examples: ['clearqueue']
      },
      aliases: ['cq', 'emptyqueue'],
      category: 'music',
      cooldown: 5,
      args: false,
      player: {
        voice: true,
        dj: false,
        active: true,
        djPerm: null
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: []
      },
      slashCommand: true,
      options: []
    });
  }

  async run(client, ctx, args) {
    const player = client.riffy?.players.get(ctx.guild.id);

    if (!player) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xff4757,
          description: '**Warning:** No active audio session detected, Master.'
        }]
      });
    }

    if (player.queue.length === 0) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xffd700,
          description: '**Notice:** The queue is already empty, Master.'
        }]
      });
    }

    const queueLength = player.queue.length;
    player.queue.length = 0; // Clear the queue

    return ctx.sendMessage({
      embeds: [{
        color: 0x00ced1,
        description: `**Confirmed:** Queue purged. **${queueLength}** track${queueLength !== 1 ? 's' : ''} removed, Master.`
      }]
    });
  }
}
