# Bank Run Game - Contexto para Claude

## Descripcion General

Aplicacion web para experimentos economicos basados en el modelo Diamond-Dybvig de corridas bancarias. Los jugadores son depositantes que deben decidir entre KEEP (esperar) o WITHDRAW (retirar su dinero).

**Contexto academico:** Herramienta de investigacion en economia experimental para estudiar comportamiento en juegos de coordinacion.

## Arquitectura

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Frontend      │◄──────────────────►│    Backend      │
│   (Vercel)      │    Socket.io       │   (Render)      │
│   React + Vite  │                    │  Node + Express │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │   MongoDB       │
                                       │   (Atlas)       │
                                       └─────────────────┘
```

## Stack Tecnologico

### Backend (`/server`)
- **Runtime:** Node.js 18+
- **Framework:** Express 4.18
- **Lenguaje:** TypeScript 5.0
- **WebSockets:** Socket.io 4.6
- **Base de datos:** MongoDB + Mongoose 7.0
- **LLM:** OpenAI API (GPT-4o-mini)
- **Validacion:** Joi

### Frontend (`/client`)
- **Framework:** React 18.2
- **Build:** Vite 4.3
- **Estado:** Zustand 4.3
- **Routing:** React Router DOM 6.11
- **Estilos:** Tailwind CSS 3.3
- **WebSockets:** Socket.io-client 4.6

## Estructura de Carpetas

```
bank-run-game/
├── client/                    # Frontend React
│   └── src/
│       ├── components/
│       │   ├── admin/         # Panel administrador
│       │   │   ├── AdminLogin.tsx
│       │   │   ├── AdminPanel.tsx
│       │   │   └── GameDetail.tsx
│       │   ├── game/          # Tablero de juego
│       │   ├── room/          # Sala de espera
│       │   ├── results/       # Resultados
│       │   └── ui/            # Componentes reutilizables
│       ├── hooks/
│       │   ├── useSocket.ts   # Conexion Socket.io
│       │   └── useTimer.ts
│       ├── services/
│       │   └── adminApi.ts    # API REST para admin
│       ├── stores/
│       │   ├── gameStore.ts   # Estado del juego (Zustand)
│       │   └── adminStore.ts  # Estado del admin
│       ├── types/
│       └── App.tsx
│
└── server/                    # Backend Node.js
    └── src/
        ├── config/
        │   ├── database.ts    # Conexion MongoDB
        │   └── logger.ts      # Winston logger
        ├── models/
        │   ├── GameResult.ts  # Schema resultados
        │   ├── GlobalConfig.ts # Configuracion global del juego
        │   └── Room.ts        # Schema salas
        ├── routes/
        │   └── admin.ts       # Endpoints REST admin
        ├── services/
        │   ├── GameService.ts      # Logica del juego
        │   ├── LLMService.ts       # Integracion OpenAI
        │   └── MatchmakingService.ts
        ├── socket/
        │   └── gameHandlers.ts     # Eventos Socket.io
        ├── types.ts           # Tipos compartidos
        └── index.ts           # Entry point
