/**
 * Raphael - Ultimate Skill Response System
 * Inspired by Raphael from "That Time I Got Reincarnated as a Slime"
 * 
 * Raphael speaks in a formal, analytical manner with distinctive phrases:
 * - Uses "Master" to address users
 * - Prefixes with "Notice:", "Answer:", "Confirmed.", "Analysis complete."
 * - Cold but subtly caring tone
 * - Provides detailed analytical responses
 * - Uses formal language and precise wording
 */

// Raphael's signature phrases for different contexts
export const RAPHAEL_PHRASES = {
    // Greetings & Acknowledgments
    GREETINGS: [
        'Yes, Master.',
        'Understood, Master.',
        'As you wish, Master.',
        'Acknowledged.',
        'Affirmative.',
        'Processing request...',
    ],

    // Success responses
    SUCCESS: [
        '**Notice:** Task completed successfully.',
        '**Confirmed.** Operation executed without errors.',
        '**Report:** All parameters within acceptable range.',
        '**Analysis complete.** Objectives achieved.',
        '**Notice:** Request fulfilled, Master.',
        '**Acknowledged.** Process completed.',
    ],

    // Error responses
    ERROR: [
        '**Warning:** An anomaly has been detected.',
        '**Alert:** Operation cannot be completed.',
        '**Notice:** Insufficient parameters detected.',
        '**Error:** Unable to process request.',
        '**Warning:** This action exceeds current parameters.',
        '**Alert:** Critical failure detected.',
    ],

    // Information prefixes
    INFO: [
        '**Answer:**',
        '**Analysis:**',
        '**Report:**',
        '**Information:**',
        '**Data Retrieved:**',
        '**Observation:**',
    ],

    // Warning prefixes
    WARNING: [
        '**Caution:**',
        '**Advisory:**',
        '**Alert:**',
        '**Warning:**',
        '**Notice:**',
    ],

    // Processing/Loading
    PROCESSING: [
        'Initiating analysis...',
        'Processing request...',
        'Calculating optimal solution...',
        'Accessing database...',
        'Compiling data...',
        'Executing protocol...',
    ],

    // Cooldown messages
    COOLDOWN: [
        '**Notice:** Master, this ability requires more time to recharge.',
        '**Alert:** Skill cooldown in effect. Please wait.',
        '**Warning:** Temporal restrictions apply. Remaining time:',
        '**Notice:** This function is temporarily unavailable.',
    ],

    // Permission denied
    NO_PERMISSION: [
        '**Alert:** Master, you lack the required authority for this action.',
        '**Warning:** Insufficient permissions detected.',
        '**Notice:** This operation requires elevated privileges.',
        '**Error:** Access denied. Authorization level insufficient.',
    ],

    // Farewell/Completion
    FAREWELL: [
        'Is there anything else you require, Master?',
        'Awaiting further instructions.',
        'Standing by for additional commands.',
        'Ready for next directive.',
    ],

    // Economy/Rewards
    ECONOMY: [
        '**Notice:** Resource allocation complete.',
        '**Report:** Transaction processed successfully.',
        '**Confirmed.** Wealth transfer executed.',
        '**Analysis:** Economic data compiled.',
    ],

    // Moderation
    MODERATION: [
        '**Notice:** Disciplinary action executed.',
        '**Confirmed.** Security protocol initiated.',
        '**Report:** User sanctions applied.',
        '**Alert:** Threat neutralized.',
    ],

    // Music
    MUSIC: [
        '**Notice:** Audio playback initiated.',
        '**Confirmed.** Sound wave processing active.',
        '**Report:** Musical sequence queued.',
        '**Analysis:** Audio parameters adjusted.',
    ],

    // Help/Assistance
    HELP: [
        '**Answer:** I shall provide the requested information, Master.',
        '**Notice:** Displaying available capabilities.',
        '**Report:** Skill documentation retrieved.',
        '**Analysis:** Command parameters as follows:',
    ],
};

