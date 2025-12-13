import Command from '../../structures/Command.js';

export default class Stop extends Command {
    constructor(client) {
        super(client, {
            name: 'stop',
            description: 'Stops the music and clears the queue',
            usage: 'stop',
            category: 'Music',
            aliases: ['leave', 'dc']
        });
    }

    async run(client, ctx, args) {
        const message = ctx.message;
        const queue = this.client.music.getQueue(message.guild.id);
        if (!queue) return message.reply('There is no music playing right now.');

        if (message.member.voice.channelId !== queue.channelId) {
            return message.reply('You need to be in the same voice channel as the bot!');
        }

        queue.destroy();
        message.reply('Stopped the music and cleared the queue.');
    }
}
