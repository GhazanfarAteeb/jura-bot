
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
    
    // Quick content check - don't fetch anything if no prefix/mention
    const mention = new RegExp(`^<@!?${this.client.user.id}>( |)$`);
    const hasPrefix = message.content.startsWith('!') || 
                     message.content.startsWith('<@') || 
                     message.content.match(mention);
    
    if (!hasPrefix) return; // Exit early - no database call needed!

    // Get prefix (cached)
    const currentPrefix = await this.client.db.getPrefix(message.guildId);
    
    // Check setup (don't await unless needed)
    const setupPromise = this.client.db.getSetup(message.guildId);

    if (message.content.match(mention)) {
      await message.reply({
        content: `Hey, my prefix for this server is \`${currentPrefix}\` Want more info? then do \`${currentPrefix}help\`\nStay Safe, Stay Awesome!`,
      });
      return;
    }
    
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixRegex = new RegExp(
      `^(<@!?${this.client.user.id}>|${escapeRegex(currentPrefix)})\\s*`
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
      return message.reply({ content: "I don't have **`EmbedLinks`** permission." }).catch(() => { });
    }

    const ctx = new Context(message, args);
    ctx.setArgs(args);
    if (command.permissions) {
      if (command.permissions.client) {
        if (
          !message.guild.members.me.permissions.has(command.permissions.client)
        )
          return await message.reply({
            content: "I don't have enough permissions to execute this command.",
          });
      }
      if (command.permissions.user) {
        if (!message.member.permissions.has(command.permissions.user))
          return await message.reply({
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
          return await message.reply({
            content: `You must be connected to a voice channel to use this \`${command.name}\` command.`,
          });
        if (
          !message.guild.members.me.permissions.has(PermissionFlagsBits.Speak)
        )
          return await message.reply({
            content: `I don't have \`CONNECT\` permissions to execute this \`${command.name}\` command.`,
          });
        if (
          !message.guild.members.me.permissions.has(PermissionFlagsBits.Speak)
        )
          return await message.reply({
            content: `I don't have \`SPEAK\` permissions to execute this \`${command.name}\` command.`,
          });
        if (
          message.member.voice.channel.type === ChannelType.GuildStageVoice &&
          !message.guild.members.me.permissions.has(
            PermissionFlagsBits.RequestToSpeak
          )
        )
          return await message.reply({
            content: `I don't have \`REQUEST TO SPEAK\` permission to execute this \`${command.name}\` command.`,
          });
        if (message.guild.members.me.voice.channel) {
          if (
            message.guild.members.me.voice.channelId !==
            message.member.voice.channelId
          )
            return await message.reply({
              content: `You are not connected to <#${message.guild.members.me.voice.channel.id}> to use this \`${command.name}\` command.`,
            });
        }
      }
      if (command.player.active) {
        if (!this.client.queue.get(message.guildId))
          return await message.reply({
            content: "Nothing is playing right now.",
          });
        if (!this.client.queue.get(message.guildId).queue)
          return await message.reply({
            content: "Nothing is playing right now.",
          });
        if (!this.client.queue.get(message.guildId).current)
          return await message.reply({
            content: "Nothing is playing right now.",
          });
      }
      if (command.player.dj) {
        const dj = this.client.db.getDj(message.guildId);
        if (dj && dj.mode) {
          const djRole = this.client.db.getRoles(message.guildId);
          if (!djRole)
            return await message.reply({
              content: "DJ role is not set.",
            });
          const findDJRole = message.member.roles.cache.find((x) =>
            djRole.map((y) => y.roleId).includes(x.id)
          );
          if (!findDJRole) {
            if (
              !message.member.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
              return await message
                .reply({
                  content: "You need to have the DJ role to use this command.",
                })
                .then((msg) => setTimeout(() => msg.delete(), 5000));
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
        return await message.reply({ embeds: [embed] });
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
        return await message.reply({
          content: `Please wait ${timeLeft.toFixed(
            1
          )} more second(s) before reusing the \`${cmd}\` command.`,
        });
      }
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }
    if (args.includes("@everyone") || args.includes("@here"))
      return await message.reply({
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
      await message.reply({ content: `An error occurred: \`${error}\`` });
      return;
    }
  }
};

export default MessageCreate;