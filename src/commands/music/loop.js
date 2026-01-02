/**
 * Loop Command
 * Toggle loop mode (track/queue/off)
 */

import Command from '../../structures/Command.js';

export default class Loop extends Command {
    constructor(client) {
        super(client, {
            name: 'loop',
            description: {
                content: 'Toggle loop mode (track, queue, or off)',
                usage: '[track|queue|off]',
                examples: ['loop', 'loop track', 'loop queue', 'loop off']
            },
            aliases: ['repeat'],
            category: 'music',
            cooldown: 3,
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
            options: [
                {
                    name: 'mode',
                    description: 'The loop mode',
                    type: 3, // STRING
                    required: false,
                    choices: [
                        { name: 'Track', value: 'track' },
                        { name: 'Queue', value: 'queue' },
                        { name: 'Off', value: 'none' }
                    ]
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
                    description: '**Warning:** No audio playback system detected, Master.'
                }]
            });
        }

        const mode = args[0]?.toLowerCase();

        // If specific mode provided
        if (mode) {
            if (!['track', 'queue', 'off', 'none'].includes(mode)) {
                return ctx.sendMessage({
                    embeds: [{
                        color: 0xff4757,
                        description: '**Warning:** Invalid mode. Valid options: `track`, `queue`, `off`, Master.'
                    }]
                });
            }

            const loopMode = mode === 'off' ? 'none' : mode;
            player.setLoop(loopMode);

            const messages = {
                track: '**Confirmed:** Now repeating current track, Master.',
                queue: '**Confirmed:** Now repeating entire queue, Master.',
                none: '**Confirmed:** Repeat mode disabled, Master.'
            };

            return ctx.sendMessage({
                embeds: [{
                    color: 0x00ced1,
                    description: messages[loopMode]
                }]
            });
        }

        // Toggle through modes if no argument
        const currentLoop = player.loop || 'none';
        let newLoop;
        let message;

        if (currentLoop === 'none') {
            newLoop = 'track';
            message = '**Confirmed:** Now repeating current track, Master.';
        } else if (currentLoop === 'track') {
            newLoop = 'queue';
            message = '**Confirmed:** Now repeating entire queue, Master.';
        } else {
            newLoop = 'none';
            message = '**Confirmed:** Repeat mode disabled, Master.';
        }

        player.setLoop(newLoop);

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ced1,
                description: message
            }]
        });
    }
}
