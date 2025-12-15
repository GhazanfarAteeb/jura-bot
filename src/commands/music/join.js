import Command from '../../structures/Command.js';
import logger from '../../utils/logger.js';

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
    logger.info(`[Join Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    const { channel } = message.member.voice;

    if (!channel) {
      logger.warn(`[Join Command] User ${message.author.tag} not in voice channel`);
      return message.reply('You need to be in a voice channel to use this command!');
    }

    logger.info(`[Join Command] Target voice channel: ${channel.name} (${channel.id})`);

    const permissions = channel.permissionsFor(this.client.user);
    if (!permissions.has(['Connect', 'Speak'])) {
      logger.warn(`[Join Command] Missing permissions in channel ${channel.id}`);
      return message.reply('I don\'t have permissions to connect and speak in that channel!');
    }

    const existingQueue = this.client.music.getQueue(message.guild.id);
    if (existingQueue) {
      logger.warn(`[Join Command] Queue already exists for guild ${message.guild.id}`);
      return message.reply('I am already connected in this guild!');
    }

    const node = this.client.music.getNode();
    if (!node) {
      logger.error(`[Join Command] No music node available for guild ${message.guild.id}`);
      return message.reply('Music node is not ready yet, please try again later.');
    }

    logger.info(`[Join Command] Using node: ${node.name}`);

    try {
      logger.info(`[Join Command] Creating queue for guild ${message.guild.id}`);
      this.client.music.createQueue(message.guild, channel, message.channel);
      logger.info(`[Join Command] Successfully joined ${channel.name} in guild ${message.guild.id}`);
      message.reply(`Joined **${channel.name}**!`);
    } catch (error) {
      logger.error(`[Join Command] Failed to join voice channel in guild ${message.guild.id}:`, error);
      message.reply('Failed to join voice channel: ' + error.message);
    }
  }
}
