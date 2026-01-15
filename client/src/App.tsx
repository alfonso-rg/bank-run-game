// App.tsx - Aplicación principal

import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { WaitingRoom } from './components/room/WaitingRoom';
import { GameBoard } from './components/game/GameBoard';
import { RoundResults } from './components/results/RoundResults';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminPanel } from './components/admin/AdminPanel';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './stores/gameStore';
import { useAdminStore } from './stores/adminStore';
import { isAdminLoggedIn } from './services/adminApi';
import { useEffect } from 'react';

// Componente para la vista del juego
function GameView() {
  // Inicializar socket
  useSocket();

  const { gameState, roomCode, myPlayerId, waitingRoomMode, isMultiplayerRoom, waitingPlayers } = useGameStore();

  // Routing basado en el estado del juego
  const renderView = () => {
    // Sin juego activo - HomePage
    if (!gameState && !roomCode) {
      return <HomePage />;
    }

    // Sala de espera multijugador (sin gameState todavía)
    if (!gameState && roomCode && isMultiplayerRoom && waitingRoomMode) {
      return (
        <WaitingRoom
          roomCode={roomCode}
          players={waitingPlayers}
          mode={waitingRoomMode}
          isCreator={myPlayerId === 'player1'}
        />
      );
    }

    // Sala de espera (con gameState en LOBBY)
    if (gameState && gameState.status === 'LOBBY') {
      const players = [
        { playerName: gameState.players.player1.playerName, playerId: 'player1' },
        ...(gameState.players.player2.isLLM ? [] : [
          { playerName: gameState.players.player2.playerName, playerId: 'player2' }
        ])
      ];

      const isCreator = myPlayerId === 'player1';

      return (
        <WaitingRoom
          roomCode={gameState.roomCode}
          players={players}
          mode={gameState.mode}
          isCreator={isCreator}
        />
      );
    }

    // Juego en curso
    if (gameState && (
      gameState.status === 'ROUND_DECISION' ||
      gameState.status === 'ROUND_REVEALING' ||
      gameState.status === 'STARTING'
    )) {
      return <GameBoard />;
    }

    // Resultados de ronda
    if (gameState && gameState.status === 'ROUND_RESULTS') {
      const lastResult = gameState.roundHistory[gameState.roundHistory.length - 1];
      const isLastRound = gameState.currentRound.roundNumber >= gameState.config.totalRounds;

      return <RoundResults result={lastResult} isLastRound={isLastRound} />;
    }

    // Juego terminado
    if (gameState && gameState.status === 'GAME_OVER') {
      const lastResult = gameState.roundHistory[gameState.roundHistory.length - 1];
      return <RoundResults result={lastResult} isLastRound={true} />;
    }

    // Fallback
    return <HomePage />;
  };

  return renderView();
}

// Componente para la vista de administración
function AdminView() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuthenticated } = useAdminStore();

  // Verificar si hay sesión guardada al montar
  useEffect(() => {
    if (isAdminLoggedIn()) {
      setAuthenticated(true);
    }
  }, [setAuthenticated]);

  const handleBack = () => {
    navigate('/');
  };

  const handleLogout = () => {
    setAuthenticated(false);
    navigate('/');
  };

  if (!isAuthenticated) {
    return <AdminLogin onBack={handleBack} />;
  }

  return <AdminPanel onLogout={handleLogout} />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/admin" element={<AdminView />} />
        <Route path="/*" element={<GameView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
