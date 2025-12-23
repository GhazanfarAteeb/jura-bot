/**
 * Stop/Disconnect Command
 * Stop playback and disconnect from voice channel
 */

import Command from '../../structures/Command.js';

export default class Stop extends Command {
    constructor(client) {
        super(client, {
            name: 'stop',
            description: {
                content: 'Stop playback and disconnect from the voice channel',
                usage: '',
                examples: ['stop']
            },
            aliases: ['disconnect', 'dc', 'leave'],
            category: 'music',
            cooldown: 3,
            args: false,
            player: {
                voice: true,
                dj: false,
                active: false,
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

        // Clear the queue and destroy the player
        player.destroy();

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ff00,
                description: '⏹️ Stopped playback and disconnected from the voice channel.'
            }]
        });
    }
}
