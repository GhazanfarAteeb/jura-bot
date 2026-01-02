/**
 * Seek Command
 * Seek to a specific position in the track
 */

import Command from '../../structures/Command.js';

export default class Seek extends Command {
  constructor(client) {
    super(client, {
      name: 'seek',
      description: {
        content: 'Seek to a specific position in the track',
        usage: '<time>',
        examples: ['seek 1:30', 'seek 90', 'seek 2:00:00']
      },
      aliases: [],
      category: 'music',
      cooldown: 3,
      args: true,
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
      options: [
        {
          name: 'time',
          description: 'The time to seek to (e.g., 1:30 or 90)',
          type: 3, // STRING
          required: true
        }
      ]
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

    const timeArg = args[0];

    // Parse time input
    let seekTime = 0;

    if (timeArg.includes(':')) {
      // Format: mm:ss or hh:mm:ss
      const parts = timeArg.split(':').map(Number);

      if (parts.some(isNaN)) {
        return ctx.sendMessage({
          embeds: [{
            color: 0xff4757,
            description: '**Error:** Invalid time format. Use `mm:ss` or `hh:mm:ss`, Master.'
          }]
        });
      }

      if (parts.length === 2) {
        // mm:ss
        seekTime = (parts[0] * 60 + parts[1]) * 1000;
      } else if (parts.length === 3) {
        // hh:mm:ss
        seekTime = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      }
    } else {
      // Seconds only
      seekTime = parseInt(timeArg) * 1000;
    }

    if (isNaN(seekTime) || seekTime < 0) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xff4757,
          description: '**Error:** Invalid time value detected, Master.'
        }]
      });
    }

    const duration = player.current?.info?.length || 0;

    if (seekTime > duration) {
      return ctx.sendMessage({
        embeds: [{
          color: 0xff4757,
          description: '**Warning:** Seek position exceeds track duration, Master.'
        }]
      });
    }

    player.seek(seekTime);

    // Format time for display
    const formatTime = (ms) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor(ms / (1000 * 60 * 60));

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return ctx.sendMessage({
      embeds: [{
        color: 0x00ced1,
        description: `**Confirmed:** Playback position adjusted to **${formatTime(seekTime)}**, Master.`
      }]
    });
  }
}
