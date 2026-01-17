// i18n/en.ts - English translations

import type { Translations } from './es';

export const en: Translations = {
  // General
  loading: 'Loading...',
  error: 'Error',
  cancel: 'Cancel',
  save: 'Save',
  close: 'Close',
  send: 'Send',

  // HomePage
  home: {
    title: 'Bank Run Game',
    subtitle: 'Economic coordination game. You are a depositor at a bank with two options: withdraw your money now or wait.',
    howItWorks: 'How does it work?',
    payoff70: '70 ECUs',
    payoff70Desc: 'If both patient depositors wait',
    payoff50: '50 ECUs',
    payoff50Desc: 'First 2 withdrawals',
    payoff20: '20 ECUs',
    payoff20Desc: 'If you arrive late',
    automatonNote: 'Remember: There are 3 depositors. One of them (the automaton) always withdraws immediately.',
    vsAI: 'vs Artificial Intelligence',
    multiplayer: 'Multiplayer',
    simultaneous: 'Simultaneous',
    sequential: 'Sequential',
    rounds: 'round',
    roundsPlural: 'rounds',
    startPlaying: 'Start Playing',
    createRoom: 'Create Room',
    joinRoom: 'Join a Room',
    loadingConfig: 'Error loading game configuration',
    loadingConfigError: 'Error loading configuration',

    // Mode descriptions
    modeDescAI: 'an Artificial Intelligence',
    modeDescHuman: 'another human player',
    modeDescSimultaneous: 'All players decide at the same time without knowing what others do.',
    modeDescSequential: 'Players decide in order, being able to see previous decisions.',
    modeDescTemplate: 'You will play against {opponent} in {mode} mode for {rounds} {roundWord}. {modeDesc}',
  },

  // Join Room Modal
  joinModal: {
    title: 'Join a room',
    yourName: 'Your name',
    namePlaceholder: 'Enter your name',
    roomCode: 'Room code',
    roomCodePlaceholder: 'Ex: ABC123',
    join: 'Join',
  },

  // Waiting Room
  waitingRoom: {
    title: 'Waiting Room',
    roomCode: 'Room Code',
    shareCode: 'Share this code with another player',
    mode: 'Mode',
    rounds: 'Rounds',
    players: 'Players',
    you: 'You',
    waitingForPlayer: 'Waiting for another player...',
    startGame: 'Start Game',
    waitingForHost: 'Waiting for the host to start the game...',
  },

  // Game Board
  game: {
    round: 'Round',
    mode: 'Mode',
    simultaneousMode: 'Simultaneous',
    sequentialMode: 'Sequential',
    timeRemaining: 'Time remaining',
    yourDecision: 'Your Decision',
    viewingResults: 'Viewing results...',
    gameOver: 'Game over',
    revealingDecisions: 'Revealing decisions...',
    previousDecisions: 'Previous decisions',
    player: 'Player',
    waited: 'WAITED',
    withdrew: 'WITHDREW',
    waitingYourTurn: 'Waiting for your turn...',
    playersDecided: 'of 3 players have decided',
    yourTurn: "It's your turn! Choose your action:",
    firstToDecide: 'You are the first to decide this round',
    wait: 'WAIT',
    waitDesc: '70 ECUs if both wait',
    withdraw: 'WITHDRAW',
    withdrawDesc: '50 ECUs if you are first',
    decisionSent: 'Decision sent',
    youWaited: 'WAIT',
    youWithdrew: 'WITHDRAW',
    waitingOthers: 'Waiting for other players...',

    // Payoff table
    payoffTable: 'Payoff Table',
    bothWait: 'Both wait',
    first2Withdrawals: 'First 2 withdrawals',
    lateWithdrawals: 'Late withdrawals',

    // Player status
    playerStatus: 'Player Status',
    player1: 'Player 1',
    player2: 'Player 2',
    ai: 'AI',
    patient: 'Patient',
    automaton: 'Automaton',
    alwaysWithdraws: 'Always withdraws',

    // History
    history: 'History',
    you: 'You',
    otherPlayer: 'Other player',
    youWaitedPast: 'WAITED',
    youWithdrewPast: 'WITHDREW',
  },

  // Chat
  chat: {
    title: 'Pre-Decision Chat',
    timeRemaining: 'Time remaining',
    discussStrategy: 'You can discuss strategy with {opponent} before making your decision. The automaton does not participate in the chat.',
    noMessages: 'No messages yet...',
    beFirst: 'Be the first to write!',
    you: 'You',
    placeholder: 'Write a message...',
    note: 'Note:',
    noteText: 'What you say here does NOT affect your final decision. After the chat, you will choose whether to WAIT or WITHDRAW.',
    phaseStarted: 'Chat phase started',
    phaseEnded: 'Chat phase ended',
  },

  // Results
  results: {
    roundResults: 'Round Results',
    finalResults: 'Final Results',
    round: 'Round',
    yourEarnings: 'Your Earnings',
    ecus: 'ECUs',
    decisions: 'Decisions',
    you: 'You',
    otherPlayer: 'Other player',
    ai: 'AI',
    automaton: 'Automaton',
    waited: 'Waited',
    withdrew: 'Withdrew',
    bankRun: 'BANK RUN!',
    bankRunDesc: 'At least one patient depositor withdrew',
    success: 'SUCCESS',
    successDesc: 'Both patient depositors waited',
    nextRound: 'Next Round',
    playAgain: 'Play Again',
    totalEarnings: 'Total Earnings',
    gameComplete: 'Game Complete',
    thankYou: 'Thank you for participating in this experiment!',
  },

  // Admin Panel
  admin: {
    title: 'Administration Panel',
    logout: 'Logout',

    // Tabs
    config: 'Configuration',
    games: 'Games',
    stats: 'Statistics',

    // Config section
    gameConfig: 'Game Configuration',
    configDesc: 'These settings will apply to all players who start a new game.',

    opponentType: 'Opponent Type',
    opponentTypeDesc: 'Who the participants will play against',
    vsAI: 'vs Artificial Intelligence',
    vsAIDesc: 'The player competes against an AI model',
    vsHuman: 'Multiplayer',
    vsHumanDesc: 'Two human players compete against each other',

    gameMode: 'Game Mode',
    gameModeDesc: 'How decisions are made',
    simultaneousMode: 'Simultaneous',
    simultaneousModeDesc: 'Everyone decides at the same time',
    sequentialMode: 'Sequential',
    sequentialModeDesc: 'Decisions are made in turns, seeing previous decisions',

    totalRounds: 'Number of Rounds',
    totalRoundsDesc: 'How many rounds each game will last',

    // Chat config
    chatConfig: 'Chat Configuration',
    enableChat: 'Enable pre-decision chat',
    chatDuration: 'Chat duration (seconds)',
    chatFrequency: 'Chat frequency',
    chatOnce: 'Only before the first round',
    chatEveryRound: 'Before each round',
    chatPreview: 'Players will have {duration} seconds to chat {frequency}.',
    chatPreviewOnce: 'before the first round',
    chatPreviewEvery: 'before each round',

    // Language
    language: 'Game Language',
    languageDesc: 'Default language for players',
    spanish: 'Spanish',
    english: 'English',

    saveChanges: 'Save Changes',
    saving: 'Saving...',
    savedSuccess: 'Configuration saved',
    savedError: 'Error saving',

    // Games section
    gamesTitle: 'Game History',
    noGames: 'No games recorded',
    filterByMode: 'Filter by mode',
    filterByPlayer: 'Filter by player type',
    allModes: 'All modes',
    allPlayers: 'All players',
    human: 'Human',
    llm: 'AI/LLM',
    exportData: 'Export Data',

    // Stats section
    statsTitle: 'Statistics',
    totalGamesPlayed: 'Total games',
    byMode: 'By mode',
    byPlayerType: 'By player type',
    bankRunRate: 'Bank Run Rate',
    recentGames: 'Recent games',
  },

  // Toasts/Notifications
  toasts: {
    roomCreated: 'Room created successfully',
    joinedRoom: 'You have joined the room',
    roomFull: 'The room is full',
    playerJoined: '{name} has joined',
    playerLeft: 'A player has left',
    playerDisconnected: 'A player has disconnected',
    reconnected: 'Reconnected to the game',
    gameStarting: 'The game is starting!',
    roundStarting: 'Round {round} starting',
    yourTurn: "It's your turn to decide",
    gameComplete: 'Game completed!',
    disconnected: 'Disconnected from server',
    connectionError: 'Could not connect to server',
  },

  // Language selector
  languageSelector: {
    label: 'Language',
    spanish: 'Spanish',
    english: 'English',
  },
};
