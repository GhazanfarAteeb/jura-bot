import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    
    // Currency
    coins: {
        type: Number,
        default: 0
    },
    bank: {
        type: Number,
        default: 0
    },
    
    // Daily rewards
    daily: {
        lastClaimed: Date,
        streak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 }
    },
    
    // Timed rewards (customizable intervals)
    timedRewards: [{
        commandName: String,
        lastClaimed: Date,
        claimCount: { type: Number, default: 0 }
    }],
    
    // Profile customization
    profile: {
        background: { type: String, default: 'default' },
        backgroundColor: { type: String, default: '#2C2F33' },
        overlayColor: { type: String, default: '#000000' }, // Hex color for user overlay
        overlayOpacity: { type: Number, default: 0.5, min: 0, max: 1 }, // User overlay opacity 0-1
        description: { type: String, default: '', maxlength: 500 }, // Profile description
        title: { type: String, default: '' },
        badge: String,
        frame: String,
        showBadges: { type: Boolean, default: true },
        showStats: { type: Boolean, default: true }
    },
    
    // Inventory
    inventory: {
        backgrounds: [{ 
            id: String, 
            name: String,
            purchasedAt: { type: Date, default: Date.now }
        }],
        badges: [{
            id: String,
            name: String,
            earnedAt: { type: Date, default: Date.now }
        }],
        frames: [{
            id: String,
            name: String,
            purchasedAt: { type: Date, default: Date.now }
        }],
        items: [{
            id: String,
            name: String,
            quantity: { type: Number, default: 1 },
            purchasedAt: { type: Date, default: Date.now }
        }]
    },
    
    // Statistics
    stats: {
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        commandsUsed: { type: Number, default: 0 },
        messagesCount: { type: Number, default: 0 }
    },
    
    // Reputation system
    reputation: { type: Number, default: 0 },
    reputationGiven: [{ // Track who gave reputation
        userId: String,
        timestamp: Date
    }],
    reputationReceived: [{ // Track who they gave rep to
        userId: String,
        timestamp: Date
    }],
    
    // Adventure system
    lastAdventure: Date,
    adventuresCompleted: { type: Number, default: 0 },
    
    // Gambling statistics
    gamblingWins: { type: Number, default: 0 },
    gamblingLosses: { type: Number, default: 0 },
    gamblingTotal: { type: Number, default: 0 },
    
    // Transactions history (last 50)
    transactions: [{
        type: { type: String, enum: ['earn', 'spend', 'transfer', 'deposit', 'withdraw'] },
        amount: Number,
        description: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Compound index
economySchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Method to add coins
economySchema.methods.addCoins = async function(amount, description = 'Earned coins') {
    this.coins += amount;
    this.stats.totalEarned += amount;
    
    // Add transaction
    this.transactions.unshift({
        type: 'earn',
        amount,
        description,
        timestamp: new Date()
    });
    
    // Keep only last 50 transactions
    if (this.transactions.length > 50) {
        this.transactions = this.transactions.slice(0, 50);
    }
    
    await this.save();
    return this.coins;
};

// Method to remove coins
economySchema.methods.removeCoins = async function(amount, description = 'Spent coins') {
    if (this.coins < amount) {
        throw new Error('Insufficient coins');
    }
    
    this.coins -= amount;
    this.stats.totalSpent += amount;
    
    // Add transaction
    this.transactions.unshift({
        type: 'spend',
        amount,
        description,
        timestamp: new Date()
    });
    
    // Keep only last 50 transactions
    if (this.transactions.length > 50) {
        this.transactions = this.transactions.slice(0, 50);
    }
    
    await this.save();
    return this.coins;
};

// Method to check if daily can be claimed
economySchema.methods.canClaimDaily = function() {
    if (!this.daily.lastClaimed) return true;
    
    const now = new Date();
    const lastClaim = new Date(this.daily.lastClaimed);
    
    // Check if it's a new day
    const diffTime = Math.abs(now - lastClaim);
    const diffHours = diffTime / (1000 * 60 * 60);
    
    return diffHours >= 24;
};

// Method to check streak
economySchema.methods.checkStreak = function() {
    if (!this.daily.lastClaimed) return true; // First time claiming
    
    const now = new Date();
    const lastClaim = new Date(this.daily.lastClaimed);
    
    // Check if claimed within 48 hours (grace period)
    const diffTime = Math.abs(now - lastClaim);
    const diffHours = diffTime / (1000 * 60 * 60);
    
    return diffHours <= 48;
};

// Method to claim daily
economySchema.methods.claimDaily = async function() {
    if (!this.canClaimDaily()) {
        const now = new Date();
        const lastClaim = new Date(this.daily.lastClaimed);
        const diffTime = Math.abs(now - lastClaim);
        const hoursLeft = 24 - (diffTime / (1000 * 60 * 60));
        throw new Error(`You already claimed today! Come back in ${Math.ceil(hoursLeft)} hours`);
    }
    
    // Check streak
    const hasStreak = this.checkStreak();
    
    if (hasStreak) {
        this.daily.streak += 1;
        if (this.daily.streak > this.daily.longestStreak) {
            this.daily.longestStreak = this.daily.streak;
        }
    } else {
        this.daily.streak = 1;
    }
    
    this.daily.lastClaimed = new Date();
    
    // Calculate reward (base + streak bonus)
    const baseReward = 500;
    const streakBonus = Math.min(this.daily.streak * 50, 1000); // Max 1000 bonus
    const totalReward = baseReward + streakBonus;
    
    await this.addCoins(totalReward, `Daily reward (${this.daily.streak} day streak)`);
    
    return {
        amount: totalReward,
        streak: this.daily.streak,
        baseReward,
        streakBonus
    };
};

// Method to check if timed reward can be claimed
economySchema.methods.canClaimTimed = function(commandName, intervalMinutes) {
    const reward = this.timedRewards.find(r => r.commandName === commandName);
    
    if (!reward || !reward.lastClaimed) return true;
    
    const now = new Date();
    const lastClaim = new Date(reward.lastClaimed);
    const diffMinutes = (now - lastClaim) / (1000 * 60);
    
    return diffMinutes >= intervalMinutes;
};

// Method to claim timed reward
economySchema.methods.claimTimed = async function(commandName, intervalMinutes, amount, description) {
    if (!this.canClaimTimed(commandName, intervalMinutes)) {
        const reward = this.timedRewards.find(r => r.commandName === commandName);
        const now = new Date();
        const lastClaim = new Date(reward.lastClaimed);
        const diffMinutes = (now - lastClaim) / (1000 * 60);
        const minutesLeft = Math.ceil(intervalMinutes - diffMinutes);
        
        throw new Error(`You can claim this reward again in ${minutesLeft} minute(s)`);
    }
    
    const rewardIndex = this.timedRewards.findIndex(r => r.commandName === commandName);
    
    if (rewardIndex === -1) {
        this.timedRewards.push({
            commandName,
            lastClaimed: new Date(),
            claimCount: 1
        });
    } else {
        this.timedRewards[rewardIndex].lastClaimed = new Date();
        this.timedRewards[rewardIndex].claimCount += 1;
    }
    
    await this.addCoins(amount, description);
    
    return amount;
};

// Static method to get or create economy data
economySchema.statics.getEconomy = async function(userId, guildId) {
    let economy = await this.findOne({ userId, guildId });
    
    if (!economy) {
        economy = await this.create({
            userId,
            guildId,
            inventory: {
                backgrounds: [{ id: 'default', name: 'Default' }]
            }
        });
    }
    
    return economy;
};

export default mongoose.model('Economy', economySchema);
