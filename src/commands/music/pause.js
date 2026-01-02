/**
 * Pause Command
 * Pause the current track
 */

import Command from '../../structures/Command.js';

export default class Pause extends Command {
    constructor(client) {
        super(client, {
            name: 'pause',
            description: {
                content: 'Pause the currently playing track',
                usage: '',
                examples: ['pause']
            },
            aliases: [],
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
            options: []
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

        if (player.paused) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xffd700,
                    description: '**Notice:** Audio stream is already suspended, Master. Use `resume` to continue.'
                }]
            });
        }

        player.pause(true);

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ced1,
                description: '**Confirmed:** Audio stream suspended, Master.'
            }]
        });
    }
}
