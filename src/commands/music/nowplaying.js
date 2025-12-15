import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

export default class NowPlaying extends Command {
    constructor(client) {
        super(client, {
            name: 'nowplaying',
            description: 'Shows the currently playing song',
            usage: 'nowplaying',
            category: 'Music',
            aliases: ['np', 'current']
        });
    }

    async run(client, ctx, args) {
        const message = ctx.message;
        logger.info(`[NowPlaying Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);
        
        const queue = this.client.music.getQueue(message.guild.id);
        if (!queue || !queue.current) {
            logger.warn(`[NowPlaying Command] No queue or current track for guild ${message.guild.id}`);
            return message.reply('There is no music playing right now.');
        }
        
        logger.debug(`[NowPlaying Command] Current track: ${queue.current.info.title}`);

        const embed = this.client.embed()
            .setTitle('Now Playing')
            .setDescription(`[${queue.current.info.title}](${queue.current.info.uri})`)
            .setThumbnail(queue.current.info.artworkUrl || null)
            .addFields(
                { name: 'Duration', value: queue.formatTime(queue.current.info.length), inline: true },
                { name: 'Requested by', value: `<@${queue.current.requester.id}>`, inline: true }
            )
            .setColor(this.client.color.main);

        logger.info(`[NowPlaying Command] Sending now playing embed for: ${queue.current.info.title}`);
        message.reply({ embeds: [embed] });
    }
}
