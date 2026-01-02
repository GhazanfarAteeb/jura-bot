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
                    color: 0xff4757,
                    description: '**Warning:** No audio playback system detected, Master.'
                }]
            });
        }

        // Show current volume if no argument
        if (!args[0]) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0x00ced1,
                    description: `**Report:** Current audio level: **${player.volume}%**, Master.`
                }]
            });
        }

        const volume = parseInt(args[0]);

        if (isNaN(volume)) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff4757,
                    description: '**Warning:** Please provide a valid numerical value, Master.'
                }]
            });
        }

        if (volume < 0 || volume > 150) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff4757,
                    description: '**Warning:** Volume must be between 0 and 150, Master.'
                }]
            });
        }

        player.setVolume(volume);

        // Volume indicator based on level
        let volumeIndicator = '◉ High';
        if (volume === 0) volumeIndicator = '○ Muted';
        else if (volume <= 30) volumeIndicator = '◈ Low';
        else if (volume <= 70) volumeIndicator = '◈ Medium';

        return ctx.sendMessage({
            embeds: [{
                color: 0x00ced1,
                description: `**Confirmed:** Audio level set to **${volume}%** (${volumeIndicator}), Master.`
            }]
        });
    }
}