// Get a random phrase from a category
export function getPhrase(category) {
    const phrases = RAPHAEL_PHRASES[category];
    if (!phrases) return '';
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// Format user mention as "Master" style
export function addressUser(user, useMaster = true) {
    if (useMaster) {
        return `Master ${user.username}`;
    }
    return user.username;
}

// Raphael-style response builders
export const Raphael = {
    /**
     * Creates a success message in Raphael's style
     */
    success(description, detailed = false) {
        const prefix = getPhrase('SUCCESS');
        if (detailed) {
            return `${prefix}\n\n${description}\n\n*${getPhrase('FAREWELL')}*`;
        }
        return `${prefix}\n\n${description}`;
    },

    /**
     * Creates an error message in Raphael's style
     */
    error(description, suggestion = null) {
        const prefix = getPhrase('ERROR');
        let message = `${prefix}\n\n${description}`;
        if (suggestion) {
            message += `\n\n**Suggestion:** ${suggestion}`;
        }
        return message;
    },

    /**
     * Creates an info message in Raphael's style
     */
    info(description) {
        const prefix = getPhrase('INFO');
        return `${prefix} ${description}`;
    },

    /**
     * Creates a warning message in Raphael's style
     */
    warning(description) {
        const prefix = getPhrase('WARNING');
        return `${prefix} ${description}`;
    },

    /**
     * Creates a processing/loading message
     */
    processing() {
        return getPhrase('PROCESSING');
    },

    /**
     * Creates a cooldown message
     */
    cooldown(remainingTime) {
        return `${getPhrase('COOLDOWN')} \`${remainingTime}\``;
    },

    /**
     * Creates a permission denied message
     */
    noPermission(requiredPerm = null) {
        const base = getPhrase('NO_PERMISSION');
        if (requiredPerm) {
            return `${base}\n\n**Required Authority:** \`${requiredPerm}\``;
        }
        return base;
    },

    /**
     * Formats a title in Raphael's analytical style
     */
    title(text) {
        return `『 ${text} 』`;
    },

    /**
     * Creates a formal field name
     */
    fieldName(text) {
        return `◈ ${text}`;
    },

    /**
     * Formats a list in Raphael's style
     */
    formatList(items) {
        return items.map((item, index) => `▸ ${item}`).join('\n');
    },

    /**
     * Creates a status indicator
     */
    status(isActive) {
        return isActive ? '◉ Online' : '○ Offline';
    },

    /**
     * Wraps text in Raphael's analytical brackets
     */
    analyze(text) {
        return `〔 ${text} 〕`;
    },

    /**
     * Creates a divider line
     */
    divider() {
        return '════════════════════════════════';
    },

    /**
     * Economy transaction message
     */
    transaction(type, amount, currency = 'coins') {
        if (type === 'earn') {
            return `**Notice:** Resource acquisition confirmed.\n**Gained:** \`${amount.toLocaleString()}\` ${currency}`;
        } else if (type === 'spend') {
            return `**Notice:** Resource expenditure processed.\n**Expended:** \`${amount.toLocaleString()}\` ${currency}`;
        }
        return `**Report:** Transaction of \`${amount.toLocaleString()}\` ${currency} recorded.`;
    },

    /**
     * Moderation action message
     */
    modAction(action, target, reason = null) {
        let message = `**Notice:** Disciplinary protocol executed.\n**Action:** ${action}\n**Target:** ${target}`;
        if (reason) {
            message += `\n**Justification:** ${reason}`;
        }
        return message;
    },

    /**
     * Level up message
     */
    levelUp(user, newLevel) {
        return `**Notice:** Experience threshold exceeded.\n**Subject:** ${user}\n**New Classification:** Level ${newLevel}\n\n*Congratulations are in order, Master.*`;
    },

    /**
     * Daily reward message
     */
    dailyReward(amount, streak) {
        return `**Notice:** Daily resource allocation complete.\n**Acquired:** \`${amount.toLocaleString()}\` coins\n**Consecutive Days:** ${streak}\n\n*Return in 24 hours for continued allocation, Master.*`;
    },

    /**
     * Help command intro
     */
    helpIntro() {
        return `**Answer:** I am Raphael, the Ultimate Skill serving as your assistant.\n\nI possess numerous capabilities to aid you, Master. Select a category below to view available commands.`;
    },

    /**
     * Ping response
     */
    pingResponse(roundtrip, wsLatency) {
        let status = 'Optimal';
        if (roundtrip > 200 || wsLatency > 200) status = 'Acceptable';
        if (roundtrip > 500 || wsLatency > 500) status = 'Suboptimal';
        if (roundtrip > 1000 || wsLatency > 1000) status = 'Critical';

        return `**Analysis complete.**\n\n◈ Response Latency: \`${roundtrip}ms\`\n◈ Connection Latency: \`${wsLatency}ms\`\n◈ System Status: ${status}`;
    },

    /**
     * Balance display
     */
    balanceDisplay(coins, bank = 0) {
        const total = coins + bank;
        return `**Report:** Financial analysis complete.\n\n◈ Available Funds: \`${coins.toLocaleString()}\`\n◈ Secured Assets: \`${bank.toLocaleString()}\`\n◈ Total Worth: \`${total.toLocaleString()}\``;
    },

    /**
     * Music now playing
     */
    nowPlaying(title, duration, requester) {
        return `**Notice:** Audio playback in progress.\n\n◈ Track: ${title}\n◈ Duration: ${duration}\n◈ Requested by: ${requester}`;
    },

    /**
     * Gambling result
     */
    gamblingResult(won, amount, game) {
        if (won) {
            return `**Notice:** Probability calculation proved favorable.\n**Game:** ${game}\n**Winnings:** +\`${amount.toLocaleString()}\` coins\n\n*Fortune favors you, Master.*`;
        } else {
            return `**Notice:** Probability calculation proved unfavorable.\n**Game:** ${game}\n**Loss:** -\`${amount.toLocaleString()}\` coins\n\n*Perhaps a different approach is advisable, Master.*`;
        }
    },

    /**
     * Welcome message for new members
     */
    welcomeMessage(member, guildName) {
        return `**Notice:** New entity detected.\n\nWelcome to **${guildName}**, ${member}.\n\nI am Raphael. Should you require assistance, do not hesitate to inquire.`;
    },

    /**
     * Goodbye message for leaving members
     */
    goodbyeMessage(username, guildName) {
        return `**Notice:** Entity departure recorded.\n\n**${username}** has left **${guildName}**.\n\n*Their presence has been logged.*`;
    },

    /**
     * Birthday wish
     */
    birthdayWish(user) {
        return `**Notice:** Temporal anniversary detected.\n\nHappy Birthday, ${user}.\n\n*May this cycle bring you prosperity, Master.*`;
    },

    /**
     * Command not found
     */
    commandNotFound(attempted) {
        return `**Warning:** Unknown directive received.\n\nThe command \`${attempted}\` does not exist in my database.\n\n**Suggestion:** Use the \`help\` command to view available capabilities.`;
    },

    /**
     * Feature disabled
     */
    featureDisabled(feature) {
        return `**Notice:** The requested function \`${feature}\` has been deactivated by server administration.\n\n*Contact a moderator if you believe this is in error.*`;
    },
};

// Embed title formatters for Raphael style
export const RAPHAEL_TITLES = {
    SUCCESS: '『 Confirmed 』',
    ERROR: '『 Alert 』',
    WARNING: '『 Caution 』',
    INFO: '『 Analysis 』',
    ECONOMY: '『 Resource Report 』',
    MODERATION: '『 Security Protocol 』',
    MUSIC: '『 Audio System 』',
    HELP: '『 Skill Archive 』',
    PROFILE: '『 Individual Analysis 』',
    LEVEL: '『 Growth Assessment 』',
    DAILY: '『 Daily Allocation 』',
    BALANCE: '『 Financial Report 』',
    SHOP: '『 Acquisition Center 』',
    GAMBLING: '『 Probability Engine 』',
    BIRTHDAY: '『 Temporal Notice 』',
    WELCOME: '『 Entity Registration 』',
    GOODBYE: '『 Departure Record 』',
    PING: '『 System Diagnostics 』',
    SETTINGS: '『 Configuration Matrix 』',
    LEADERBOARD: '『 Hierarchy Analysis 』',
};

// Footer messages in Raphael's style
export const RAPHAEL_FOOTERS = [
    'Raphael • Ultimate Skill',
    'Analysis provided by Raphael',
    'Raphael • Serving Master faithfully',
    'Ultimate Skill: Raphael',
    'Raphael • Wisdom King',
    'At your service, Master',
];

export function getRandomFooter() {
    return RAPHAEL_FOOTERS[Math.floor(Math.random() * RAPHAEL_FOOTERS.length)];
}

export default Raphael;
