import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MainWindow } from '../MainWindow';
import { AppProvider } from '../../context/AppContext';
import { ImageFile, ProcessingResult } from '../../main/types';

// Mock the electronAPI
const mockElectronAPI = {
  scanFiles: jest.fn(),
  processImages: jest.fn(),
  openOutputDirectory: jest.fn(),
  onProcessingProgress: jest.fn(),
  estimateFileSize: jest.fn(),
  saveTemplate: jest.fn(),
  loadTemplates: jest.fn(),
  deleteTemplate: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Helper to render with context
function renderWithContext(component: React.ReactElement) {
  return render(<AppProvider>{component}</AppProvider>);
}

describe.skip('MainWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Mock onProcessingProgress to return a cleanup function
    mockElectronAPI.onProcessingProgress.mockImplementation(() => () => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  test('renders main window with header', () => {
    renderWithContext(<MainWindow />);
    
    // Check header elements
    expect(screen.getByText('BatchPic')).toBeInTheDocument();
    expect(screen.getByText('图片交付准备工具')).toBeInTheDocument();
  });

  test('renders drop zone placeholder', () => {
    renderWithContext(<MainWindow />);
    
    // Check drop zone
    expect(screen.getByText('拖入图片，马上处理')).toBeInTheDocument();
    expect(screen.getByText('支持 JPG、PNG、WEBP 格式')).toBeInTheDocument();
  });

  test('renders export button', () => {
    renderWithContext(<MainWindow />);
    
    // Check export button
    const exportButton = screen.getByRole('button', { name: '导出图片' });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).toBeDisabled(); // Should be disabled when no files
  });

  test('export button is disabled when no files are selected', () => {
    renderWithContext(<MainWindow />);
    
    const exportButton = screen.getByRole('button', { name: '导出图片' });
    expect(exportButton).toBeDisabled();
  });
});

