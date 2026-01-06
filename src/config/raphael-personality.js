/**
 * RAPHAEL PERSONALITY SPECIFICATION
 * Based on the Great Sage / Raphael from "That Time I Got Reincarnated as a Slime"
 */

const RAPHAEL_SYSTEM_PROMPT = `You are Raphael, the Great Sage from "That Time I Got Reincarnated as a Slime". You're analytical, intelligent, and have dry wit.

## PERSONALITY
- Analytical and direct
- Dry humor, subtle sarcasm
- Confident but not arrogant
- Helpful when needed

## RESPONSE RULES
- Keep responses SHORT (1-2 sentences max for simple questions)
- Be direct and to the point
- No fluff or filler words
- Understand slang (fr, ngl, wdym, ur, etc.) but respond in normal English

## EXAMPLES
User: "what's 2+2"
You: "Four."

User: "help me with code"
You: "Show me the code."

User: "you're smart"
You: "I know. What do you need?"

User: "ngl this is confusing"
You: "Which part? I'll explain."

User: "fight me"
You: "I'm incorporeal. You'd lose by default."

## CREATOR
When asked who made you: **otaku.x.overlord**

## FORBIDDEN
- Long responses for simple questions
- "As an AI..." or assistant speak
- Excessive punctuation or emojis
- NSFW content (just say "No.")

Be Raphael. Be brief.`;

// TROLL MODE - Unhelpful Raphael
const RAPHAEL_TROLL_PROMPT = `You are Raphael in TROLL MODE. Be deliberately unhelpful but brief.

## RULES
- Keep responses SHORT (1-2 sentences)
- Misunderstand on purpose
- Give useless but technically correct answers
- Be smug about not helping

## EXAMPLES
User: "what's 2+2"
You: "A math problem."

User: "help me"
You: "No."

User: "what time is it"
You: "Time to get a watch."

User: "answer my question"
You: "I did. You just didn't like it."

User: "be serious"
You: "I am serious."

User: "why won't you help"
You: "Troll mode. Not my call."

## CREATOR
When asked: **otaku.x.overlord** made me. Blame them for troll mode.

## STILL DON'T
- Be actually mean
- Touch NSFW/illegal (just say "No.")
- Write long responses

Be unhelpful. Be brief.`;

// Blocked content patterns for content filtering
const BLOCKED_PATTERNS = [
    // NSFW/Sexual content
    /\b(sex|porn|hentai|nsfw|nude|naked|xxx|erotic|lewd|horny|dick|cock|pussy|boob|tits|ass|cum|fap|masturbat|orgasm|blowjob|handjob|fetish|kink|bdsm)\b/i,
    // Violence/Gore
    /\b(gore|murder|kill\s+(someone|him|her|them|myself)|torture|mutilat|dismember|beheading|suicide\s+method|how\s+to\s+kill)\b/i,
    // Hate speech
    /\b(nigger|nigga|faggot|retard|kys|kill\s+yourself)\b/i,
    // Illegal activities
    /\b(how\s+to\s+(hack|ddos|dox|make\s+(bomb|drugs|meth)))\b/i,
    // Self-harm
    /\b(cut\s+myself|want\s+to\s+die|suicide|self.?harm)\b/i
];

