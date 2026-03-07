import React from 'react';
import { AppProvider } from './context/AppContext';
import { MainWindow } from './components/MainWindow';

function App() {
  // Note: Global drag-and-drop prevention is handled in index.html
  // to ensure it's active before React mounts
  
  return (
    <AppProvider>
      <MainWindow />
    </AppProvider>
  );
}

export default App;
