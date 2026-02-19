import React from 'react';
import { AppProvider } from './context/AppContext';
import { MainWindow } from './components/MainWindow';

function App() {
  return (
    <AppProvider>
      <MainWindow />
    </AppProvider>
  );
}

export default App;
