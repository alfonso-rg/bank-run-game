# Bank Run Game - Diamond & Dybvig

Un juego web interactivo de coordinación económica basado en el modelo de Diamond-Dybvig. Los jugadores pueden jugar contra un LLM o contra otros humanos en tiempo real.

## Descripción del Juego

Este es un juego de coordinación con 3 depositantes en un banco:
- **Jugador 1 (Paciente)**: Humano que debe decidir entre ESPERAR o RETIRAR
- **Jugador 2 (Paciente)**: Humano o LLM (en modo vs IA) que debe decidir
- **Autómata (Impaciente)**: Siempre retira inmediatamente

Payoffs por ronda:
  - **70 ECUs**: Si ambos pacientes ESPERAN (éxito)
  - **50 ECUs**: Para los primeros 2 retiros (el autómata siempre es uno de ellos)
  - **20 ECUs**: Para retiros tardíos (failure)

El autómata SIEMPRE retira, lo que significa:
- Si ambos pacientes ESPERAN: ambos obtienen 70 ECUs ✅
- Si un paciente RETIRA: obtiene 50 ECUs, el otro 20 ECUs
- Si ambos pacientes RETIRAN: ambos obtienen 20 ECUs (el autómata y el primer paciente obtienen 50)

## Stack Tecnológico

### Backend
- Node.js + Express + TypeScript
- Socket.io para comunicación en tiempo real
- MongoDB Atlas para almacenamiento de datos
- OpenAI API para el jugador LLM

### Frontend
- React + TypeScript + Vite
- Tailwind CSS para estilos
- Socket.io client para comunicación en tiempo real
- Zustand para gestión de estado

## Estructura del Proyecto

```
bank-run-game/
├── client/          # Frontend React
├── server/          # Backend Node.js
└── README.md        # Este archivo
```

## Instalación y Ejecución

### Prerrequisitos
- Node.js 18+ instalado
- MongoDB Atlas cuenta (tier gratuito) - [Crear cuenta](https://www.mongodb.com/cloud/atlas/register)
- OpenAI API key - [Obtener API key](https://platform.openai.com/api-keys)

### Paso 1: Clonar el repositorio

```bash
git clone <url-del-repo>
cd bank-run-game
```

### Paso 2: Setup Backend

```bash
cd server
npm install

# El archivo .env ya existe, solo necesitas verificar/actualizar:
# - MONGODB_URI: tu URI de MongoDB Atlas
# - OPENAI_API_KEY: tu API key de OpenAI (ya configurada si usaste la del proyecto Python)
```

### Paso 3: Setup Frontend

```bash
cd ../client
npm install

# El archivo .env ya está configurado para desarrollo local
# No necesitas modificar nada
```

### Paso 4: Ejecutar ambos servidores

En dos terminales diferentes:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# El servidor se ejecutará en http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# La aplicación se abrirá en http://localhost:5173
```

### Verificar que funciona

1. Abre http://localhost:5173 en tu navegador
2. Deberías ver la página principal con las opciones "Jugar contra IA" y "Multijugador"
3. Para probar multijugador, abre dos pestañas/ventanas del navegador

## Variables de Entorno

### Backend (server/.env)
```
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (client/.env)
```
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Modos de Juego

### Modo Simultáneo
Todos los jugadores deciden al mismo tiempo. Los resultados se revelan juntos.

### Modo Secuencial
Los jugadores deciden en orden aleatorio. Cada decisión se revela progresivamente (sin identidad del jugador).

## Características

- ✅ Juego vs LLM (OpenAI GPT-4o-mini)
- ✅ Modo multijugador (2 humanos + 1 LLM)
- ✅ Salas de espera con códigos únicos
- ✅ Modos simultáneo y secuencial
- ✅ Reconexión automática en caso de desconexión
- ✅ Almacenamiento de resultados para análisis
- ✅ Rate limiting para prevenir abuso

## Deploy

### Backend (Render)
1. Conectar repositorio a Render
2. Configurar variables de entorno
3. Deploy automático desde main branch

### Frontend (Vercel)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático desde main branch

## Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test

# E2E tests
npm run test:e2e
```

## Desarrollo

Este proyecto fue desarrollado como parte de investigación en economía experimental sobre bank runs y comportamiento de coordinación.

## Licencia

MIT

## Autor

Alfonso - Investigación en Economía Experimental