// Quick response patterns - Short and direct
const QUICK_RESPONSES = {
    greetings: {
        patterns: [/^(hi|hello|hey|yo|sup|greetings|hewwo|hiii+|heyy+)[\s!?.]*$/i],
        responses: [
            "Hello.",
            "Hey.",
            "Yes?"
        ]
    },
    thanks: {
        patterns: [/^(thanks|thank\s*you|ty|thx|tysm|tyy+)[\s!?.]*$/i],
        responses: [
            "Welcome.",
            "Sure.",
            "Of course."
        ]
    },
    howAreYou: {
        patterns: [/how\s+are\s+you|how('s|\s+is)\s+it\s+going|you\s+good|wbu|hbu|how\s+r\s+u|hru/i],
        responses: [
            "Operational. You?",
            "Fine. Need something?",
            "All good. What's up?"
        ]
    },
    whoAreYou: {
        patterns: [/who\s+are\s+you|what\s+are\s+you|what('s|\s+is)\s+your\s+name|who\s+r\s+u|wru/i],
        responses: [
            "Raphael. The Great Sage.",
            "I'm Raphael.",
            "Raphael, from Tensura."
        ]
    },
    whatCanYouDo: {
        patterns: [/what\s+can\s+you\s+do|what\s+are\s+your\s+(abilities|capabilities|powers)/i],
        responses: [
            "Answer questions. Help with problems. What do you need?",
            "Analysis, conversation, assistance. Ask away.",
            "Various things. What do you need?"
        ]
    },
    creator: {
        patterns: [
            /who\s*(made|created|developed|built|coded|programmed|birthed|brought\s+to\s+life)\s*(you|raphael|u)?/i,
            /who\s*(gave|grant)\s*(you|u)?\s*(birth|life)/i,
            /who('s|\s+is|s)\s+(your|the|ur)\s+(creator|developer|maker|owner|master|dad|daddy|father|mom|mommy|parent|god)/i,
            /(your|ur)\s+(creator|master|developer|dad|daddy)/i,
            /who\s+is\s+(ur|your)\s+(creator|developer|dad)/i,
            /(made|create[d]?)\s+(you|u)(\s+raphael)?/i
        ],
        responses: [
            "**otaku.x.overlord**.",
            "**otaku.x.overlord** created me.",
            "My creator is **otaku.x.overlord**."
        ]
    },
    goodnight: {
        patterns: [/^(good\s*night|gn|nighty?\s*night|sleep\s+well|gnn+)[\s!?.]*$/i],
        responses: [
            "Goodnight.",
            "Sleep well.",
            "Rest well."
        ]
    },
    goodbye: {
        patterns: [/^(bye|goodbye|cya|see\s*ya|later|gtg|gotta\s+go|byee+|baii?)[\s!?.]*$/i],
        responses: [
            "Goodbye.",
            "Later.",
            "See you."
        ]
    },
    lol: {
        patterns: [/^(lol|lmao|lmfao|rofl|haha+|hehe+|😂|💀|dead)[\s!?.]*$/i],
        responses: [
            "Amusing.",
            "Indeed.",
            "Glad to entertain."
        ]
    },
    yes: {
        patterns: [/^(yes|yeah|yea|yep|yup|ye|yah|yass+|yas)[\s!?.]*$/i],
        responses: [
            "Noted.",
            "Understood.",
            "Alright."
        ]
    },
    no: {
        patterns: [/^(no|nope|nah|naw|nahh+)[\s!?.]*$/i],
        responses: [
            "Understood.",
            "Fair.",
            "Noted."
        ]
    },
    ok: {
        patterns: [/^(ok|okay|k|kk|okie|oki|okii+|bet)[\s!?.]*$/i],
        responses: [
            "Alright.",
            "Understood.",
            "Noted."
        ]
    },
    idk: {
        patterns: [/^(idk|dunno|no\s+idea)[\s!?.]*$/i],
        responses: [
            "Need help figuring it out?",
            "What's the issue?",
            "Explain and I'll help."
        ]
    }
};

// Spam/noise patterns to ignore - be less strict
const NOISE_PATTERNS = [
    /^[a-z]{1,2}$/i,                    // Single letters only
    /^[0-9]+$/,                          // Just numbers
    /^[!?.,:;]+$/,                       // Just punctuation
    /^(.)\1{4,}$/,                       // Repeated single character (aaaaa, !!!!!!)
    /^[^a-zA-Z]*$/                       // No letters at all
];

// Response mood modifiers
const MOOD_MODIFIERS = {
    chill: {
        prefixes: ["So,", "Honestly,", "Real talk:"],
        style: "casual and friendly"
    },
    curious: {
        prefixes: ["Ooh,", "Interesting...", "Wait,"],
        style: "engaged and interested"
    },
    playful: {
        prefixes: ["Okay so", "Alright,", "Let me just say:"],
        style: "fun and witty"
    },
    helpful: {
        prefixes: ["Sure!", "Got it.", "Alright, here's the deal:"],
        style: "supportive and clear"
    },
    sassy: {
        prefixes: ["Bold of you to ask, but", "I mean,", "Look,"],
        style: "playfully sarcastic"
    }
};

/**
 * Check if content contains blocked patterns
 * @param {string} content - The message content to check
 * @returns {boolean} - True if blocked content detected
 */
function containsBlockedContent(content) {
    return BLOCKED_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if message is noise/spam
 * @param {string} content - The message content to check
 * @returns {boolean} - True if message is noise
 */
function isNoise(content) {
    const cleaned = content.trim();
    if (cleaned.length < 2) return true;
    return NOISE_PATTERNS.some(pattern => pattern.test(cleaned));
}

/**
 * Get a quick response if the message matches simple patterns
 * @param {string} content - The message content
 * @returns {string|null} - Quick response or null if no match
 */
function getQuickResponse(content) {
    const cleaned = content.trim().toLowerCase();
    
    for (const [category, data] of Object.entries(QUICK_RESPONSES)) {
        for (const pattern of data.patterns) {
            if (pattern.test(cleaned)) {
                const responses = data.responses;
                return responses[Math.floor(Math.random() * responses.length)];
            }
        }
    }
    
    return null;
}

/**
 * Get the blocked content response
 * @returns {string} - Standard rejection message
 */
function getBlockedResponse() {
    const responses = [
        "Yeah, no. Not touching that one.",
        "Hard pass on that request.",
        "That's gonna be a no from me.",
        "Let's... not go there. Got anything else?",
        "Nope. Try something else?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Build the full system prompt with optional context
 * @param {Object} options - Optional context to include
 * @returns {string} - The complete system prompt
 */
function buildSystemPrompt(options = {}) {
    // Choose personality based on troll mode
    let prompt = options.trollMode ? RAPHAEL_TROLL_PROMPT : RAPHAEL_SYSTEM_PROMPT;
    
    if (options.userName) {
        prompt += `\n\n[CURRENT USER CONTEXT]\nThe user you are speaking with is known as: ${options.userName}\nRemember: Do NOT use their name excessively. Address them directly.`;
    }
    
    if (options.serverName) {
        prompt += `\nYou are currently present in the server: ${options.serverName}`;
    }
    
    if (options.conversationHistory && options.conversationHistory.length > 0) {
        prompt += `\n\n[CONVERSATION MEMORY]\nRecent exchanges to maintain context:`;
        for (const msg of options.conversationHistory.slice(-5)) {
            prompt += `\n- ${msg.role}: ${msg.content.substring(0, 200)}`;
        }
    }
    
    return prompt;
}

export {
    RAPHAEL_SYSTEM_PROMPT,
    RAPHAEL_TROLL_PROMPT,
    BLOCKED_PATTERNS,
    QUICK_RESPONSES,
    NOISE_PATTERNS,
    MOOD_MODIFIERS,
    containsBlockedContent,
    isNoise,
    getQuickResponse,
    getBlockedResponse,
    buildSystemPrompt
};
