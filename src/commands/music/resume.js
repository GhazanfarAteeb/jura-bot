/**
 * Resume Command
 * Resume paused playback
 */

import Command from '../../structures/Command.js';

export default class Resume extends Command {
    constructor(client) {
        super(client, {
            name: 'resume',
            description: {
                content: 'Resume the paused track',
                usage: '',
                examples: ['resume']
            },
            aliases: ['unpause'],
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
                    color: 0xff0000,
                    description: '❌ No music player found.'
                }]
            });
        }

        if (!player.paused) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xffcc00,
                    description: '▶️ The player is already playing.'
                }]
            });
        }

        player.pause(false);

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ff00,
                description: '▶️ Resumed playback.'
            }]
        });
    }
}
