import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class Queue extends Command {
    constructor(client) {
        super(client, {
            name: 'queue',
            description: 'Displays the current music queue',
            usage: 'queue',
            category: 'Music',
            aliases: ['q', 'list']
        });
    }

    async run(client, ctx, args) {
        const message = ctx.message;
        logger.info(`[Queue Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);
        
        const queue = this.client.music.getQueue(message.guild.id);
        if (!queue || (!queue.current && !queue.queue.length)) {
            logger.warn(`[Queue Command] No queue or tracks for guild ${message.guild.id}`);
            return message.reply('There is no music playing right now.');
        }
        
        logger.debug(`[Queue Command] Queue has ${queue.queue.length} tracks, current: ${queue.current?.info?.title || 'none'}`);

        const embed = this.client.embed()
            .setTitle(`Queue for ${message.guild.name}`)
            .setColor(this.client.color.main);

        if (queue.current) {
            embed.addFields({ 
                name: 'Now Playing', 
                value: `[${queue.current.info.title}](${queue.current.info.uri}) - ${queue.formatTime(queue.current.info.length)}`
            });
        }

        const tracks = queue.queue.slice(0, 10).map((t, i) => {
            return `${i + 1}. [${t.info.title}](${t.info.uri}) - ${queue.formatTime(t.info.length)}`;
        });

        if (tracks.length) {
            embed.setDescription(tracks.join('\n'));
            if (queue.queue.length > 10) {
                embed.setFooter({ text: `And ${queue.queue.length - 10} more tracks...` });
            }
        } else {
            embed.setDescription('No other tracks in queue.');
        }

        logger.info(`[Queue Command] Sending queue embed with ${tracks.length} tracks displayed`);
        message.reply({ embeds: [embed] });
    }
}
