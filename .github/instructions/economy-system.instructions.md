---
description: "Use when writing or modifying economy commands, currency logic, shop systems, gambling/minigames, XP/level systems, or the Economy/Level Mongoose models. Covers coin operations, daily rewards, streak logic, timed cooldowns, transaction logging, and profile systems."
applyTo:
  [
    "src/commands/economy/**/*.js",
    "src/models/Economy.js",
    "src/models/Level.js",
    "src/utils/shopItems.js",
  ]
---

# Economy & Currency System Patterns

## Economy Model — Key API

Always use `Economy.getEconomy(userId, guildId)` — this upserts and never returns null.

```js
import Economy from "../../models/Economy.js";

const eco = await Economy.getEconomy(message.author.id, message.guild.id);
```

**Never** use `Economy.findOne()` or `new Economy()` directly in commands.

## Coin Operations

Use the built-in instance methods — they log the transaction automatically:

```js
// Add coins to wallet
await eco.addCoins(500, "Daily reward");

// Remove coins from wallet
await eco.removeCoins(200, "Shop purchase");

// Manual balance mutation (use only when addCoins/removeCoins don't apply)
eco.coins += amount;
eco.stats.totalEarned += amount;
eco.transactions.push({
  type: "earn",
  amount,
  description: "reason",
  date: new Date(),
});
await eco.save();
```

## Wallet vs Bank

- `eco.coins` — liquid wallet balance (used for most transactions)
- `eco.bank` — stored bank balance (requires explicit deposit/withdraw)
- Always validate `eco.coins >= amount` before `removeCoins()` to prevent negative balances.

```js
if (eco.coins < amount) {
  return message.reply({ embeds: [insufficientFundsEmbed(client, eco.coins)] });
}
```

## Daily Reward Pattern

```js
const canClaim = eco.canClaimDaily(); // returns boolean
if (!canClaim) {
  const nextClaim = new Date(eco.daily.lastClaimed.getTime() + 86_400_000);
  return message.reply({ embeds: [alreadyClaimedEmbed(client, nextClaim)] });
}

const { amount, streak } = await eco.claimDaily();
// Daily formula: 500 + min(streak * 50, 1000)
```

## Timed Reward Cooldowns (work, crime, etc.)

```js
const INTERVAL_MINUTES = 60; // command-specific cooldown

const canClaim = eco.canClaimTimed("work", INTERVAL_MINUTES);
if (!canClaim) {
  const lastClaim = eco.timedRewards.find(
    (r) => r.commandName === "work",
  )?.lastClaimed;
  const nextClaim = new Date(lastClaim.getTime() + INTERVAL_MINUTES * 60_000);
  return message.reply({ embeds: [cooldownEmbed(client, nextClaim)] });
}

const reward =
  Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
await eco.claimTimed("work", INTERVAL_MINUTES, reward, "Work shift completed");
```

## Gambling / Minigame Pattern

All gambling commands must:

1. Validate bet is a positive integer and does not exceed wallet balance.
2. Accept `'all'` or `'max'` as bet aliases for full wallet.
3. Record win/loss to gambling stats.
4. Use named constants for payout multipliers — no magic numbers.

```js
const BET_MIN = 10;
const BET_MAX = 100_000;

let bet;
if (args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "max") {
  bet = eco.coins;
} else {
  bet = parseInt(args[0], 10);
}

if (isNaN(bet) || bet < BET_MIN) {
  return message.reply({ embeds: [invalidBetEmbed(client, BET_MIN)] });
}
if (bet > eco.coins) {
  return message.reply({ embeds: [insufficientFundsEmbed(client, eco.coins)] });
}
if (bet > BET_MAX) {
  return message.reply({ embeds: [betLimitEmbed(client, BET_MAX)] });
}

// After result:
eco.gambling.totalGames += 1;
eco.gambling.totalBet += bet;
if (won) {
  eco.gambling.wins += 1;
  await eco.addCoins(winnings, "Blackjack win");
} else {
  eco.gambling.losses += 1;
  await eco.removeCoins(bet, "Blackjack loss");
}
```

## XP / Level System (Level model — separate from Economy)

```js
import Level from "../../models/Level.js";

// Always use upsert pattern
let levelData = await Level.findOneAndUpdate(
  { userId: message.author.id, guildId: message.guild.id },
  { $setOnInsert: { userId: message.author.id, guildId: message.guild.id } },
  { upsert: true, new: true },
);
```

XP is gated by `xpCooldown` (default 60s) per user per guild. Check `guildConfig.xp.xpCooldown` before awarding.

XP per message: random between `guildConfig.xp.minXpPerMessage` (15) and `guildConfig.xp.maxXpPerMessage` (25).

Level-up formula follows the standard XP curve — use the existing `calculateLevel()` utility from `src/structures/Utils.js`.

## Inventory & Shop Items

```js
// Check if user owns an item
const ownsItem = eco.inventory.backgrounds.some((b) => b.itemId === itemId);

// Add to inventory
eco.inventory.backgrounds.push({ itemId, name, purchasedAt: new Date() });
eco.stats.totalSpent += price;
await eco.removeCoins(price, `Purchased ${name}`);
await eco.save();
```

Shop item definitions live in `src/utils/shopItems.js` — never hardcode item data in command files.

## Transaction History

- Max 50 entries (trimmed automatically by the model pre-save hook).
- Types: `'earn'` | `'spend'` | `'transfer'` | `'deposit'` | `'withdraw'`.
- Always include a human-readable `description`.

## Reputation System

```js
// 24-hour cooldown enforced by reputationGiven array
const lastGiven = eco.reputationGiven.find((r) => r.userId === target.id);
const cooldownMs = 24 * 60 * 60 * 1000;
if (lastGiven && Date.now() - lastGiven.date.getTime() < cooldownMs) {
  return message.reply({ embeds: [repCooldownEmbed(client)] });
}

eco.reputationGiven.push({ userId: target.id, date: new Date() });
await eco.save();

const targetEco = await Economy.getEconomy(target.id, message.guild.id);
targetEco.reputation += 1;
targetEco.reputationReceived.push({
  userId: message.author.id,
  date: new Date(),
});
await targetEco.save();
```
