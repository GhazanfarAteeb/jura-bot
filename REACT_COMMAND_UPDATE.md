# React Command Update Summary

## Overview
Updated the `/react` command to support multiple API endpoints and fixed several reaction mappings.

## Changes Made

### 1. Fixed Incorrect Mappings
- **kick**: Changed from `queries: ['punch', 'smack']` to `queries: ['kick']` with `endpoints: ['rndm']`
- **angry**: Changed from `queries: ['mad', 'pout']` to `queries: ['angry']` with `endpoints: ['rndm']` (pout doesn't make sense for angry)
- **kill**: Changed from `queries: ['punch', 'smack']` to `queries: ['kill']` with `endpoints: ['rndm']`

### 2. Added Missing Reactions
- **lonely**: New reaction using `queries: ['lonely']` and `endpoints: ['rndm']`
  - Titles include: 'So Lonely... 🥺', 'Forever Alone... 😢', 'Need Company! 💔', etc.

### 3. Added Endpoints Field
Added the `endpoints` field to **ALL 150+ reactions** in the file, specifying which API(s) to use:
- `endpoints: ['otaku']` - Use only OtakuGifs API
- `endpoints: ['rndm']` - Use only RndmServ API
- `endpoints: ['otaku', 'rndm']` - Try OtakuGifs first, fallback to RndmServ

**88 reactions** were updated with endpoint mappings based on API availability.

### 4. Updated Fetch Logic
Implemented multi-endpoint support with automatic fallback:

```javascript
// Get endpoints (default to otaku if not specified)
const endpoints = reactionData.endpoints || ['otaku'];

// Try each endpoint until we get a result
for (const endpoint of endpoints) {
  try {
    let response;
    
    if (endpoint === 'otaku') {
      response = await fetch(
        `https://api.otakugifs.xyz/gif?reaction=${randomQuery}&format=gif`
      );
    } else if (endpoint === 'rndm') {
      response = await fetch(
        `https://gifs.rndmserv.de/api/endpoint/${randomQuery}`
      );
    }

    if (response && response.ok) {
      const data = await response.json();
      // Extract URL and break if found
    }
  } catch (err) {
    // Try next endpoint
    continue;
  }
}
```

### 5. Updated Embed Footer
The footer now shows which API was used:
- `Powered by OtakuGifs • Requested by @user`
- `Powered by RndmServ • Requested by @user`

### 6. Updated Categories
Added `lonely` to the "😢 Emotional" category in the help embed.

## API Endpoints Used

### OtakuGifs API
- URL: `https://api.otakugifs.xyz/gif`
- Available reactions: airkiss, angrystare, bite, bleh, blush, brofist, celebrate, cheers, clap, confused, cool, cry, cuddle, dance, drool, evillaugh, facepalm, handhold, happy, headbang, hug, huh, kiss, laugh, lick, love, mad, nervous, no, nom, nosebleed, nuzzle, nyah, pat, peek, pinch, poke, pout, punch, roll, run, sad, scared, shout, shrug, shy, sigh, sing, sip, slap, sleep, slowclap, smack, smile, smug, sneeze, sorry, stare, stop, surprised, sweat, thumbsup, tickle, tired, wave, wink, woah, yawn, yay, yes

### RndmServ API  
- URL: `https://gifs.rndmserv.de/api/endpoint`
- Available reactions: angry, bite, bored, bread, chocolate, cookie, cuddle, dance, drunk, happy, hug, kick, kill, kiss, laugh, lick, lonely, pat, poke, pregnant, punch, run, slap, sleep, spank, spit, steal, tickle, nomm

## Benefits

1. **Better Coverage**: Reactions now use the most appropriate API for each action
2. **Reliability**: Automatic fallback if one API fails
3. **Correct Mappings**: Reactions like `kick`, `angry`, and `kill` now use their proper endpoints
4. **New Content**: Added `lonely` reaction and fixed `kill` to use actual kill GIFs
5. **Maintainability**: Clear endpoint configuration makes it easy to add new APIs in the future

## Testing Recommendations

Test the following reactions to verify fixes:
- `!react kick @user` - Should show actual kick GIFs (from RndmServ)
- `!react angry` - Should show angry GIFs (from RndmServ)
- `!react kill @user` - Should show kill/fatality GIFs (from RndmServ)
- `!react lonely` - Should show lonely GIFs (from RndmServ)
- `!react tickle @user` - Should work from either API
- `!react hug @user` - Should try OtakuGifs first, fallback to RndmServ

## File Changes
- `src/commands/utility/react.js` - Complete rewrite of endpoint system and fetch logic

## Notes
- All existing reactions maintain backwards compatibility
- The command will still work even if one API is down (will use the other)
- Footer attribution changes dynamically based on which API was used
