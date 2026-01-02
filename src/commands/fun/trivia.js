import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import Guild from '../../models/Guild.js';
import Economy from '../../models/Economy.js';
import { getRandomFooter } from '../../utils/raphael.js';

// Trivia questions by category
const TRIVIA_QUESTIONS = {
  general: [
    { question: 'What is the capital of France?', answers: ['Paris', 'London', 'Berlin', 'Madrid'], correct: 0 },
    { question: 'How many continents are there?', answers: ['5', '6', '7', '8'], correct: 2 },
    { question: 'What is the largest planet in our solar system?', answers: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correct: 2 },
    { question: 'What year did World War II end?', answers: ['1943', '1944', '1945', '1946'], correct: 2 },
    { question: 'What is the chemical symbol for gold?', answers: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 },
    { question: 'Which country is known as the Land of the Rising Sun?', answers: ['China', 'Japan', 'Korea', 'Thailand'], correct: 1 },
    { question: 'How many colors are in a rainbow?', answers: ['5', '6', '7', '8'], correct: 2 },
    { question: 'What is the largest ocean on Earth?', answers: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3 },
    { question: 'Who painted the Mona Lisa?', answers: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Picasso'], correct: 1 },
    { question: 'What is the hardest natural substance?', answers: ['Gold', 'Iron', 'Diamond', 'Platinum'], correct: 2 }
  ],
  science: [
    { question: 'What is H2O commonly known as?', answers: ['Salt', 'Sugar', 'Water', 'Oxygen'], correct: 2 },
    { question: 'What planet is known as the Red Planet?', answers: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correct: 1 },
    { question: 'What is the speed of light?', answers: ['299,792 km/s', '199,792 km/s', '399,792 km/s', '500,000 km/s'], correct: 0 },
    { question: 'How many bones are in the adult human body?', answers: ['186', '206', '226', '246'], correct: 1 },
    { question: 'What gas do plants absorb from the atmosphere?', answers: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], correct: 2 },
    { question: 'What is the smallest unit of matter?', answers: ['Molecule', 'Cell', 'Atom', 'Electron'], correct: 2 },
    { question: 'What force keeps us on the ground?', answers: ['Magnetism', 'Friction', 'Gravity', 'Inertia'], correct: 2 },
    { question: 'What is the study of living organisms called?', answers: ['Chemistry', 'Physics', 'Biology', 'Geology'], correct: 2 }
  ],
  gaming: [
    { question: 'What year was Minecraft released?', answers: ['2009', '2010', '2011', '2012'], correct: 2 },
    { question: 'What company created the PlayStation?', answers: ['Microsoft', 'Nintendo', 'Sony', 'Sega'], correct: 2 },
    { question: 'In which game would you find the character Master Chief?', answers: ['Call of Duty', 'Halo', 'Gears of War', 'Destiny'], correct: 1 },
    { question: 'What is the best-selling video game of all time?', answers: ['GTA V', 'Minecraft', 'Tetris', 'Wii Sports'], correct: 1 },
    { question: 'What color is Sonic the Hedgehog?', answers: ['Red', 'Green', 'Blue', 'Yellow'], correct: 2 },
    { question: 'In which game do you catch Pokemon?', answers: ['Digimon', 'Yu-Gi-Oh', 'Pokemon', 'Monster Hunter'], correct: 2 },
    { question: 'What is the name of Mario\'s brother?', answers: ['Wario', 'Luigi', 'Toad', 'Yoshi'], correct: 1 },
    { question: 'Which game features a battle royale on an island?', answers: ['Minecraft', 'Fortnite', 'Roblox', 'GTA V'], correct: 1 }
  ],
  movies: [
    { question: 'Who directed the movie "Titanic"?', answers: ['Steven Spielberg', 'James Cameron', 'Christopher Nolan', 'Martin Scorsese'], correct: 1 },
    { question: 'What year was the first Harry Potter movie released?', answers: ['1999', '2000', '2001', '2002'], correct: 2 },
    { question: 'Who plays Iron Man in the MCU?', answers: ['Chris Evans', 'Chris Hemsworth', 'Robert Downey Jr.', 'Mark Ruffalo'], correct: 2 },
    { question: 'Which movie features the quote "I\'ll be back"?', answers: ['Robocop', 'Terminator', 'Die Hard', 'Rambo'], correct: 1 },
    { question: 'What is the highest-grossing film of all time?', answers: ['Avengers: Endgame', 'Avatar', 'Titanic', 'Star Wars'], correct: 1 },
    { question: 'In which movie does a shark attack a beach resort?', answers: ['Deep Blue Sea', 'Jaws', 'The Meg', 'Sharknado'], correct: 1 },
    { question: 'Who voiced Woody in Toy Story?', answers: ['Tom Cruise', 'Tom Hardy', 'Tom Hanks', 'Tom Holland'], correct: 2 },
    { question: 'What is the name of Batman\'s butler?', answers: ['Alfred', 'Jarvis', 'Watson', 'Jeeves'], correct: 0 }
  ],
  discord: [
    { question: 'What year was Discord founded?', answers: ['2013', '2014', '2015', '2016'], correct: 2 },
    { question: 'What is the Discord mascot\'s name?', answers: ['Clyde', 'Wumpus', 'Nelly', 'Blob'], correct: 1 },
    { question: 'What is the maximum file size for free users?', answers: ['8 MB', '25 MB', '50 MB', '100 MB'], correct: 1 },
    { question: 'What is Discord Nitro\'s streaming quality limit?', answers: ['720p', '1080p', '4K', '8K'], correct: 2 },
    { question: 'What was Discord originally created for?', answers: ['Work', 'Gaming', 'Education', 'Dating'], correct: 1 },
    { question: 'What color is the Discord logo?', answers: ['Blue', 'Purple', 'Blurple', 'Indigo'], correct: 2 },
    { question: 'How many boosts for Level 3?', answers: ['7', '10', '14', '20'], correct: 2 },
    { question: 'What is the maximum message length?', answers: ['1000', '2000', '4000', '8000'], correct: 2 }
  ]
};

