import Command from '../../structures/Command.js';

export default class Join extends Command {
    constructor(client) {
        super(client, {
            name: 'join',
            description: 'Joins the voice channel',
            usage: 'join',
            category: 'Music',
            aliases: ['j']
        });
    }

    async run(client, ctx, args) {
        const message = ctx.message;
        const { channel } = message.member.voice;

        if (!channel) return message.reply('You need to be in a voice channel to use this command!');
        
        const permissions = channel.permissionsFor(this.client.user);
        if (!permissions.has(['Connect', 'Speak'])) return message.reply('I don\'t have permissions to connect and speak in that channel!');

        const existingQueue = this.client.music.getQueue(message.guild.id);
        if (existingQueue) return message.reply('I am already connected in this guild!');

        const node = this.client.music.getNode();
        if (!node) return message.reply('Music node is not ready yet, please try again later.');

        try {
            this.client.music.createQueue(message.guild, channel, message.channel);
            message.reply(`Joined **${channel.name}**!`);
        } catch (error) {
            console.error(error);
            message.reply('Failed to join voice channel: ' + error.message);
        }
    }
}
