/**
 * Remove Command
 * Remove a track from the queue
 */

import Command from '../../structures/Command.js';

export default class Remove extends Command {
    constructor(client) {
        super(client, {
            name: 'remove',
            description: {
                content: 'Remove a track from the queue by position',
                usage: '<position>',
                examples: ['remove 3', 'remove 1']
            },
            aliases: ['rm'],
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
                    name: 'position',
                    description: 'The position of the track to remove',
                    type: 4, // INTEGER
                    required: true,
                    min_value: 1
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

        if (player.queue.length === 0) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xffcc00,
                    description: '❌ The queue is empty.'
                }]
            });
        }

        const position = parseInt(args[0]);

        if (isNaN(position)) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ Please provide a valid position number.'
                }]
            });
        }

        if (position < 1 || position > player.queue.length) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Invalid position. The queue has ${player.queue.length} track${player.queue.length !== 1 ? 's' : ''}.`
                }]
            });
        }

        const removed = player.queue.splice(position - 1, 1)[0];

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ff00,
                description: `🗑️ Removed **${removed.info.title}** from position **#${position}**.`
            }]
        });
    }
}
