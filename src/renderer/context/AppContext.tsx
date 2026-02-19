import React, { createContext, useContext, useState, ReactNode } from 'react';
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
};

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
