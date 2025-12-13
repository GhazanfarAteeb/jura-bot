import Command from '../../structures/Command.js';

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
        const queue = this.client.music.getQueue(message.guild.id);
        if (!queue || !queue.current) return message.reply('There is no music playing right now.');

        const embed = this.client.embed()
            .setTitle('Now Playing')
            .setDescription(`[${queue.current.info.title}](${queue.current.info.uri})`)
            .setThumbnail(queue.current.info.artworkUrl || null)
            .addFields(
                { name: 'Duration', value: queue.formatTime(queue.current.info.length), inline: true },
                { name: 'Requested by', value: `<@${queue.current.requester.id}>`, inline: true }
            )
            .setColor(this.client.color.main);

        message.reply({ embeds: [embed] });
    }
}
