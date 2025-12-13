import Command from '../../structures/Command.js';

export default class Skip extends Command {
    constructor(client) {
        super(client, {
            name: 'skip',
            description: 'Skips the current song',
            usage: 'skip',
            category: 'Music',
            aliases: ['s', 'next']
        });
    }

    async run(message) {
        const queue = this.client.music.getQueue(message.guild.id);
        if (!queue) return message.reply('There is no music playing right now.');

        if (message.member.voice.channelId !== queue.channelId) {
            return message.reply('You need to be in the same voice channel as the bot!');
        }

        queue.player.stopTrack();
        message.reply('Skipped the current track.');
    }
}
