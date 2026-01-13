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

## Estado Actual del Proyecto

### Totalmente Funcional ✅
- **Modo Simultáneo vs IA**: Funciona perfectamente
- **Modo Secuencial vs IA**: Funciona perfectamente con revelación progresiva de decisiones
- **Socket.io Singleton**: Arreglado - una única conexión por cliente
- **Historial de rondas**: Muestra todas las decisiones (tuyas, IA, autómata)
- **Integración LLM**: GPT-4o-mini con roleplay profiles
- **Persistencia**: Todos los juegos se guardan en MongoDB
- **UI Responsive**: Funciona en desktop y móvil

### En Testing 🔧
- **Modo Multijugador (humano vs humano)**: Infraestructura lista pero necesita más pruebas
  - Las salas se crean correctamente
  - Los jugadores se pueden unir
  - Falta validar flujo completo de juego

### Pendiente ⏳
- **Avance inmediato**: Actualmente espera 30s aunque todos hayan decidido
- **Modo conversacional**: Chat con LLM durante fase de decisión (feature experimental futura)

### Características Implementadas
- ✅ Juego vs LLM (OpenAI GPT-4o-mini)
- ✅ Modo multijugador (2 humanos + autómata) - infraestructura lista
- ✅ Salas de espera con códigos únicos
- ✅ Modos simultáneo y secuencial
- ✅ Revelación progresiva en modo secuencial (sin identidades)
- ✅ Reconexión automática en caso de desconexión
- ✅ Almacenamiento de resultados para análisis
- ✅ Rate limiting para API calls

## Deploy en Producción

### Paso 1: Backend en Render

1. **Crear Web Service** en [Render](https://render.com):
   - Click en "New +" → "Web Service"
   - Conectar tu repositorio de GitHub
   - Configuración:
     - **Name**: `bank-run-game-server` (o el nombre que prefieras)
     - **Root Directory**: `server`
     - **Environment**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `node dist/index.js`

2. **Variables de Entorno** (pestaña "Environment"):
   ```
   MONGODB_URI=mongodb+srv://tu-usuario:password@cluster.mongodb.net/bankrun
   OPENAI_API_KEY=sk-proj-...
   PORT=3001
   NODE_ENV=production
   CLIENT_URL=https://tu-app.vercel.app
   ```

   **IMPORTANTE**: El `CLIENT_URL` lo configurarás después de desplegar en Vercel

3. **Deploy**: Click en "Create Web Service"
   - Copia la URL que te da Render (ej: `https://bank-run-game-server.onrender.com`)
   - **Nota**: El tier gratuito tiene "cold starts" (~50 segundos tras inactividad)

### Paso 2: Frontend en Vercel

1. **Importar Proyecto** en [Vercel](https://vercel.com):
   - Click en "New Project"
   - Importar tu repositorio de GitHub
   - Configuración:
     - **Framework Preset**: Vite
     - **Root Directory**: `client`
     - **Build Command**: `npm run build` (autodetectado)
     - **Output Directory**: `dist` (autodetectado)

2. **Variables de Entorno** (pestaña "Environment Variables"):
   ```
   VITE_API_URL=https://tu-backend.onrender.com
   VITE_SOCKET_URL=https://tu-backend.onrender.com
   ```

   Reemplaza con la URL real de tu backend de Render

3. **Deploy**: Vercel desplegará automáticamente
   - Copia la URL que te da Vercel (ej: `https://bank-run-game.vercel.app`)

### Paso 3: Actualizar CORS en Backend

1. Vuelve a Render → Tu Web Service → "Environment"
2. Actualiza `CLIENT_URL` con la URL de Vercel que obtuviste
3. Render redesplegará automáticamente

### Paso 4: Verificar

1. Abre la URL de Vercel en tu navegador
2. Prueba crear un juego vs IA
3. Si todo funciona, ¡listo! 🎉

### Notas de Deployment

- **Render Free Tier**: El servidor se "duerme" tras 15 minutos de inactividad. El primer request tardará ~50 segundos en "despertar"
- **Vercel Free Tier**: Sin limitaciones significativas para este proyecto
- **MongoDB Atlas**: El tier gratuito (512MB) es suficiente para miles de partidas
- **OpenAI API**: Cada partida cuesta ~$0.002-0.005 (GPT-4o-mini es muy económico)

### Actualizar Deployment

Cada vez que hagas `git push` a la rama `main`:
- Vercel se redesplegará automáticamente ✅
- Render se redesplegará automáticamente ✅

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
