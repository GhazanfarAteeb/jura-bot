import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Level from '../../models/Level.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'award',
  description: 'Award or deduct XP, coins, or reputation from a user (Admin only)',
  usage: '<xp|coins|rep> <@user> <amount>',
  category: 'admin',
  aliases: ['give', 'take', 'modify'],
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,
  examples: [
    'award xp @user 500',
    'award coins @user -100',
    'award rep @user 5',
    'award xp @user -1000'
  ],

  async execute(message, args) {
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);

    // No args - show help
    if (!args[0]) {
      return showHelp(message, prefix);
    }

    const type = args[0].toLowerCase();
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[2]);

    // Validate type
    if (!['xp', 'coins', 'coin', 'rep', 'reputation', 'money'].includes(type)) {
      return showHelp(message, prefix);
    }

    // Validate user
    if (!targetUser) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Missing User',
          `Please mention a user!\n\nUsage: \`${prefix}award <type> @user <amount>\``)]
      });
    }

    // Validate amount
    if (isNaN(amount) || amount === 0) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid Amount',
          `Please provide a valid amount (positive to add, negative to remove).\n\nUsage: \`${prefix}award <type> @user <amount>\``)]
      });
    }

    // Limit amount range
    if (Math.abs(amount) > 10000000) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Amount Too Large',
          'Maximum amount is 10,000,000 per transaction.')]
      });
    }

    const guildConfig = await Guild.getGuild(guildId);
    const isAdding = amount > 0;
    const absAmount = Math.abs(amount);

    try {
      let result;
      switch (type) {
        case 'xp':
          result = await handleXP(targetUser, guildId, amount, message.author);
          break;
        case 'coins':
        case 'coin':
        case 'money':
          result = await handleCoins(targetUser, guildId, amount, message.author, guildConfig);
          break;
        case 'rep':
        case 'reputation':
          result = await handleRep(targetUser, guildId, amount, message.author);
          break;
      }

      const actionWord = isAdding ? 'Added' : 'Removed';
      const embed = await successEmbed(guildId,
        `${result.emoji} ${result.typeName} ${actionWord}!`,
        `${GLYPHS.SUCCESS} Successfully ${isAdding ? 'added' : 'removed'} **${absAmount.toLocaleString()}** ${result.emoji} ${result.typeName.toLowerCase()} ${isAdding ? 'to' : 'from'} ${targetUser}!\n\n` +
        `**${targetUser.username}'s New ${result.typeName}:** ${result.newValue.toLocaleString()} ${result.emoji}` +
        (result.levelInfo ? `\n${result.levelInfo}` : '')
      );

      await message.reply({ embeds: [embed] });

      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(isAdding ? '#00FF00' : '#FF6B6B')
          .setTitle(`${result.emoji} ${result.typeName} ${actionWord}`)
          .setDescription(
            `An administrator in **${message.guild.name}** has ${isAdding ? 'given you' : 'removed'} **${absAmount.toLocaleString()}** ${result.emoji} ${result.typeName.toLowerCase()}.\n\n` +
            `**Your new ${result.typeName.toLowerCase()}:** ${result.newValue.toLocaleString()} ${result.emoji}`
          )
          .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
      } catch {
        // User has DMs disabled
      }

    } catch (error) {
      console.error('Error in award command:', error);
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Error', 'An error occurred while processing the award.')]
      });
    }
  }
};

async function showHelp(message, prefix) {
  const embed = await infoEmbed(message.guild.id,
    '🎁 Award Command',
    `Award or deduct XP, coins, or reputation from users.\n\n` +
    `**Usage:**\n` +
    `\`${prefix}award <type> @user <amount>\`\n\n` +
    `**Types:**\n` +
    `${GLYPHS.DOT} \`xp\` - Experience points\n` +
    `${GLYPHS.DOT} \`coins\` - Currency\n` +
    `${GLYPHS.DOT} \`rep\` - Reputation\n\n` +
    `**Examples:**\n` +
    `${GLYPHS.DOT} \`${prefix}award xp @user 500\` - Add 500 XP\n` +
    `${GLYPHS.DOT} \`${prefix}award coins @user -100\` - Remove 100 coins\n` +
    `${GLYPHS.DOT} \`${prefix}award rep @user 5\` - Add 5 reputation\n\n` +
    `**Note:** Use negative numbers to deduct!`
  );
  return message.reply({ embeds: [embed] });
}

async function handleXP(user, guildId, amount, admin) {
  let levelData = await Level.findOne({ userId: user.id, guildId });

  if (!levelData) {
    levelData = new Level({
      userId: user.id,
      guildId,
      username: user.username
    });
  }

  // Handle negative XP
  if (amount < 0) {
    const absAmount = Math.abs(amount);
    // Remove from totalXP first
    levelData.totalXP = Math.max(0, levelData.totalXP - absAmount);
    // Remove from current XP
    levelData.xp = Math.max(0, levelData.xp - absAmount);

    // Recalculate level based on totalXP
    let newLevel = 0;
    let xpNeeded = 0;
    let accumulatedXP = 0;

    // Calculate what level they should be at based on totalXP
    while (true) {
      const xpForLevel = Math.floor(100 + (newLevel * 50) + Math.pow(newLevel, 1.5) * 25);
      if (accumulatedXP + xpForLevel > levelData.totalXP) {
        levelData.level = newLevel;
        levelData.xp = levelData.totalXP - accumulatedXP;
        break;
      }
      accumulatedXP += xpForLevel;
      newLevel++;
      if (newLevel > 1000) break; // Safety limit
    }
  } else {
    // Add XP normally
    const leveledUp = levelData.addXP(amount);
  }

  levelData.username = user.username;
  await levelData.save();

  return {
    emoji: '✨',
    typeName: 'XP',
    newValue: levelData.totalXP,
    levelInfo: `**Level:** ${levelData.level} • **Current XP:** ${levelData.xp}/${levelData.xpForNextLevel()}`
  };
}

async function handleCoins(user, guildId, amount, admin, guildConfig) {
  const economy = await Economy.getEconomy(user.id, guildId);

  if (amount < 0) {
    const absAmount = Math.abs(amount);
    // Deduct from wallet first, then bank if needed
    if (economy.coins >= absAmount) {
      economy.coins -= absAmount;
    } else {
      const remaining = absAmount - economy.coins;
      economy.coins = 0;
      economy.bank = Math.max(0, economy.bank - remaining);
    }
  } else {
    economy.coins += amount;
    economy.stats.totalEarned = (economy.stats.totalEarned || 0) + amount;
  }

  await economy.save();

  const coinEmoji = guildConfig.economy?.coinEmoji || '💰';

  return {
    emoji: coinEmoji,
    typeName: 'Coins',
    newValue: economy.coins + economy.bank,
    levelInfo: `**Wallet:** ${economy.coins.toLocaleString()} • **Bank:** ${economy.bank.toLocaleString()}`
  };
}

async function handleRep(user, guildId, amount, admin) {
  const economy = await Economy.getEconomy(user.id, guildId);

  if (amount < 0) {
    economy.reputation = Math.max(0, economy.reputation - Math.abs(amount));
  } else {
    economy.reputation = (economy.reputation || 0) + amount;
  }

  await economy.save();

  return {
    emoji: '⭐',
    typeName: 'Reputation',
    newValue: economy.reputation
  };
}
