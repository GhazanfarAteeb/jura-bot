const { Client, Message } = require("discord.js");

module.exports = {
    name: "skip",
    aliases: ["s", "next"],
    description: "Skip to the next song",
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
            return message.reply("Nothing is currently playing!");
        }

        const currentTrack = player.current;
        player.stop();

        return message.reply(`⏭️ Skipped **${currentTrack?.info?.title || 'the current track'}**.`);
    }
}
