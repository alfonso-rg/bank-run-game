// App.tsx - Aplicación principal

import { Toaster } from 'react-hot-toast';
import { HomePage } from './components/HomePage';
import { useSocket } from './hooks/useSocket';

function App() {
  // Inicializar socket
  useSocket();

  return (
    <>
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
      <HomePage />
    </>
  );
}

export default App;
