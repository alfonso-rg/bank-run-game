// i18n/es.ts - Traducciones en Espanol

export const es = {
  // General
  loading: 'Cargando...',
  error: 'Error',
  cancel: 'Cancelar',
  save: 'Guardar',
  close: 'Cerrar',
  send: 'Enviar',

  // HomePage
  home: {
    title: 'Bank Run Game',
    subtitle: 'Juego de coordinacion economica. Eres un depositante en un banco con dos opciones: retirar tu dinero ahora o esperar.',
    howItWorks: 'Como funciona?',
    payoff70: '70 ECUs',
    payoff70Desc: 'Si ambos pacientes esperan',
    payoff50: '50 ECUs',
    payoff50Desc: 'Primeros 2 retiros',
    payoff20: '20 ECUs',
    payoff20Desc: 'Si llegas tarde',
    automatonNote: 'Recuerda: Hay 3 depositantes. Uno de ellos (el automata) siempre retira inmediatamente.',
    vsAI: 'vs Inteligencia Artificial',
    multiplayer: 'Multijugador',
    simultaneous: 'Simultaneo',
    sequential: 'Secuencial',
    rounds: 'ronda',
    roundsPlural: 'rondas',
    startPlaying: 'Comenzar a Jugar',
    createRoom: 'Crear Sala',
    joinRoom: 'Unirse a una Sala',
    loadingConfig: 'Error al cargar la configuracion del juego',
    loadingConfigError: 'Error al cargar configuracion',

    // Mode descriptions
    modeDescAI: 'una Inteligencia Artificial',
    modeDescHuman: 'otro jugador humano',
    modeDescSimultaneous: 'Todos los jugadores deciden al mismo tiempo sin saber lo que hacen los demas.',
    modeDescSequential: 'Los jugadores deciden en orden, pudiendo ver las decisiones anteriores.',
    modeDescTemplate: 'Jugaras contra {opponent} en modo {mode} durante {rounds} {roundWord}. {modeDesc}',
  },

  // Join Room Modal
  joinModal: {
    title: 'Unirse a una sala',
    yourName: 'Tu nombre',
    namePlaceholder: 'Ingresa tu nombre',
    roomCode: 'Codigo de sala',
    roomCodePlaceholder: 'Ej: ABC123',
    join: 'Unirse',
  },

  // Waiting Room
  waitingRoom: {
    title: 'Sala de Espera',
    roomCode: 'Codigo de sala',
    shareCode: 'Comparte este codigo con otro jugador',
    mode: 'Modo',
    rounds: 'Rondas',
    players: 'Jugadores',
    you: 'Tu',
    waitingForPlayer: 'Esperando a otro jugador...',
    startGame: 'Iniciar Juego',
    waitingForHost: 'Esperando a que el anfitrion inicie el juego...',
  },

  // Game Board
  game: {
    round: 'Ronda',
    mode: 'Modo',
    simultaneousMode: 'Simultaneo',
    sequentialMode: 'Secuencial',
    timeRemaining: 'Tiempo restante',
    yourDecision: 'Tu Decision',
    viewingResults: 'Viendo resultados...',
    gameOver: 'Juego terminado',
    revealingDecisions: 'Revelando decisiones...',
    previousDecisions: 'Decisiones previas',
    player: 'Jugador',
    waited: 'ESPERO',
    withdrew: 'RETIRO',
    waitingYourTurn: 'Esperando tu turno...',
    playersDecided: 'de 3 jugadores han decidido',
    yourTurn: 'Es tu turno! Elige tu accion:',
    firstToDecide: 'Eres el primero en decidir esta ronda',
    wait: 'ESPERAR',
    waitDesc: '70 ECUs si ambos esperan',
    withdraw: 'RETIRAR',
    withdrawDesc: '50 ECUs si eres primero',
    decisionSent: 'Decision enviada',
    youWaited: 'ESPERAR',
    youWithdrew: 'RETIRAR',
    waitingOthers: 'Esperando a los demas jugadores...',

    // Payoff table
    payoffTable: 'Tabla de Pagos',
    bothWait: 'Ambos esperan',
    first2Withdrawals: 'Primeros 2 retiros',
    lateWithdrawals: 'Retiros tardios',

    // Player status
    playerStatus: 'Estado de Jugadores',
    player1: 'Jugador 1',
    player2: 'Jugador 2',
    ai: 'IA',
    patient: 'Paciente',
    automaton: 'Automata',
    alwaysWithdraws: 'Siempre retira',

    // History
    history: 'Historial',
    you: 'Tu',
    otherPlayer: 'Otro jugador',
    youWaitedPast: 'ESPERASTE',
    youWithdrewPast: 'RETIRASTE',
  },

  // Chat
  chat: {
    title: 'Chat Pre-Decision',
    timeRemaining: 'Tiempo restante',
    discussStrategy: 'Puedes discutir estrategia con {opponent} antes de tomar tu decision. El automata no participa en el chat.',
    noMessages: 'No hay mensajes aun...',
    beFirst: 'Se el primero en escribir!',
    you: 'Tu',
    placeholder: 'Escribe un mensaje...',
    note: 'Nota:',
    noteText: 'Lo que digas aqui NO afecta tu decision final. Despues del chat, elegiras si ESPERAR o RETIRAR.',
    phaseStarted: 'Fase de chat iniciada',
    phaseEnded: 'Fase de chat terminada',
  },

  // Results
  results: {
    roundResults: 'Resultados de Ronda',
    finalResults: 'Resultados Finales',
    round: 'Ronda',
    yourEarnings: 'Tus Ganancias',
    ecus: 'ECUs',
    decisions: 'Decisiones',
    you: 'Tu',
    otherPlayer: 'Otro jugador',
    ai: 'IA',
    automaton: 'Automata',
    waited: 'Espero',
    withdrew: 'Retiro',
    bankRun: 'BANK RUN!',
    bankRunDesc: 'Al menos un depositante paciente retiro',
    success: 'EXITO',
    successDesc: 'Ambos depositantes pacientes esperaron',
    nextRound: 'Siguiente Ronda',
    playAgain: 'Jugar de Nuevo',
    totalEarnings: 'Ganancias Totales',
    gameComplete: 'Juego Completado',
    thankYou: 'Gracias por participar en este experimento!',
  },

  // Admin Panel
  admin: {
    title: 'Panel de Administracion',
    logout: 'Cerrar Sesion',

    // Tabs
    config: 'Configuracion',
    games: 'Partidas',
    stats: 'Estadisticas',

    // Config section
    gameConfig: 'Configuracion del Juego',
    configDesc: 'Estos ajustes se aplicaran a todos los jugadores que inicien una nueva partida.',

    opponentType: 'Tipo de Oponente',
    opponentTypeDesc: 'Contra quien jugaran los participantes',
    vsAI: 'vs Inteligencia Artificial',
    vsAIDesc: 'El jugador compite contra un modelo de IA',
    vsHuman: 'Multijugador',
    vsHumanDesc: 'Dos jugadores humanos compiten entre si',

    gameMode: 'Modo de Juego',
    gameModeDesc: 'Como se toman las decisiones',
    simultaneousMode: 'Simultaneo',
    simultaneousModeDesc: 'Todos deciden al mismo tiempo',
    sequentialMode: 'Secuencial',
    sequentialModeDesc: 'Se decide por turnos, viendo decisiones previas',

    totalRounds: 'Numero de Rondas',
    totalRoundsDesc: 'Cuantas rondas durara cada partida',

    // Chat config
    chatConfig: 'Configuracion de Chat',
    enableChat: 'Habilitar chat pre-decision',
    chatDuration: 'Duracion del chat (segundos)',
    chatFrequency: 'Frecuencia del chat',
    chatOnce: 'Solo antes de la primera ronda',
    chatEveryRound: 'Antes de cada ronda',
    chatPreview: 'Los jugadores tendran {duration} segundos para chatear {frequency}.',
    chatPreviewOnce: 'antes de la primera ronda',
    chatPreviewEvery: 'antes de cada ronda',

    // Language
    language: 'Idioma del Juego',
    languageDesc: 'Idioma por defecto para los jugadores',
    spanish: 'Espanol',
    english: 'English',

    saveChanges: 'Guardar Cambios',
    saving: 'Guardando...',
    savedSuccess: 'Configuracion guardada',
    savedError: 'Error al guardar',

    // Games section
    gamesTitle: 'Historial de Partidas',
    noGames: 'No hay partidas registradas',
    filterByMode: 'Filtrar por modo',
    filterByPlayer: 'Filtrar por tipo de jugador',
    allModes: 'Todos los modos',
    allPlayers: 'Todos los jugadores',
    human: 'Humano',
    llm: 'IA/LLM',
    exportData: 'Exportar Datos',

    // Stats section
    statsTitle: 'Estadisticas',
    totalGamesPlayed: 'Total de partidas',
    byMode: 'Por modo',
    byPlayerType: 'Por tipo de jugador',
    bankRunRate: 'Tasa de Bank Run',
    recentGames: 'Partidas recientes',
  },

  // Toasts/Notifications
  toasts: {
    roomCreated: 'Sala creada correctamente',
    joinedRoom: 'Te has unido a la sala',
    roomFull: 'La sala esta llena',
    playerJoined: '{name} se ha unido',
    playerLeft: 'Un jugador ha salido',
    playerDisconnected: 'Un jugador se ha desconectado',
    reconnected: 'Reconectado al juego',
    gameStarting: 'El juego comienza!',
    roundStarting: 'Ronda {round} comenzando',
    yourTurn: 'Es tu turno de decidir',
    gameComplete: 'Juego completado!',
    disconnected: 'Desconectado del servidor',
    connectionError: 'No se pudo conectar al servidor',
  },

  // Language selector
  languageSelector: {
    label: 'Idioma',
    spanish: 'Espanol',
    english: 'English',
  },
};

export type Translations = typeof es;
