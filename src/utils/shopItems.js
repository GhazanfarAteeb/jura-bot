// Available backgrounds for purchase (add via shop command)
export const BACKGROUNDS = [
  {
    id: 'default',
    name: 'Default',
    description: 'Classic dark theme',
    price: 0,
    image: '',
    color: '#2C2F33'
  }
];

// Get background by ID
export function getBackground(id) {
  return BACKGROUNDS.find(bg => bg.id === id);
}

// Get affordable backgrounds
export function getAffordableBackgrounds(coins) {
  return BACKGROUNDS.filter(bg => bg.price <= coins);
}
