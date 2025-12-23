const { Client, Message } = require("discord.js");

module.exports = {
    name: "disconnect",
    aliases: ["dc", "leave", "stop"],
    description: "Disconnect the bot from the voice channel",
    /**
     * @param {Client} client 
     * @param {Message} message 
     */
    run: async (client, message) => {
        if (!message.member.voice.channel) {
            return message.reply("You need to be in a voice channel!");
        }

        const player = client.riffy.players.get(message.guild.id);

        if (!player) {
            return message.reply("I'm not connected to a voice channel!");
        }

        player.destroy();
        return message.reply("👋 Disconnected from the voice channel and cleared the queue.");
    }
}
