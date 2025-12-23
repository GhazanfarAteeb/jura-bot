/**
 * Queue Command
 * Display the current music queue
 */

import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class Queue extends Command {
    constructor(client) {
        super(client, {
            name: 'queue',
            description: {
                content: 'Display the current music queue',
                usage: '[page]',
                examples: ['queue', 'queue 2']
            },
            aliases: ['q'],
            category: 'music',
            cooldown: 3,
            args: false,
            player: {
                voice: false,
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
                    name: 'page',
                    description: 'The page of the queue to display',
                    type: 4, // INTEGER
                    required: false
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

        const current = player.current;
        const queue = player.queue || [];

        // Check if nothing is playing
        if (!current && queue.length === 0) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xffcc00,
                    description: '📭 The queue is empty. Use `play` to add some tracks!'
                }]
            });
        }

        // Format duration
        const formatDuration = (ms) => {
            if (!ms || isNaN(ms)) return 'Live';
            const seconds = Math.floor((ms / 1000) % 60);
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const hours = Math.floor(ms / (1000 * 60 * 60));

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        // Pagination
        const page = parseInt(args[0]) || 1;
        const pageSize = 10;
        const totalPages = Math.ceil(queue.length / pageSize) || 1;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        if (page < 1 || page > totalPages) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Invalid page. Please provide a page between 1 and ${totalPages}.`
                }]
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Music Queue')
            .setThumbnail(current?.info?.thumbnail || current?.info?.artworkUrl || null);

        // Now playing
        if (current) {
            embed.setDescription(`**Now Playing:**\n[${current.info.title}](${current.info.uri}) \`[${formatDuration(current.info.length)}]\`\nRequested by: ${current.info.requester?.toString() || 'Unknown'}`);
        }

        // Queue list
        if (queue.length > 0) {
            const queueSlice = queue.slice(startIndex, endIndex);
            const queueList = queueSlice.map((track, index) => {
                const position = startIndex + index + 1;
                return `**${position}.** [${track.info.title}](${track.info.uri}) \`[${formatDuration(track.info.length)}]\``;
            }).join('\n');

            embed.addFields({
                name: `Up Next (${queue.length} track${queue.length !== 1 ? 's' : ''})`,
                value: queueList || 'No tracks in queue'
            });
        } else {
            embed.addFields({
                name: 'Up Next',
                value: 'No tracks in queue'
            });
        }

        // Calculate total queue duration
        const totalDuration = queue.reduce((acc, track) => acc + (track.info.length || 0), 0);

        embed.setFooter({
            text: `Page ${page}/${totalPages} • Total Duration: ${formatDuration(totalDuration)}`
        });

        embed.setTimestamp();

        return ctx.sendMessage({ embeds: [embed] });
    }
}