```

## Modelo del Juego

### Jugadores (siempre 3)
- **player1:** Humano, paciente
- **player2:** Humano o LLM, paciente
- **automaton:** Siempre WITHDRAW (impaciente)

### Payoffs (ECUs)
- **70:** Ambos pacientes hacen KEEP (exito)
- **50:** Primeros 2 en retirar
- **20:** Tercero en retirar o KEEP cuando hay fracaso

### Modos de Juego
- **Simultaneo:** Todos deciden al mismo tiempo
- **Secuencial:** Deciden en orden aleatorio, viendo decisiones previas

### Estados del Juego
```
LOBBY → STARTING → ROUND_DECISION → [ROUND_REVEALING] → ROUND_RESULTS → ... → GAME_OVER
```

## Modelo de Datos (MongoDB)

### GameResult
```typescript
{
  gameId: string,
  roomCode: string,          // 6 chars, ej: "ABC123"
  mode: 'sequential' | 'simultaneous',
  timestamp: Date,
  rounds: [{
    round: number,
    decisions: { player1, player2, automaton: 'KEEP' | 'WITHDRAW' },
    decisionTimes: { player1, player2, automaton: number },  // ms desde inicio
    bankRun: boolean,        // true si player1 o player2 retiro
    payoffs: { player1, player2, automaton: number },
    decisionOrder: string[],
    paidWhen?: { ... },      // Solo secuencial
    seqTrace?: string        // Solo secuencial
  }],
  totalPayoffs: { player1, player2, automaton: number },
  playerTypes: ['human', 'human' | 'llm'],
  sessionMetadata: {
    llmModel?: string,
    playerProfiles?: { ... }
  }
}
```

## Eventos Socket.io

### Cliente → Servidor
- `create-room`: Crear sala
- `join-room`: Unirse a sala
- `start-game`: Iniciar juego
- `submit-decision`: Enviar decision
- `ready-next-round`: Siguiente ronda

### Servidor → Cliente
- `room-created`, `room-joined`, `player-joined`
- `game-starting`, `round-starting`
- `decision-revealed` (secuencial)
- `round-complete`, `game-over`
- `error`

## API REST Admin

**Base:** `/api/admin`
**Auth:** Header `x-admin-password`

| Endpoint | Descripcion |
|----------|-------------|
| `GET /verify` | Verificar contraseña |
| `GET /games` | Lista paginada con filtros |
| `GET /games/:gameId` | Detalle de partida |
| `GET /games/export` | Exportar JSON |
| `GET /stats` | Estadisticas agregadas |
| `GET /config` | Obtener configuracion global |
| `PUT /config` | Actualizar configuracion global |

**Filtros disponibles:** `mode`, `playerType`, `fromDate`, `toDate`, `page`, `limit`

## API Publica

| Endpoint | Descripcion |
|----------|-------------|
| `GET /api/config` | Obtener configuracion global (sin auth) |

## Configuracion Global del Juego

El admin puede configurar el modo de juego que veran todos los jugadores:

```typescript
{
  opponentType: 'ai' | 'human',     // IA o Multijugador
  gameMode: 'sequential' | 'simultaneous',
  totalRounds: number,              // 1-20
  updatedAt: Date
}
```

- **opponentType:** Define si los jugadores juegan contra IA o contra otro humano
- **gameMode:** Define si las decisiones son simultaneas o secuenciales
- **totalRounds:** Numero de rondas por partida

Los jugadores ven directamente esta configuracion en HomePage y no pueden cambiarla.

## Variables de Entorno

### Backend (Render)
```
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
PORT=3001
CLIENT_URL=https://tu-app.vercel.app
ADMIN_PASSWORD=contraseña_segura
```

### Frontend (Vercel)
```
VITE_API_URL=https://tu-api.onrender.com
VITE_SOCKET_URL=https://tu-api.onrender.com
```

## Comandos Utiles

```bash
# Desarrollo local
cd server && npm run dev     # Backend en :3001
cd client && npm run dev     # Frontend en :5173

# Build
cd server && npm run build
cd client && npm run build
```

## URLs de Produccion

- **Frontend:** Vercel (configura en dashboard)
- **Backend:** Render (configura en dashboard)
- **Admin Panel:** `/admin` (requiere ADMIN_PASSWORD)

## Notas Importantes

1. El **automaton siempre retira** - simula un depositante impaciente
2. **Bank run** se define como: al menos un jugador paciente (player1 o player2) elige WITHDRAW
3. Los **tiempos de decision** se miden en ms desde el inicio de cada ronda
4. El **LLM** recibe un perfil aleatorio (edad, genero, educacion, confianza institucional)
5. Las salas se **auto-eliminan** 30 min despues de crearse (TTL index)
