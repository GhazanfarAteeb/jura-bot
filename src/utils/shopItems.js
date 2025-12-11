// Available backgrounds for purchase
export const BACKGROUNDS = [
    {
        id: 'default',
        name: 'Default',
        description: 'Classic dark theme',
        price: 0,
        image: 'https://i.imgur.com/default.png',
        rarity: 'common',
        color: '#2C2F33'
    },
    {
        id: 'ocean',
        name: 'Ocean Waves',
        description: 'Calming ocean scenery',
        price: 1000,
        image: 'https://i.imgur.com/ocean.png',
        rarity: 'common',
        color: '#0077BE'
    },
    {
        id: 'forest',
        name: 'Forest Path',
        description: 'Peaceful forest trail',
        price: 1000,
        image: 'https://i.imgur.com/forest.png',
        rarity: 'common',
        color: '#228B22'
    },
    {
        id: 'sunset',
        name: 'Sunset Sky',
        description: 'Beautiful sunset gradient',
        price: 1500,
        image: 'https://i.imgur.com/sunset.png',
        rarity: 'uncommon',
        color: '#FF6B6B'
    },
    {
        id: 'space',
        name: 'Space Nebula',
        description: 'Cosmic nebula in deep space',
        price: 2000,
        image: 'https://i.imgur.com/space.png',
        rarity: 'uncommon',
        color: '#4A0E4E'
    },
    {
        id: 'sakura',
        name: 'Cherry Blossom',
        description: 'Pink sakura petals',
        price: 2500,
        image: 'https://i.imgur.com/sakura.png',
        rarity: 'rare',
        color: '#FFB7C5'
    },
    {
        id: 'neon',
        name: 'Neon City',
        description: 'Cyberpunk neon lights',
        price: 3000,
        image: 'https://i.imgur.com/neon.png',
        rarity: 'rare',
        color: '#FF00FF'
    },
    {
        id: 'aurora',
        name: 'Aurora Borealis',
        description: 'Northern lights display',
        price: 4000,
        image: 'https://i.imgur.com/aurora.png',
        rarity: 'epic',
        color: '#00CED1'
    },
    {
        id: 'galaxy',
        name: 'Galaxy Spiral',
        description: 'Spiral galaxy formation',
        price: 5000,
        image: 'https://i.imgur.com/galaxy.png',
        rarity: 'epic',
        color: '#191970'
    },
    {
        id: 'fire',
        name: 'Eternal Flame',
        description: 'Blazing fire animation',
        price: 6000,
        image: 'https://i.imgur.com/fire.gif',
        rarity: 'legendary',
        color: '#FF4500'
    },
    {
        id: 'lightning',
        name: 'Lightning Storm',
        description: 'Electric storm animation',
        price: 7500,
        image: 'https://i.imgur.com/lightning.gif',
        rarity: 'legendary',
        color: '#FFD700'
    },
    {
        id: 'void',
        name: 'The Void',
        description: 'Mysterious dark void',
        price: 10000,
        image: 'https://i.imgur.com/void.gif',
        rarity: 'mythic',
        color: '#000000'
    }
];

// Rarity colors
export const RARITY_COLORS = {
    common: '#95A5A6',
    uncommon: '#2ECC71',
    rare: '#3498DB',
    epic: '#9B59B6',
    legendary: '#F39C12',
    mythic: '#E74C3C'
};

// Rarity emojis
export const RARITY_EMOJIS = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡',
    mythic: '🔴'
};

// Get background by ID
export function getBackground(id) {
    return BACKGROUNDS.find(bg => bg.id === id);
}

// Get backgrounds by rarity
export function getBackgroundsByRarity(rarity) {
    return BACKGROUNDS.filter(bg => bg.rarity === rarity);
}

// Get affordable backgrounds
export function getAffordableBackgrounds(coins) {
    return BACKGROUNDS.filter(bg => bg.price <= coins);
}
