import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

const activeGames = new Map();

export default {
    name: 'tictactoe',
    description: 'Play Tic Tac Toe with another user',
    usage: 'tictactoe @user',
    category: 'fun',
    aliases: ['ttt', 'xo'],
    cooldown: 10,

    async execute(message, args) {
        const guildId = message.guild.id;
        const challenger = message.author;
        const opponent = message.mentions.users.first();

        // Check if opponent is mentioned
        if (!opponent) {
            const prefix = await getPrefix(guildId);
            const embed = await errorEmbed(guildId, 'No Opponent',
                `${GLYPHS.ERROR} Please mention a user to challenge!\n\n**Usage:** \`${prefix}tictactoe @user\``
            );
            return message.reply({ embeds: [embed] });
        }

        // Can't play against yourself
        if (opponent.id === challenger.id) {
            const embed = await errorEmbed(guildId, 'Invalid Opponent',
                `${GLYPHS.ERROR} You can't play against yourself!`
            );
            return message.reply({ embeds: [embed] });
        }

        // Can't play against bots
        if (opponent.bot) {
            const embed = await errorEmbed(guildId, 'Invalid Opponent',
                `${GLYPHS.ERROR} You can't play against a bot!`
            );
            return message.reply({ embeds: [embed] });
        }

        // Check if either player is in a game
        const gameKey = `${guildId}-${challenger.id}`;
        const opponentGameKey = `${guildId}-${opponent.id}`;
        
        if (activeGames.has(gameKey) || activeGames.has(opponentGameKey)) {
            const embed = await errorEmbed(guildId, 'Game In Progress',
                `${GLYPHS.ERROR} One of you is already in a game!`
            );
            return message.reply({ embeds: [embed] });
        }

        // Create challenge embed
        const challengeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎮 Tic Tac Toe Challenge!')
            .setDescription(
                `${challenger} has challenged ${opponent} to a game of Tic Tac Toe!\n\n` +
                `${opponent}, do you accept?`
            )
            .setFooter({ text: 'Challenge expires in 30 seconds' });

        const acceptRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ttt_accept')
                .setLabel('Accept')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('ttt_decline')
                .setLabel('Decline')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

        const challengeMsg = await message.reply({ 
            content: `${opponent}`,
            embeds: [challengeEmbed], 
            components: [acceptRow] 
        });

        // Wait for response
        try {
            const response = await challengeMsg.awaitMessageComponent({
                filter: i => i.user.id === opponent.id,
                componentType: ComponentType.Button,
                time: 30000
            });

            if (response.customId === 'ttt_decline') {
                const declineEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ Challenge Declined')
                    .setDescription(`${opponent} declined the challenge.`);
                
                return response.update({ embeds: [declineEmbed], components: [] });
            }

            // Start the game
            await response.deferUpdate();
            await this.startGame(challengeMsg, challenger, opponent, guildId);

        } catch (error) {
            const expiredEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⏰ Challenge Expired')
                .setDescription(`${opponent} didn't respond in time.`);
            
            return challengeMsg.edit({ embeds: [expiredEmbed], components: [] });
        }
    },

    async startGame(gameMsg, player1, player2, guildId) {
        // Player 1 is X, Player 2 is O
        const game = {
            board: ['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'],
            players: {
                X: player1,
                O: player2
            },
            currentTurn: 'X',
            moves: 0
        };

        const gameKey = `${guildId}-${player1.id}`;
        activeGames.set(gameKey, game);

        await this.updateGameMessage(gameMsg, game, guildId);
        await this.handleMoves(gameMsg, game, guildId, gameKey);
    },

    async updateGameMessage(gameMsg, game, guildId) {
        const currentPlayer = game.players[game.currentTurn];
        const symbol = game.currentTurn === 'X' ? '❌' : '⭕';

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎮 Tic Tac Toe')
            .setDescription(
                `**${game.players.X.username}** (❌) vs **${game.players.O.username}** (⭕)\n\n` +
                `${symbol} **${currentPlayer.username}'s turn**`
            )
            .setFooter({ text: 'Click a button to make your move!' });

        const rows = [];
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 3; j++) {
                const index = i * 3 + j;
                const cell = game.board[index];
                
                const button = new ButtonBuilder()
                    .setCustomId(`ttt_${index}`)
                    .setStyle(cell === '⬜' ? ButtonStyle.Secondary : (cell === 'X' ? ButtonStyle.Danger : ButtonStyle.Primary))
                    .setDisabled(cell !== '⬜');

                // Use emoji only, no label (avoids empty string validation error)
                if (cell === '⬜') {
                    button.setEmoji('⬜');
                } else if (cell === 'X') {
                    button.setEmoji('❌');
                } else {
                    button.setEmoji('⭕');
                }

                row.addComponents(button);
            }
            rows.push(row);
        }

        await gameMsg.edit({ embeds: [embed], components: rows });
    },

    async handleMoves(gameMsg, game, guildId, gameKey) {
        const collector = gameMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000
        });

        collector.on('collect', async (interaction) => {
            const currentPlayer = game.players[game.currentTurn];

            // Check if it's the correct player's turn
            if (interaction.user.id !== currentPlayer.id) {
                return interaction.reply({ 
                    content: `❌ It's not your turn!`, 
                    ephemeral: true 
                });
            }

            // Get the cell index
            const cellIndex = parseInt(interaction.customId.split('_')[1]);

            // Make the move
            game.board[cellIndex] = game.currentTurn;
            game.moves++;

            // Check for winner
            const winner = this.checkWinner(game.board);
            
            if (winner) {
                collector.stop('winner');
                activeGames.delete(gameKey);

                const winnerPlayer = game.players[winner];
                const loserPlayer = winner === 'X' ? game.players.O : game.players.X;

                const winEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🏆 Game Over!')
                    .setDescription(
                        `**${winnerPlayer.username}** ${winner === 'X' ? '❌' : '⭕'} wins!\n\n` +
                        this.renderBoard(game.board) + `\n\n` +
                        `Better luck next time, ${loserPlayer.username}!`
                    );

                await this.disableButtons(gameMsg, game);
                return interaction.update({ embeds: [winEmbed], components: [] });
            }

            // Check for draw
            if (game.moves === 9) {
                collector.stop('draw');
                activeGames.delete(gameKey);

                const drawEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('🤝 It\'s a Draw!')
                    .setDescription(
                        `Nobody wins this time!\n\n` +
                        this.renderBoard(game.board)
                    );

                return interaction.update({ embeds: [drawEmbed], components: [] });
            }

            // Switch turns
            game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';
            
            await interaction.deferUpdate();
            await this.updateGameMessage(gameMsg, game, guildId);
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                activeGames.delete(gameKey);
                
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏰ Game Timed Out')
                    .setDescription('The game was cancelled due to inactivity.');

                await gameMsg.edit({ embeds: [timeoutEmbed], components: [] });
            }
        });
    },

    checkWinner(board) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] !== '⬜' && board[a] === board[b] && board[b] === board[c]) {
                return board[a];
            }
        }

        return null;
    },

    renderBoard(board) {
        const symbols = board.map(cell => {
            if (cell === 'X') return '❌';
            if (cell === 'O') return '⭕';
            return '⬜';
        });

        return `${symbols[0]}${symbols[1]}${symbols[2]}\n${symbols[3]}${symbols[4]}${symbols[5]}\n${symbols[6]}${symbols[7]}${symbols[8]}`;
    },

    async disableButtons(gameMsg, game) {
        const rows = [];
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 3; j++) {
                const index = i * 3 + j;
                const cell = game.board[index];
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ttt_${index}`)
                        .setEmoji(cell === '⬜' ? '⬜' : (cell === 'X' ? '❌' : '⭕'))
                        .setStyle(cell === '⬜' ? ButtonStyle.Secondary : (cell === 'X' ? ButtonStyle.Danger : ButtonStyle.Primary))
                        .setDisabled(true)
                );
            }
            rows.push(row);
        }
        return rows;
    }
};
