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
                    color: 0xff0000,
                    description: '❌ No music player found.'
                }]
            });
        }

        const mode = args[0]?.toLowerCase();

        // If specific mode provided
        if (mode) {
            if (!['track', 'queue', 'off', 'none'].includes(mode)) {
                return ctx.sendMessage({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ Invalid mode. Use `track`, `queue`, or `off`.'
                    }]
                });
            }

            const loopMode = mode === 'off' ? 'none' : mode;
            player.setLoop(loopMode);

            const messages = {
                track: '🔂 Now looping the current track.',
                queue: '🔁 Now looping the entire queue.',
                none: '➡️ Loop disabled.'
            };

            return ctx.sendMessage({
                embeds: [{
                    color: 0x00ff00,
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
            message = '🔂 Now looping the current track.';
        } else if (currentLoop === 'track') {
            newLoop = 'queue';
            message = '🔁 Now looping the entire queue.';
        } else {
            newLoop = 'none';
            message = '➡️ Loop disabled.';
        }

        player.setLoop(newLoop);

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ff00,
                description: message
            }]
        });
    }
}
