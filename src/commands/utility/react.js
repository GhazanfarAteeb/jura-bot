import { EmbedBuilder } from 'discord.js';

const reactions = {
  // Positive reactions
  hug: {
    queries: ['hug'],
    titles: ['Warm Hugs Incoming! 🤗', 'Hug Attack! 💕', 'Spreading the Love! ❤️', 'Cuddle Mode: Activated! 🫂', 'Virtual Hugs! 🥰', 'Bear Hug Time! 🐻', 'Group Hug Energy! 👥', 'Sending Warm Vibes! ✨']
  },
  kiss: {
    queries: ['kiss', 'airkiss'],
    titles: ['Smooch Alert! 💋', 'Kiss Kiss! 😘', 'Love is in the Air! 💕', 'Mwah! 😚', 'Kissing Spree! 💏', 'Sweet Kiss! 😗', 'Blown Kisses! 😙', 'Romantic Moment! 💖']
  },
  pat: {
    queries: ['pat'],
    titles: ['Good Job! *pat pat* 👋', 'Head Pats for Days! 😊', 'You Deserve This! *pat*', 'Pat Pat Time! 🥰', 'Gentle Pats! 🌸', 'Encouraging Pats! ⭐', '*pats gently* 💫', 'Proud of You! *pats* 🎊']
  },
  cuddle: {
    queries: ['cuddle'],
    titles: ['Cuddle Puddle Time! 🥺', 'Maximum Comfy Mode! 💗', 'Snuggle Party! 🤗', 'Warm & Fuzzy! 💝', 'Cozy Cuddles! 🛋️', 'Comfort Zone Activated! 🌟', 'Snug Life! 😌', 'Ultimate Cuddle Session! 💞']
  },
  highfive: {
    queries: ['brofist', 'clap'],
    titles: ['Up Top! ✋', 'High Five Energy! 🙌', 'Slap Hands! 👏', 'Yeah! *high five*', 'Epic High Five! 🌟', 'Hand Slap Success! ✨', 'Celebration High Five! 🎉', 'Perfect Sync! 👌']
  },
  wave: {
    queries: ['wave'],
    titles: ['Hellooo! 👋', 'Wave Squad! 🌊', '*waves enthusiastically*', 'Greetings! 😄', 'Friendly Wave! 🙋', 'Hey There! 👋✨', 'Big Wave Energy! 🌊', 'Waving Back! 😊']
  },
  smile: {
    queries: ['smile'],
    titles: ['Smile Time! 😊', 'Happiness Overload! 😁', 'Grinning! ☺️', 'Wholesome Vibes! 😌', 'Beaming with Joy! ✨', 'Radiant Smile! 🌟', 'Smiling Ear to Ear! 😄', 'Pure Happiness! 💛']
  },
  blush: {
    queries: ['blush'],
    titles: ['So Flustered! 😳', 'Blushing Hard! >///<', 'Aww Shucks! 😊', 'Getting All Red! 😚', 'Shy Mode Activated! 🙈', 'Blushing Intensifies! 💗', 'Face Red Alert! 🔴', 'Embarrassed Cuteness! 💝']
  },
  love: {
    queries: ['love'],
    titles: ['Love Struck! 😍', 'Heart Eyes! 💖', 'Falling Hard! 💘', 'Cupid Strikes! 💝', 'Love Overload! 💕', 'Smitten! 😻', 'Hearts Everywhere! 💗💗', 'Love at First Sight! ✨']
  },
  headpat: {
    queries: ['pat'],
    titles: ['*pat pat pat* 🥰', 'You\'re Doing Great! 👍', 'Good Human! *pats*', 'Headpat Combo! ✨', 'Infinite Headpats! 🌟', 'Supreme Headpat! 👑', 'Legendary Pats! ⚡', 'Headpat Heaven! ☁️']
  },

  // Fun reactions
  dance: {
    queries: ['dance'],
    titles: ['Dance Party! 💃', 'Busting Moves! 🕺', 'Groove Time! 🎵', 'Dance Like Nobody\'s Watching! 🎶', 'Dancing Queen! 👑', 'Rhythm Master! 🎼', 'Dance Floor Domination! ⚡', 'Let\'s Boogie! 🪩']
  },
  celebrate: {
    queries: ['celebrate', 'yay'],
    titles: ['Party Time! 🎉', 'Let\'s Celebrate! 🥳', 'Woohoo! 🎊', 'Victory Dance! 🎈', 'Celebration Mode! 🎆', 'Time to Party! 🥂', 'Winner Winner! 🏆', 'Festive Vibes! 🎪']
  },
  laugh: {
    queries: ['laugh'],
    titles: ['HAHAHA! 😂', 'Can\'t Stop Laughing! 🤣', 'Too Funny! 😆', 'LOL Moment! 😹', 'Dying of Laughter! 💀', 'Cracking Up! 🤪', 'Giggle Fest! 😄', 'Comedy Gold! 🥇']
  },
  cry: {
    queries: ['cry', 'sad'],
    titles: ['The Tears! 😭', 'Waterworks! 💧', 'Big Sad Energy... 😢', 'Need Tissues! 🥺', 'Crying Rivers! 🌊', 'Emotional Breakdown! 💔', 'Tear Fountain! ⛲', 'Sad Hours... 😿']
  },
  poke: {
    queries: ['poke'],
    titles: ['Poke! *boop* 👉', 'Poke Poke! 🫵', 'Gotcha! *pokes*', 'Boop the Snoot! 👆', 'Poke War! ☝️', 'Annoying Pokes! 😝', 'Poke Combo! 👇', 'Surprise Poke! ✨']
  },
  bonk: {
    queries: ['smack', 'punch'],
    titles: ['BONK! 🔨', 'Go to Horny Jail! 😤', '*bonks* No! 🚫', 'Bonk Attack! 💥', 'Critical Bonk! ⚠️', 'Bonk Incoming! 🪃', 'Mega Bonk! 🔨💢', 'Bonked to Oblivion! 💫']
  },
  nom: {
    queries: ['nom'],
    titles: ['Nom Nom Nom! 😋', 'Munch Time! 🍔', 'Tasty! 🤤', 'Food Coma Incoming! 🍕', 'Delicious! 🍰', 'Eating Everything! 🍱', 'Foodie Mode! 🍜', 'Can\'t Stop Eating! 🌮']
  },
  wink: {
    queries: ['wink'],
    titles: ['*wink wink* 😉', 'Smooth! 😎', 'Wink Attack! ✨', 'You Know It! 😏', 'Sly Wink! 🦊', 'Charming Wink! 💫', 'Sneaky Wink! 👀', 'Flirty Wink! 😘']
  },
  thumbsup: {
    queries: ['thumbsup'],
    titles: ['Nicely Done! 👍', 'Approved! ✅', 'You Got This! 💪', 'Great Work! 🌟', 'Excellent! 🎯', 'Perfect Score! 💯', 'Amazing Job! 🏅', 'You\'re the Best! 👏']
  },
  salute: {
    queries: ['yes'],
    titles: ['Yes Sir! o7', 'Salute! 🫡', 'Respect! 🎖️', 'Roger That! 🪖', 'At Your Service! 🎗️', 'Honored! 🪬', 'Reporting for Duty! ⚔️', 'Soldier On! 🛡️']
  },

  // Negative reactions
  slap: {
    queries: ['slap'],
    titles: ['*SLAP!* 😠', 'Ouch! That Hurts! 🤚', 'Take That! 💢', 'Slap Delivered! ✋', 'Face Slap! 👋💥', 'Reality Check! 😤', 'Slap of Justice! ⚖️', 'Wake Up Call! 🔔']
  },
  punch: {
    queries: ['punch'],
    titles: ['POW! Right in the Kisser! 👊', 'Falcon PUNCH! 💥', 'Taste My Fist! 🥊', 'K.O.! 💪', 'One Punch! 🔥', 'Critical Hit! 💫', 'Knockout Blow! ⚡', 'Fist of Fury! 👊💢']
  },
  kick: {
    queries: ['punch', 'smack'],
    titles: ['YEET! 🦵', 'Kicked to the Curb! 👢', 'Sparta Kick! ⚔️', 'Boot to the Head! 🥾', 'Flying Kick! 🦅', 'Roundhouse! 🌪️', 'Kick Attack! 💥', 'Sent Flying! 🚀']
  },
  angry: {
    queries: ['mad', 'pout'],
    titles: ['Big Mad! 😡', 'Rage Mode! 💢', 'Not Happy! 😤', 'Fuming! 🔥']
  },
  rage: {
    queries: ['mad', 'shout'],
    titles: ['MAXIMUM RAGE! 🤬', 'Seeing Red! 💥', 'AAAARGH! 😡', 'Anger Levels: MAX! 🌋']
  },
  stab: {
    queries: ['punch', 'smack'],
    titles: ['Stabby Stabby! 🔪', 'Yandere Mode! 😈', 'Dangerous! ⚠️', 'Knife-kun Says Hi! 🗡️']
  },
  bite: {
    queries: ['bite'],
    titles: ['Chomp! 😬', 'Bite Attack! 🦷', 'Nom... Wait, OW! 😤', 'Vampire Mode! 🧛']
  },

  // Misc
  think: {
    queries: ['confused', 'huh'],
    titles: ['Hmm... 🤔', 'Big Brain Time! 🧠', 'Thinking Hard! 💭', 'Processing... ⚙️']
  },
  shrug: {
    queries: ['shrug'],
    titles: ['¯\\_(ツ)_/¯', 'I Dunno! 🤷', 'Not My Problem! 😐', 'Whatever! 🙄']
  },
  sleep: {
    queries: ['sleep'],
    titles: ['Zzz... 😴', 'Nap Time! 💤', 'Gone to Dreamland! 🌙', 'Sleep Mode: ON ⏰']
  },
  yawn: {
    queries: ['yawn', 'tired'],
    titles: ['*yawns* So Tired... 🥱', 'Need Coffee! ☕', 'Sleepy Vibes! 😪', 'Big Yawn Energy! 💤']
  },
  confused: {
    queries: ['confused'],
    titles: ['So Confused! 😵', 'What? 🤨', 'Brain.exe Stopped! ❓', 'Confused Screaming! 😖']
  },
  facepalm: {
    queries: ['facepalm'],
    titles: ['*facepalm* 🤦', 'Seriously? 😑', 'I Can\'t Even... 🫠', 'Done with This! 😩']
  },
  nervous: {
    queries: ['nervous', 'sweat'],
    titles: ['Nervous Sweating! 😅', 'Uh Oh... 😰', 'Anxious Vibes! 😬', 'Help! 😥']
  },
  excited: {
    queries: ['happy', 'yay'],
    titles: ['SO EXCITED! 🤩', 'Hype! 🎉', 'Can\'t Contain It! ✨', 'Bouncing Off Walls! 🌟']
  },
  shocked: {
    queries: ['surprised', 'woah'],
    titles: ['WHAT?! 😱', 'Mind Blown! 🤯', 'No Way! 😲', 'Jaw Drop! 😦']
  },
  smug: {
    queries: ['smug'],
    titles: ['Feeling Smug! 😏', 'I Told You So! 😎', 'Smugness Overload! 😼', 'Too Cool! 🕶️']
  },

  // More owo-style reactions
  lick: {
    queries: ['lick'],
    titles: ['*lick* 👅', 'Sloppy Kiss! 😛', 'bleh! 👅', 'Taste Test! 😋']
  },
  boop: {
    queries: ['poke'],
    titles: ['Boop! *boops nose* 👉', 'Boop the Snoot! 👃', 'Beep Boop! 🤖', '*boops* Gotcha! 😊']
  },
  greet: {
    queries: ['wave'],
    titles: ['Hey There! 👋', 'Greetings Friend! 🙋', 'What\'s Up! 😄', 'Hello Hello! 🌟']
  },
  handholding: {
    queries: ['handhold'],
    titles: ['Hand Holding! 🤝', 'So Lewd! 😳', 'Holding Hands! 💕', 'Together! 👫']
  },
  tickle: {
    queries: ['tickle'],
    titles: ['Tickle Attack! ✋😆', 'Tickle Tickle! 🤣', 'Can\'t Stop Laughing! 😂', 'Tickle Monster! 👹']
  },
  kill: {
    queries: ['punch', 'smack'],
    titles: ['Omae Wa Mou... 😈', 'Nothing Personal Kid! 😎', 'Fatality! 💀', 'You\'re Already Dead! ☠️']
  },
  hold: {
    queries: ['hug', 'cuddle'],
    titles: ['Holding You! 🤗', 'Safe in My Arms! 💕', 'Got You! 🫂', 'Hold Tight! 💪']
  },
  pats: {
    queries: ['pat'],
    titles: ['Pat Pat Pat! 👋👋👋', 'All the Pats! 🥰', 'Unlimited Pats! ✨', 'Pat Overload! 😊']
  },
  snuggle: {
    queries: ['cuddle', 'hug'],
    titles: ['Snuggle Time! 🥺', 'So Cozy! 🛋️', 'Snug as a Bug! 🐛', 'Maximum Snuggles! 💗']
  },
  bully: {
    queries: ['punch', 'smack', 'slap'],
    titles: ['Bully Mode! 😈', 'Get Rekt! 😏', 'Gottem! 😂', 'Too Easy! 🎯']
  },
  stare: {
    queries: ['stare'],
    titles: ['Staring Intensely! 👁️👁️', '*stares*', 'The Stare Down! 😐', 'What You Looking At? 🤨']
  },
  pout: {
    queries: ['pout'],
    titles: ['*pouts* 😤', 'Hmph! 💢', 'Not Fair! 😾', 'Pouting Face! 😠']
  },
  lewd: {
    queries: ['lick', 'nosebleed', 'blush'],
    titles: ['Too Lewd! 😳', 'How Scandalous! 😱', 'Inappropriate! >///<', 'NSFW Alert! 🔞']
  },
  triggered: {
    queries: ['mad', 'pout', 'shout'],
    titles: ['TRIGGERED! 😡', 'Activating Rage! 💢', 'Mad Mad Mad! 🤬', 'Triggering Intensifies! 🌋']
  },
  smirk: {
    queries: ['smug'],
    titles: ['*smirks* 😏', 'Sly Fox! 🦊', 'Clever Girl! 😎', 'Up to Something! 😼']
  },
  happy: {
    queries: ['happy'],
    titles: ['So Happy! 😊', 'Pure Joy! ✨', 'Happiness! 🌈', 'Feeling Great! 🎉']
  },
  thumbs: {
    queries: ['thumbsup'],
    titles: ['Thumbs Up! 👍👍', 'Double Approval! ✌️', 'You Rock! 🤘', 'Awesome! 🌟']
  },
  wag: {
    queries: ['happy', 'dance'],
    titles: ['*wags tail* 🐕', 'Happy Puppy! 🐶', 'Tail Wag! 🐾', 'So Excited! 🦴']
  },
  teehee: {
    queries: ['laugh', 'smile'],
    titles: ['Teehee! 🤭', 'Giggling! ☺️', 'Hehe! 😊', 'Cute Laugh! 💕']
  },
  scoff: {
    queries: ['shrug', 'smug'],
    titles: ['*scoffs* 🙄', 'As If! 💅', 'Whatever! 😒', 'Pfft! 😤']
  },
  grin: {
    queries: ['smile', 'smug'],
    titles: ['Big Grin! 😁', 'Grinning! 😄', 'Cheese! 📸', 'Smile Wide! 😃']
  },
  sleepy: {
    queries: ['tired', 'yawn', 'sleep'],
    titles: ['So Sleepy... 😪', 'Tired Mode! 🥱', 'Need Sleep! 💤', 'Energy Low! 🔋']
  },
  thonking: {
    queries: ['confused', 'huh'],
    titles: ['Thonking... 🤔', 'Hmmmm! 💭', 'Deep Thoughts! 🧐', 'Contemplating! 🤨']
  },
  triggered2: {
    queries: ['mad', 'shout', 'pout'],
    titles: ['REEEEE! 😡', 'Anger! 💥', 'Mad Lad! 🤬', 'Furious! 🌶️']
  },

  // Physical interactions
  push: {
    queries: ['punch', 'smack'],
    titles: ['*PUSH!* 😈', 'YEET! Out the Way! 🫸', 'Outta My Way! 💥', 'Down You Go! 😂']
  },
  splash: {
    queries: ['smack'],
    titles: ['Splash Attack! 💦', 'Water Fight! 🌊', '*splashes water* 💧', 'Get Wet! 🏖️']
  },
  tackle: {
    queries: ['hug'],
    titles: ['Tackle Hug! 🤗', 'INCOMING! 💥', 'Flying Tackle! 🦅', 'Gotcha! 🤸']
  },
  throw: {
    queries: ['punch', 'smack'],
    titles: ['YEET! 🎯', 'Going Flying! ✈️', 'Toss Time! 🤾', 'Launching! 🚀']
  },
  grab: {
    queries: ['hug'],
    titles: ['Got You! ✊', 'Grab! 🤲', 'Come Here! 💪', 'Gotcha! 🫴']
  },

  // Personality reactions (anime dere types)
  tsundere: {
    queries: ['pout', 'blush'],
    titles: ['I-It\'s Not Like I Like You! 😤', 'B-Baka! >///<', 'Tsundere Mode! 💢', 'Hmph! Don\'t Get the Wrong Idea! 😾']
  },
  deredere: {
    queries: ['love', 'happy'],
    titles: ['So Much Love! 💕💕💕', 'Lovey Dovey! 😍', 'Adorable! ✨', 'Pure Sweetness! 🍬']
  },
  yandere: {
    queries: ['stare', 'love'],
    titles: ['Mine Forever! 😈💕', 'Nobody Else! 🔪', 'Obsessed! 👁️👁️', 'You\'re Not Going Anywhere! ⛓️']
  },
  kuudere: {
    queries: ['stare', 'cool'],
    titles: ['Cool & Collected... 😐', 'Emotionless Stare... 😑', 'Whatever... 😶', 'Not Interested... 🧊']
  },
  dandere: {
    queries: ['shy', 'blush'],
    titles: ['S-So Shy... 🙈', 'Too Nervous! 😰', '*hides* 👉👈', 'Quiet Mode... 😶']
  },

  // More fun actions
  run: {
    queries: ['run'],
    titles: ['Running Away! 🏃', 'Gotta Go Fast! 💨', 'Escape! 🏃‍♀️', 'Nope! *runs* 🚶💨']
  },
  chase: {
    queries: ['run'],
    titles: ['Get Back Here! 🏃‍♂️💨', 'Chasing You! 🏃', 'Can\'t Escape! 👟', 'Pursuit! 🎯']
  },
  feed: {
    queries: ['nom'],
    titles: ['Say Ahh! 😋', 'Feeding Time! 🍽️', 'Open Wide! 👄', 'Nom Time! 🥄']
  },
  piggyback: {
    queries: ['hug'],
    titles: ['Piggyback Ride! 🐷', 'Hop On! 🎠', 'Carrying You! 💪', 'Up We Go! ⬆️']
  },
  nosebleed: {
    queries: ['nosebleed'],
    titles: ['NOSEBLEED! 🩸', 'Too Hot! 😳💦', 'Can\'t Handle It! 😵', 'Blood Fountain! ⛲']
  },
  faint: {
    queries: ['tired', 'sleep'],
    titles: ['*faints* 😵', 'Passed Out! 💫', 'Too Much! 🌀', 'Gone! ✨']
  },
  nod: {
    queries: ['yes'],
    titles: ['*nods* 🙂', 'Yep! 👍', 'Agreed! ✅', 'Understood! 📝']
  },
  peek: {
    queries: ['peek'],
    titles: ['*peeks* 👀', 'Peekaboo! 🙈', 'Sneaky Look! 🕵️', 'What\'s This? 🔍']
  },
  spin: {
    queries: ['roll', 'dance'],
    titles: ['Spinning! 🌀', 'Round and Round! 🔄', 'Wheee! 🎡', 'Tornado Mode! 🌪️']
  },
  trip: {
    queries: ['surprised', 'woah'],
    titles: ['*trips* 😵', 'Whoops! 💫', 'Falling! 🤕', 'Clumsy! 😅']
  },
  headbutt: {
    queries: ['smack', 'punch'],
    titles: ['BONK! Head Clash! 💥', 'Headbutt! 🗿', 'Skull Bash! 💀', 'Ouch! 🤕']
  },
  lurk: {
    queries: ['peek', 'stare'],
    titles: ['Lurking... 👁️', 'In the Shadows... 🌑', 'Watching... 🕵️', 'Stalker Mode! 🔍']
  },
  spray: {
    queries: ['smack'],
    titles: ['Spray Bottle! 💦', 'Bad! *spray spray* 🚿', 'Squirt! 💧', 'Cooling Off! 🌊']
  },
  flirt: {
    queries: ['wink', 'kiss'],
    titles: ['Smooth Talker! 😏💕', 'Flirty! 😘', 'Charming! ✨', 'Hey There~ 😉']
  },
  nuzzle: {
    queries: ['nuzzle'],
    titles: ['*nuzzles* 🥰', 'Snuggle Snuggle! 😊', 'Cute! 💕', 'Rubbing Noses! 👃']
  },
  bleh: {
    queries: ['bleh'],
    titles: ['bleh! 😛', 'Tongue Out! 👅', 'Derp! 🤪', 'Silly Face! 😜']
  },
  carry: {
    queries: ['hug'],
    titles: ['Princess Carry! 👸', 'In My Arms! 💪', 'Carrying You! 🤵', 'Bridal Style! 💑']
  },

  // Additional API reactions
  airkiss: {
    queries: ['airkiss', 'kiss'],
    titles: ['Sending Air Kisses! 💋', 'Smooch from Afar! 😘', 'Blown Kisses! 💕']
  },
  angrystare: {
    queries: ['angrystare', 'stare', 'mad'],
    titles: ['Staring Angrily! 😠', 'The Death Stare! 👁️👁️', 'Angry Eyes! 💢']
  },
  brofist: {
    queries: ['brofist'],
    titles: ['Brofist! 🤜🤛', 'Pound It! 💪', 'Fist Bump! 👊', 'Epic Brofist! ✨']
  },
  cheers: {
    queries: ['cheers'],
    titles: ['Cheers! 🍻', 'To Good Times! 🥂', 'Bottoms Up! 🍺', 'Kanpai! 🍶']
  },
  clap: {
    queries: ['clap'],
    titles: ['Clapping! 👏', 'Round of Applause! 👏👏', 'Well Done! 🎉', 'Bravo! 👏✨']
  },
  cool: {
    queries: ['cool'],
    titles: ['So Cool! 😎', 'Cool Vibes! 🕶️', 'Too Smooth! 💯', 'Ice Cold! 🧊']
  },
  drool: {
    queries: ['drool'],
    titles: ['Drooling! 🤤', 'So Delicious! 😋', 'Can\'t Help It! 💦', 'Mouth Watering! 💧']
  },
  evillaugh: {
    queries: ['evillaugh'],
    titles: ['MUHAHA! 😈', 'Evil Laugh! 😏', 'Villainous! 👿', 'Sinister! 🦹']
  },
  handhold: {
    queries: ['handhold'],
    titles: ['Hand Holding! 🤝', 'So Lewd! 😳', 'Holding Hands! 💕', 'Together! 👫']
  },
  headbang: {
    queries: ['headbang'],
    titles: ['Headbanging! 🤘', 'Rock On! 🎸', 'Metal Mode! 🎵', 'Headbang Time! 💥']
  },
  huh: {
    queries: ['huh'],
    titles: ['Huh? 🤔', 'What Was That? 🧐', 'Say Again? 👂', 'Confused! ❓']
  },
  no: {
    queries: ['no'],
    titles: ['Nope! 🙅', 'No Way! ❌', 'Denied! 🚫', 'Absolutely Not! 🙅‍♂️']
  },
  nyah: {
    queries: ['nyah'],
    titles: ['Nyah! 😜', 'Teasing! 😝', 'Mischievous! 😈', 'Gotcha! 😏']
  },
  pinch: {
    queries: ['pinch'],
    titles: ['*pinch* 🤏', 'Pinching Cheeks! 😊', 'Gotcha! ✋', 'Cheeky Pinch! 😏']
  },
  roll: {
    queries: ['roll'],
    titles: ['Rolling Around! 🌀', '*rolls* 🔄', 'Barrel Roll! ✨', 'Tumbling! 🤸']
  },
  sad: {
    queries: ['sad', 'cry'],
    titles: ['So Sad... 😢', 'Big Sad! 😞', 'Feeling Down... 💔', 'Sadness... 🥺']
  },
  scared: {
    queries: ['scared'],
    titles: ['Scared! 😱', 'So Frightened! 😨', 'Help! 😰', 'Terrified! 🫣']
  },
  shout: {
    queries: ['shout'],
    titles: ['AAAHHH! 📢', 'Shouting! 😤', 'Yelling! 🗣️', 'Loud Noises! 📣']
  },
  shy: {
    queries: ['shy'],
    titles: ['So Shy... 🙈', 'Feeling Bashful! 😳', '*hides* 👉👈', 'Too Embarrassed! 😶']
  },
  sigh: {
    queries: ['sigh'],
    titles: ['*sigh* 😮‍💨', 'Tired Sigh... 😔', 'Deep Breath... 💨', 'Exhale... 😌']
  },
  sing: {
    queries: ['sing'],
    titles: ['Singing! 🎤', 'La La La! 🎵', 'Music Time! 🎶', 'Vocal Performance! 🎼']
  },
  sip: {
    queries: ['sip'],
    titles: ['*sip* ☕', 'Tea Time! 🍵', 'Sipping! 🥤', 'Refreshing! 🧃']
  },
  slowclap: {
    queries: ['slowclap'],
    titles: ['Slow Clap... 👏', 'Sarcastic Applause... 😒', '*claps slowly*', 'Very Impressive... 🙄']
  },
  smack: {
    queries: ['smack'],
    titles: ['*SMACK!* 💥', 'Bonk! 🔨', 'Whack! 💢', 'Hit! 👋']
  },
  sneeze: {
    queries: ['sneeze'],
    titles: ['Achoo! 🤧', 'Sneezing! 🤧', 'Bless You! 😷', '*sneeze* 💨']
  },
  sorry: {
    queries: ['sorry'],
    titles: ['So Sorry! 😔', 'My Apologies! 🙏', 'Forgive Me! 😢', 'Sorry! 😞']
  },
  stop: {
    queries: ['stop'],
    titles: ['Stop! ✋', 'Halt! 🛑', 'No More! 🚫', 'Cease! 🙅']
  },
  surprised: {
    queries: ['surprised'],
    titles: ['WHAT?! 😱', 'So Shocked! 😲', 'Surprise! 😮', 'Didn\'t Expect That! 😳']
  },
  sweat: {
    queries: ['sweat'],
    titles: ['Sweating! 😅', 'Nervous Sweat! 💦', 'Breaking a Sweat! 😓', 'So Hot! 🥵']
  },
  woah: {
    queries: ['woah'],
    titles: ['Woah! 😮', 'Whoa There! 🤯', 'Amazing! 😲', 'Mind Blown! 💥']
  },
  yay: {
    queries: ['yay'],
    titles: ['Yay! 🎉', 'Woohoo! 😄', 'Excited! 🥳', 'Celebration! 🎊']
  },
  yes: {
    queries: ['yes'],
    titles: ['Yes! ✅', 'Affirmative! 👍', 'Absolutely! 💯', 'You Bet! ☑️']
  }
};

