/**
 * Shuffle Command
 * Shuffle the queue
 */

import Command from '../../structures/Command.js';

export default class Shuffle extends Command {
  constructor(client) {
    super(client, {
      name: 'shuffle',
      description: {
        content: 'Shuffle the music queue',
        usage: '',
        examples: ['shuffle']
      },
      aliases: ['sh'],
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

    if (player.queue.length < 2) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xffd700,
          description: '**Notice:** Insufficient tracks for randomization. Minimum of 2 required, Master.'
        }]
      });
    }

    // Fisher-Yates shuffle algorithm
    for (let i = player.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
    }

    return ctx.sendMessage({
      embeds: [{
        color: 0x00ced1,
        description: `**Confirmed:** Queue randomization complete. **${player.queue.length}** tracks reordered, Master.`
      }]
    });
  }
}
