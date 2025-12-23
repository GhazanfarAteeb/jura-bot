/**
 * Volume Command
 * Adjust the player volume
 */

import Command from '../../structures/Command.js';

export default class Volume extends Command {
    constructor(client) {
        super(client, {
            name: 'volume',
            description: {
                content: 'Adjust the player volume (0-150)',
                usage: '<volume>',
                examples: ['volume 50', 'volume 100']
            },
            aliases: ['vol', 'v'],
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
                    name: 'level',
                    description: 'The volume level (0-150)',
                    type: 4, // INTEGER
                    required: false,
                    min_value: 0,
                    max_value: 150
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

        // Show current volume if no argument
        if (!args[0]) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0x0099ff,
                    description: `🔊 Current volume: **${player.volume}%**`
                }]
            });
        }

        const volume = parseInt(args[0]);

        if (isNaN(volume)) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ Please provide a valid number.'
                }]
            });
        }

        if (volume < 0 || volume > 150) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ Volume must be between 0 and 150.'
                }]
            });
        }

        player.setVolume(volume);

        // Volume emoji based on level
        let volumeEmoji = '🔊';
        if (volume === 0) volumeEmoji = '🔇';
        else if (volume <= 30) volumeEmoji = '🔈';
        else if (volume <= 70) volumeEmoji = '🔉';

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ff00,
                description: `${volumeEmoji} Volume set to **${volume}%**`
            }]
        });
    }
}
