# Bank Run Game - Diamond & Dybvig

Un juego web interactivo de coordinación económica basado en el modelo de Diamond-Dybvig. Los jugadores pueden jugar contra un LLM o contra otros humanos en tiempo real.

## Descripción del Juego

Este es un juego de coordinación con 3 depositantes en un banco:
- Cada depositante tiene 40 ECUs depositados
- El banco ofrece:
  - 50 ECUs por retiro inmediato
  - 70 ECUs si esperas y el proyecto madura con éxito
  - 20 ECUs en caso de fallo (failure)
- Un depositante siempre tiene shock de liquidez y retirará con seguridad
- Los otros 2 deben coordinar su decisión

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

## Instalación

### Prerrequisitos
- Node.js 18+ instalado
- MongoDB Atlas cuenta (tier gratuito)
- OpenAI API key

### Setup Backend

```bash
cd server
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run dev
```

### Setup Frontend

```bash
cd client
npm install
cp .env.example .env
# Editar .env con la URL del backend
npm run dev
```

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
