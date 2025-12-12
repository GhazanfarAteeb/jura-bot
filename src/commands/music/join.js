import Command from "../../structures/Command.js";

export default class Join extends Command {
  constructor(client) {
    super(client, {
      name: "join",
      description: {
        content: "Joins the voice channel",
        examples: ["join"],
        usage: "join",
      },
      category: "music",
      aliases: ["j"],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ["SendMessages", "ViewChannel", "EmbedLinks", "Speak"],
        user: [],
      },
      slashCommand: true,
      options: [],
    });
  }
  async run(client, ctx) {
    let player = client.queue.get(ctx.guild.id);
    const embed = this.client.embed();
    if (!player) {
      const vc = ctx.member;
      try {
        player = await client.queue.create(
          ctx.guild,
          vc.voice.channel,
          ctx.channel,
          client.shoukaku.options.nodeResolver(client.shoukaku.nodes)
        );
        return await ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `Joined <#${
                  player.node.manager.connections.get(ctx.guild.id).channelId
                }>`
              ),
          ],
        });
      } catch (error) {
        console.error('Failed to join voice channel:', error);
        return await ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.red)
              .setDescription(
                `❌ Failed to join voice channel: ${error.message}\n\nMake sure I have proper permissions and try again.`
              ),
          ],
        });
      }
    } else {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.main)
            .setDescription(
              `I'm already connected to <#${
                player.node.manager.connections.get(ctx.guild.id).channelId
              }>`
            ),
        ],
      });
    }
  }
};