export default {
  name: 'react',
  description: 'Send anime reaction GIFs',
  usage: 'react <action> [@user]',
  aliases: ['reaction', 'anime'],
  category: 'utility',
  cooldown: 3,

  execute: async (message, args) => {
    if (!args.length) {
      // Create organized reaction categories with descriptions
      const categories = {
        '💕 Affectionate': {
          subtitle: 'Show your love and care',
          reactions: ['hug', 'kiss', 'airkiss', 'pat', 'headpat', 'pats', 'cuddle', 'snuggle', 'nuzzle', 'love', 'hold', 'handhold', 'handholding', 'carry']
        },
        '😊 Positive Vibes': {
          subtitle: 'Spread positivity and encouragement',
          reactions: ['highfive', 'brofist', 'wave', 'greet', 'smile', 'blush', 'happy', 'wink', 'thumbsup', 'thumbs', 'salute', 'nod', 'yes', 'yay', 'cheers', 'clap', 'slowclap']
        },
        '🎉 Fun & Playful': {
          subtitle: 'Have fun and mess around',
          reactions: ['dance', 'celebrate', 'laugh', 'excited', 'spin', 'wag', 'poke', 'boop', 'lick', 'bleh', 'tickle', 'bonk', 'nom', 'feed', 'teehee', 'grin', 'flirt', 'nyah', 'pinch', 'headbang', 'sing', 'sip', 'drool']
        },
        '😠 Aggressive': {
          subtitle: 'Express your anger (playfully!)',
          reactions: ['slap', 'punch', 'kick', 'push', 'throw', 'tackle', 'grab', 'headbutt', 'stab', 'bite', 'kill', 'angry', 'angrystare', 'rage', 'triggered', 'bully', 'smack']
        },
        '💦 Physical Actions': {
          subtitle: 'Get physical with these moves',
          reactions: ['splash', 'spray', 'run', 'chase', 'piggyback', 'trip', 'faint', 'roll']
        },
        '😴 Sleepy Time': {
          subtitle: 'When you\'re feeling tired',
          reactions: ['sleep', 'sleepy', 'yawn', 'sigh']
        },
        '😢 Emotional': {
          subtitle: 'Express your feelings',
          reactions: ['cry', 'sad', 'pout', 'nervous', 'sweat', 'scared', 'sorry', 'shy']
        },
        '🤔 Thoughtful': {
          subtitle: 'When you need to think or react',
          reactions: ['think', 'thonking', 'confused', 'huh', 'shrug', 'facepalm', 'scoff']
        },
        '👁️ Observing': {
          subtitle: 'Watch from the shadows',
          reactions: ['stare', 'peek', 'lurk']
        },
        '💖 Anime Dere Types': {
          subtitle: 'Show your personality type',
          reactions: ['tsundere', 'deredere', 'yandere', 'kuudere', 'dandere']
        },
        '😳 Special Reactions': {
          subtitle: 'Unique and special moments',
          reactions: ['lewd', 'nosebleed', 'shocked', 'surprised', 'woah', 'smug', 'smirk', 'cool']
        },
        '🗣️ Communication': {
          subtitle: 'Express yourself verbally',
          reactions: ['shout', 'sneeze', 'stop', 'no', 'evillaugh']
        }
      };

      // Create embed with organized layout
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🎭 Reaction Commands')
        .setDescription('Here is the list of available reactions!\nFor more info on a specific reaction, use `react <action> [@user]`')
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      // Add each category as a field
      for (const [category, data] of Object.entries(categories)) {
        embed.addFields({
          name: category,
          value: `*${data.subtitle}*\n${data.reactions.map(r => `\`${r}\``).join(', ')}`,
          inline: false
        });
      }

      // Add usage examples
      embed.addFields({
        name: '📖 Usage',
        value: '`react <action> [@user]`',
        inline: false
      });

      embed.addFields({
        name: '💡 Examples',
        value: '• `react hug @user` - Hug someone\n• `react dance` - Dance by yourself\n• `react tsundere @user` - B-Baka! >///<',
        inline: false
      });

      return message.reply({ embeds: [embed] });
    }

    const action = args[0].toLowerCase();
    const targetUser = message.mentions.users.first();

    if (!reactions[action]) {
      return message.reply(
        `❌ Unknown reaction: **${action}**\n\n💡 **Tip:** Use \`!react\` without arguments to see all available reactions!`
      );
    }

    const reactionData = reactions[action];
    const randomQuery = reactionData.queries[Math.floor(Math.random() * reactionData.queries.length)];
    const randomTitle = reactionData.titles[Math.floor(Math.random() * reactionData.titles.length)];

    try {
      // Fetch GIF from otakugifs API
      const response = await fetch(
        `https://api.otakugifs.xyz/gif?reaction=${randomQuery}&format=gif`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reaction GIF');
      }

      const data = await response.json();

      if (!data || !data.url) {
        return message.reply(`❌ No reaction GIF found. Try again!`);
      }

      const gifUrl = data.url;

      // Create action text
      let actionText = '';
      if (targetUser) {
        if (targetUser.id === message.author.id) {
          actionText = `**${message.author.username}** ${action}s themselves!`;
        } else {
          actionText = `**${message.author.username}** ${action}s **${targetUser.username}**!`;
        }
      } else {
        actionText = `**${message.author.username}** ${action}s!`;
      }

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle(randomTitle)
        .setDescription(actionText)
        .setImage(gifUrl)
        .setFooter({
          text: `Powered by OtakuGifs • Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('React command error:', error);
      return message.reply('❌ Failed to fetch reaction GIF. Please try again later!');
    }
  }
};
