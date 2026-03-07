import React, { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { MainWindow } from './components/MainWindow';

function App() {
  // Prevent default drag-and-drop behavior globally
  // This prevents the browser from opening dropped files in a new window
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent default behavior for all drag events on document
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', preventDefaults);
    
    // Also prevent navigation when files are dragged over the window
    document.addEventListener('dragenter', preventDefaults);
    document.addEventListener('dragleave', preventDefaults);

    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', preventDefaults);
      document.removeEventListener('dragenter', preventDefaults);
      document.removeEventListener('dragleave', preventDefaults);
    };
  }, []);

  return (
    <AppProvider>
      <MainWindow />
    </AppProvider>
  );
}

export default App;
