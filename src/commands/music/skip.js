/**
 * Skip Command
 * Skip the current track
 */

import Command from '../../structures/Command.js';

export default class Skip extends Command {
    constructor(client) {
        super(client, {
            name: 'skip',
            description: {
                content: 'Skip the currently playing track',
                usage: '',
                examples: ['skip']
            },
            aliases: ['s', 'next'],
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

        const currentTrack = player.current;
        player.stop();

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ff00,
                description: `⏭️ Skipped **${currentTrack?.info?.title || 'the current track'}**.`
            }]
        });
    }
}
