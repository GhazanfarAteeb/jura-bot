/**
 * NowPlaying Command
 * Display the currently playing track
 */

import Command from '../../structures/Command.js';
import { EmbedBuilder } from 'discord.js';

export default class NowPlaying extends Command {
    constructor(client) {
        super(client, {
            name: 'nowplaying',
            description: {
                content: 'Display information about the currently playing track',
                usage: '',
                examples: ['nowplaying']
            },
            aliases: ['np', 'current'],
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
            options: []
        });
    }

    async run(client, ctx, args) {
        const player = client.riffy?.players.get(ctx.guild.id);

        if (!player || !player.current) {
            return ctx.sendMessage({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ No track is currently playing.'
                }]
            });
        }

        const track = player.current;

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

        // Create progress bar
        const createProgressBar = (current, total, length = 15) => {
            if (!total || isNaN(total)) return '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [LIVE]';
            
            const progress = Math.round((current / total) * length);
            const empty = length - progress;
            
            return '▬'.repeat(Math.max(0, progress)) + '🔘' + '▬'.repeat(Math.max(0, empty - 1));
        };

        const position = player.position || 0;
        const duration = track.info.length || 0;
        const progressBar = createProgressBar(position, duration);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({ name: '🎵 Now Playing' })
            .setTitle(track.info.title)
            .setURL(track.info.uri)
            .setThumbnail(track.info.thumbnail || track.info.artworkUrl || null)
            .setDescription(`${progressBar}\n\`${formatDuration(position)} / ${formatDuration(duration)}\``)
            .addFields(
                { name: 'Author', value: track.info.author || 'Unknown', inline: true },
                { name: 'Requested By', value: track.info.requester?.toString() || 'Unknown', inline: true },
                { name: 'Volume', value: `${player.volume}%`, inline: true }
            );

        // Add loop status if enabled
        if (player.loop && player.loop !== 'none') {
            embed.addFields({
                name: 'Loop',
                value: player.loop === 'track' ? '🔂 Track' : '🔁 Queue',
                inline: true
            });
        }

        // Add queue info
        if (player.queue.length > 0) {
            embed.addFields({
                name: 'Queue',
                value: `${player.queue.length} track${player.queue.length !== 1 ? 's' : ''} remaining`,
                inline: true
            });
        }

        embed.setTimestamp();

        return ctx.sendMessage({ embeds: [embed] });
    }
}
