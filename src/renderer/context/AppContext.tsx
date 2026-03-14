import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ImageFile, ProcessingParams, Template, ProcessingResult } from '../../main/types';

// Default processing parameters (Requirements 8.1)
export const DEFAULT_PARAMS: ProcessingParams = {
  resize: undefined,  // Keep original size
  compression: {
    mode: 'quality',
    value: 70  // Approximately -30% compression
  },
  format: undefined  // Keep original format
};

// Image progress tracking interface (Requirements 3.1, 8.1)
export interface ImageProgress {
  index: number;
  fileName: string;
  filePath: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number; // 0-100
  error?: string;
  outputPath?: string;
  originalSize?: number;
  processedSize?: number;
  estimatedSize?: number;
}

// Application state interface (Requirement 7.1)
export interface AppState {
  // Input files
  inputFiles: ImageFile[];
  
  // Processing parameters (with defaults)
  processingParams: ProcessingParams;
  
  // Templates
  templates: Template[];
  selectedTemplateId?: string;
  
  // Processing state
  isProcessing: boolean;
  progress: number;  // 0-100
  
  // Results
  result?: ProcessingResult;
  outputDirectory?: string;
  
  // Per-image progress tracking (Requirements 3.1)
  imageProgress: ImageProgress[];
  
  // Auto-process toggle (Requirements 8.1)
  autoProcessOnDrop: boolean;
}

// Notification interface
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number; // milliseconds, undefined = persistent
}

// Context actions interface
interface AppContextValue {
  state: AppState;
  setInputFiles: (files: ImageFile[]) => void;
  setProcessingParams: (params: ProcessingParams) => void;
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplateId: (id: string | undefined) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: number) => void;
  setResult: (result: ProcessingResult | undefined) => void;
  setOutputDirectory: (directory: string | undefined) => void;
  resetState: () => void;
  showNotification: (message: string, type: 'success' | 'info' | 'warning' | 'error', duration?: number) => void;
  dismissNotification: (id: string) => void;
  notifications: Notification[];
  
  // Image progress management (Requirements 3.1, 3.2, 3.3, 3.4, 8.1)
  initializeImageProgress: (files: ImageFile[]) => void;
  updateImageProgress: (index: number, progress: Partial<ImageProgress>) => void;
  setAutoProcessOnDrop: (enabled: boolean) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Initial state
const initialState: AppState = {
  inputFiles: [],
  processingParams: DEFAULT_PARAMS,
  templates: [],
  selectedTemplateId: undefined,
  isProcessing: false,
  progress: 0,
  result: undefined,
  outputDirectory: undefined,
  imageProgress: [],
  autoProcessOnDrop: true, // Default enabled
};

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load settings from localStorage on mount (Requirements 8.4)
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('batchpic-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (typeof settings.autoProcessOnDrop === 'boolean') {
          setState(prev => ({ ...prev, autoProcessOnDrop: settings.autoProcessOnDrop }));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  const setInputFiles = (files: ImageFile[]) => {
    setState(prev => ({ ...prev, inputFiles: files }));
  };

  const setProcessingParams = (params: ProcessingParams) => {
    setState(prev => ({ ...prev, processingParams: params }));
  };

  const setTemplates = (templates: Template[]) => {
    setState(prev => ({ ...prev, templates }));
  };

  const setSelectedTemplateId = (id: string | undefined) => {
    setState(prev => ({ ...prev, selectedTemplateId: id }));
  };

  const setIsProcessing = (isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }));
  };

  const setProgress = (progress: number) => {
    setState(prev => ({ ...prev, progress }));
  };

  const setResult = (result: ProcessingResult | undefined) => {
    setState(prev => ({ ...prev, result }));
  };

  const setOutputDirectory = (directory: string | undefined) => {
    setState(prev => ({ ...prev, outputDirectory: directory }));
  };

  const resetState = () => {
    setState(initialState);
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error', duration?: number) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, message, type, duration };
    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss if duration is specified
    if (duration) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Initialize image progress list (Requirements 3.1)
  const initializeImageProgress = (files: ImageFile[]) => {
    const progressList: ImageProgress[] = files.map((file, index) => ({
      index,
      fileName: file.relativePath,
      filePath: file.path,
      status: 'pending',
      progress: 0,
    }));
    setState(prev => ({ ...prev, imageProgress: progressList }));
  };

  // Update single image progress (Requirements 3.2, 3.3, 3.4, 12.2)
  const updateImageProgress = (index: number, progress: Partial<ImageProgress>) => {
    setState(prev => {
      // Validate index
      if (index < 0 || index >= prev.imageProgress.length) {
        console.error(`Invalid image progress index: ${index}`);
        return prev;
      }

      // Validate state transition (Requirements 3.5, 12.2)
      const currentStatus = prev.imageProgress[index].status;
      const newStatus = progress.status;
      
      if (newStatus) {
        const validTransitions: Record<string, string[]> = {
          'pending': ['processing'],
          'processing': ['success', 'failed'],
          'success': [],
          'failed': [],
        };
        
        if (!validTransitions[currentStatus].includes(newStatus)) {
          console.error(`Invalid state transition: ${currentStatus} -> ${newStatus}`);
          return prev;
        }
      }

      // Update progress
      const updatedProgress = [...prev.imageProgress];
      updatedProgress[index] = {
        ...updatedProgress[index],
        ...progress,
      };

      return { ...prev, imageProgress: updatedProgress };
    });
  };

  // Toggle auto-process on drop (Requirements 8.1, 8.4)
  const setAutoProcessOnDrop = (enabled: boolean) => {
    setState(prev => ({ ...prev, autoProcessOnDrop: enabled }));
    
    // Persist to localStorage (Requirements 8.4)
    try {
      const settings = { autoProcessOnDrop: enabled };
      localStorage.setItem('batchpic-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const value: AppContextValue = {
    state,
    setInputFiles,
    setProcessingParams,
    setTemplates,
    setSelectedTemplateId,
    setIsProcessing,
    setProgress,
    setResult,
    setOutputDirectory,
    resetState,
    showNotification,
    dismissNotification,
    notifications,
    initializeImageProgress,
    updateImageProgress,
    setAutoProcessOnDrop,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the app context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
