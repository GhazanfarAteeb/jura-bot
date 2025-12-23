/**
 * Clear Command
 * Clear the music queue
 */

import Command from '../../structures/Command.js';

export default class Clear extends Command {
    constructor(client) {
        super(client, {
            name: 'clear',
            description: {
                content: 'Clear the music queue',
                usage: '',
                examples: ['clear']
            },
            aliases: ['clearqueue', 'cq'],
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
                    color: 0xff0000,
                    description: '❌ No music player found.'
                }]
            });
        }

        if (player.queue.length === 0) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xffcc00,
                    description: '❌ The queue is already empty.'
                }]
            });
        }

        const queueLength = player.queue.length;
        player.queue.length = 0; // Clear the queue

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ff00,
                description: `🗑️ Cleared **${queueLength}** track${queueLength !== 1 ? 's' : ''} from the queue.`
            }]
        });
    }
}
