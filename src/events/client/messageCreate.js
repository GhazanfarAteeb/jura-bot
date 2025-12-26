
import Event from "../../structures/Event.js";
import { ChannelType, Collection, PermissionFlagsBits } from "discord.js";
import Context from "../../structures/Context.js";

class MessageCreate extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "messageCreate",
    });
  }
  async run(message) {
    // Early returns for performance
    if (message.author.bot || !message.guild) return;

    const mention = new RegExp(`^<@!?${this.client.user.id}>( |)$`);

    // Get prefix (cached) - removed hardcoded check to support custom prefixes
    const currentPrefix = await this.client.db.getPrefix(message.guildId);

    // Check setup (don't await unless needed)
    const setupPromise = this.client.db.getSetup(message.guildId);

    // Helper to safely reply (handles deleted messages)
    const safeReply = async (options) => {
      try {
        return await message.reply(options);
      } catch (error) {
        // Message was deleted (e.g., by automod) - try channel.send instead
        if (error.code === 50035 || error.code === 10008) {
          return await message.channel.send(options).catch(() => null);
        }
        throw error;
      }
    };

    if (message.content.match(mention)) {
      await safeReply({
        content: `Hey, my prefix for this server is \`${currentPrefix}\` Want more info? then do \`${currentPrefix}help\`\nStay Safe, Stay Awesome!`,
      });
      return;
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixRegex = new RegExp(
      `^(<@!?${this.client.user.id}>|${escapeRegex(currentPrefix)})\\s*`,
      'i' // Case insensitive flag
    );
    if (!prefixRegex.test(message.content)) return;

    // Check setup now
    const setup = await setupPromise;
    if (setup && setup.textId && setup.textId === message.channelId) {
      return this.client.emit("setupSystem", message);
    }

    const [matchedPrefix] = message.content.match(prefixRegex);
    const args = message.content
      .slice(matchedPrefix.length)
      .trim()
      .split(/ +/g);
    const cmd = args.shift().toLowerCase();
    const command =
      this.client.commands.get(cmd) ||
      this.client.commands.get(this.client.aliases.get(cmd));
    if (!command) return;
    // Cache bot member for permission checks
    const botMember = message.guild.members.me;
    const botPerms = botMember.permissions;

    // Quick permission checks - exit early if missing critical permissions
    if (!botPerms.has(PermissionFlagsBits.SendMessages)) return;
    if (!botPerms.has(PermissionFlagsBits.EmbedLinks)) {
      return safeReply({ content: "I don't have **`EmbedLinks`** permission." });
    }

    const ctx = new Context(message, args);
    ctx.setArgs(args);
    if (command.permissions) {
      if (command.permissions.client) {
        if (
          !message.guild.members.me.permissions.has(command.permissions.client)
        )
          return await safeReply({
            content: "I don't have enough permissions to execute this command.",
          });
      }
      if (command.permissions.user) {
        if (!message.member.permissions.has(command.permissions.user))
          return await safeReply({
            content: "You don't have enough permissions to use this command.",
          });
      }
      if (command.permissions.dev) {
        if (this.client.config.owners) {
          const findDev = this.client.config.owners.find(
            (x) => x === message.author.id
          );
          if (!findDev) return;
        }
      }
    }
    if (command.player) {
      if (command.player.voice) {
        if (!message.member.voice.channel)
          return await safeReply({
            content: `You must be connected to a voice channel to use this \`${command.name}\` command.`,
          });
        if (
          !message.guild.members.me.permissions.has(PermissionFlagsBits.Speak)
        )
          return await safeReply({
            content: `I don't have \`CONNECT\` permissions to execute this \`${command.name}\` command.`,
          });
        if (
          !message.guild.members.me.permissions.has(PermissionFlagsBits.Speak)
        )
          return await safeReply({
            content: `I don't have \`SPEAK\` permissions to execute this \`${command.name}\` command.`,
          });
        if (
          message.member.voice.channel.type === ChannelType.GuildStageVoice &&
          !message.guild.members.me.permissions.has(
            PermissionFlagsBits.RequestToSpeak
          )
        )
          return await safeReply({
            content: `I don't have \`REQUEST TO SPEAK\` permission to execute this \`${command.name}\` command.`,
          });
        if (message.guild.members.me.voice.channel) {
          if (
            message.guild.members.me.voice.channelId !==
            message.member.voice.channelId
          )
            return await safeReply({
              content: `You are not connected to <#${message.guild.members.me.voice.channel.id}> to use this \`${command.name}\` command.`,
            });
        }
      }
      if (command.player.active) {
        const player = this.client.riffy?.players.get(message.guildId);
        if (!player)
          return await safeReply({
            content: "Nothing is playing right now.",
          });
        if ((!player.queue || player.queue.length === 0) && !player.current)
          return await safeReply({
            content: "Nothing is playing right now.",
          });
      }
      if (command.player.dj) {
        const dj = this.client.db.getDj(message.guildId);
        if (dj && dj.mode) {
          const djRole = this.client.db.getRoles(message.guildId);
          if (!djRole)
            return await safeReply({
              content: "DJ role is not set.",
            });
          const findDJRole = message.member.roles.cache.find((x) =>
            djRole.map((y) => y.roleId).includes(x.id)
          );
          if (!findDJRole) {
            if (
              !message.member.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
              const msg = await safeReply({
                content: "You need to have the DJ role to use this command.",
              });
              if (msg) setTimeout(() => msg.delete().catch(() => { }), 5000);
              return;
            }
          }
        }
      }
    }
    if (command.args) {
      if (!args.length) {
        const embed = this.client
          .embed()
          .setColor(this.client.color.red)
          .setTitle("Missing Arguments")
          .setDescription(
            `Please provide the required arguments for the \`${command.name
            }\` command.\n\nExamples:\n${command.description.examples
              ? command.description.examples.join("\n")
              : "None"
            }`
          )
          .setFooter({ text: "Syntax: [] = optional, <> = required" });
        return await safeReply({ embeds: [embed] });
      }
    }
    if (!this.client.cooldowns.has(cmd)) {
      this.client.cooldowns.set(cmd, new Collection());
    }
    const now = Date.now();
    const timestamps = this.client.cooldowns.get(cmd);
    const cooldownAmount = Math.floor(command.cooldown || 5) * 1000;
    if (!timestamps.has(message.author.id)) {
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    } else {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
      const timeLeft = (expirationTime - now) / 1000;
      if (now < expirationTime && timeLeft > 0.9) {
        return await safeReply({
          content: `Please wait ${timeLeft.toFixed(
            1
          )} more second(s) before reusing the \`${cmd}\` command.`,
        });
      }
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }
    if (args.includes("@everyone") || args.includes("@here"))
      return await safeReply({
        content: "You can't use this command with everyone or here.",
      });
    try {
      if (command.run) {
        return command.run(this.client, ctx, ctx.args);
      } else if (command.execute) {
        return command.execute(message, args, this.client);
      }
    } catch (error) {
      this.client.logger.error(error);
      await safeReply({ content: `An error occurred: \`${error}\`` });
      return;
    }
  }
};

export default MessageCreate;