const CATEGORY_EMOJIS = {
  general: '🌍',
  science: '🔬',
  gaming: '🎮',
  movies: '🎬',
  discord: '💬'
};

export default {
  name: 'trivia',
  description: 'Play a trivia quiz game',
  usage: 'trivia [category]',
  category: 'fun',
  aliases: ['quiz', 'question'],
  cooldown: 5,

  async execute(message, args) {
    const guildId = message.guild.id;
    const category = args[0]?.toLowerCase();
    const guildConfig = await Guild.getGuild(guildId);
    const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
    const coinName = guildConfig.economy?.coinName || 'coins';

    // If no category or invalid category, show category selection
    if (!category || !TRIVIA_QUESTIONS[category]) {
      const categoryEmbed = new EmbedBuilder()
        .setColor('#00CED1')
        .setTitle('『 Knowledge Assessment 』')
        .setDescription(
          '**Answer:** Select a category to begin, Master.\n\n' +
          Object.entries(CATEGORY_EMOJIS).map(([cat, emoji]) =>
            `${emoji} **${cat.charAt(0).toUpperCase() + cat.slice(1)}**`
          ).join('\n') +
          `\n\n**Reward:** ${coinEmoji} 50-150 ${coinName} per correct response.`
        )
        .setFooter({ text: getRandomFooter() });

      const row = new ActionRowBuilder().addComponents(
        ...Object.entries(CATEGORY_EMOJIS).map(([cat, emoji]) =>
          new ButtonBuilder()
            .setCustomId(`trivia_cat_${cat}`)
            .setLabel(cat.charAt(0).toUpperCase() + cat.slice(1))
            .setStyle(ButtonStyle.Primary)
            .setEmoji(emoji)
        )
      );

      const catMsg = await message.reply({ embeds: [categoryEmbed], components: [row] });

      try {
        const catInteraction = await catMsg.awaitMessageComponent({
          filter: i => i.user.id === message.author.id,
          componentType: ComponentType.Button,
          time: 30000
        });

        const selectedCategory = catInteraction.customId.split('_')[2];
        await catInteraction.deferUpdate();
        await this.startTrivia(catMsg, message.author, selectedCategory, guildId, coinEmoji, coinName);

      } catch (error) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('『 Session Expired 』')
          .setDescription('**Notice:** Category selection timed out, Master.')
          .setFooter({ text: getRandomFooter() });

        return catMsg.edit({ embeds: [timeoutEmbed], components: [] });
      }
    } else {
      await this.startTrivia(message, message.author, category, guildId, coinEmoji, coinName);
    }
  },

  async startTrivia(msg, user, category, guildId, coinEmoji, coinName) {
    const questions = TRIVIA_QUESTIONS[category];
    const question = questions[Math.floor(Math.random() * questions.length)];
    const emoji = CATEGORY_EMOJIS[category];

    // Shuffle answers for display (but track correct answer)
    const shuffledAnswers = [...question.answers];
    const correctAnswer = question.answers[question.correct];

    // Fisher-Yates shuffle
    for (let i = shuffledAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
    }

    const newCorrectIndex = shuffledAnswers.indexOf(correctAnswer);

    const questionEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Trivia`)
      .setDescription(
        `**${question.question}**\n\n` +
        shuffledAnswers.map((a, i) => `${['🅰️', '🅱️', '🇨', '🇩'][i]} ${a}`).join('\n')
      )
      .setFooter({ text: `Answer within 15 seconds! • ${user.username}` });

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('trivia_0')
        .setLabel('A')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🅰️'),
      new ButtonBuilder()
        .setCustomId('trivia_1')
        .setLabel('B')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🅱️'),
      new ButtonBuilder()
        .setCustomId('trivia_2')
        .setLabel('C')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🇨'),
      new ButtonBuilder()
        .setCustomId('trivia_3')
        .setLabel('D')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🇩')
    );

    const triviaMsg = msg.channel ?
      await msg.reply({ embeds: [questionEmbed], components: [buttonRow] }) :
      await msg.edit({ embeds: [questionEmbed], components: [buttonRow] });

    try {
      const answerInteraction = await triviaMsg.awaitMessageComponent({
        filter: i => i.user.id === user.id,
        componentType: ComponentType.Button,
        time: 15000
      });

      const selectedAnswer = parseInt(answerInteraction.customId.split('_')[1]);
      const isCorrect = selectedAnswer === newCorrectIndex;

      if (isCorrect) {
        // Award coins
        const reward = Math.floor(Math.random() * 100) + 50; // 50-150 coins
        const economy = await Economy.getEconomy(user.id, guildId);
        economy.balance += reward;
        await economy.save();

        const correctEmbed = new EmbedBuilder()
          .setColor('#00FF7F')
          .setTitle('『 Correct Answer 』')
          .setDescription(
            `**${question.question}**\n\n` +
            `**Answer:** ${correctAnswer}\n\n` +
            `**Confirmed:** ${coinEmoji} **${reward}** ${coinName} credited to your account, Master.`
          )
          .setFooter({ text: `${user.username} • Knowledge verified.` });

        await answerInteraction.update({ embeds: [correctEmbed], components: [] });

      } else {
        const wrongEmbed = new EmbedBuilder()
          .setColor('#FF4757')
          .setTitle('『 Incorrect Answer 』')
          .setDescription(
            `**${question.question}**\n\n` +
            `**Your Response:** ${shuffledAnswers[selectedAnswer]}\n` +
            `**Correct Answer:** ${correctAnswer}\n\n` +
            `**Notice:** Analysis suggests further study, Master.`
          )
          .setFooter({ text: `${user.username}` });

        await answerInteraction.update({ embeds: [wrongEmbed], components: [] });
      }

    } catch (error) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('『 Time Expired 』')
        .setDescription(
          `**${question.question}**\n\n` +
          `**Correct Answer:** ${correctAnswer}\n\n` +
          `**Notice:** Response time exceeded the limit, Master.`
        )
        .setFooter({ text: `${user.username}` });

      await triviaMsg.edit({ embeds: [timeoutEmbed], components: [] });
    }
  }
};
