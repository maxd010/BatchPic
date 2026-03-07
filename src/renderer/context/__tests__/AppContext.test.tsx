import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useAppContext, DEFAULT_PARAMS } from '../AppContext';
import { ImageFile, ProcessingParams } from '../../main/types';

// Wrapper component for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  test('provides initial state with default parameters', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    expect(result.current.state.inputFiles).toEqual([]);
    expect(result.current.state.processingParams).toEqual(DEFAULT_PARAMS);
    expect(result.current.state.templates).toEqual([]);
    expect(result.current.state.isProcessing).toBe(false);
    expect(result.current.state.progress).toBe(0);
  });

  test('setInputFiles updates input files', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    const mockFiles: ImageFile[] = [
      {
        path: '/test/image1.jpg',
        relativePath: 'image1.jpg',
        format: 'jpg',
        size: 1024,
        dimensions: { width: 800, height: 600 }
      }
    ];

    act(() => {
      result.current.setInputFiles(mockFiles);
    });

    expect(result.current.state.inputFiles).toEqual(mockFiles);
  });

  test('setProcessingParams updates processing parameters', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    const newParams: ProcessingParams = {
      resize: {
        mode: 'width',
        value: 1920
      },
      compression: {
        mode: 'quality',
        value: 80
      },
      format: 'jpg'
    };

    act(() => {
      result.current.setProcessingParams(newParams);
    });

    expect(result.current.state.processingParams).toEqual(newParams);
  });

  test('setIsProcessing updates processing state', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.setIsProcessing(true);
    });

    expect(result.current.state.isProcessing).toBe(true);

    act(() => {
      result.current.setIsProcessing(false);
    });

    expect(result.current.state.isProcessing).toBe(false);
  });

  test('setProgress updates progress value', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.setProgress(50);
    });

    expect(result.current.state.progress).toBe(50);
  });

  test('resetState resets to initial state', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    // Modify state
    act(() => {
      result.current.setInputFiles([
        {
          path: '/test/image1.jpg',
          relativePath: 'image1.jpg',
          format: 'jpg',
          size: 1024,
          dimensions: { width: 800, height: 600 }
        }
      ]);
      result.current.setIsProcessing(true);
      result.current.setProgress(75);
    });

    // Reset
    act(() => {
      result.current.resetState();
    });

    // Verify reset
    expect(result.current.state.inputFiles).toEqual([]);
    expect(result.current.state.isProcessing).toBe(false);
    expect(result.current.state.progress).toBe(0);
    expect(result.current.state.processingParams).toEqual(DEFAULT_PARAMS);
  });

  test('throws error when useAppContext is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useAppContext());
    }).toThrow('useAppContext must be used within an AppProvider');

    console.error = originalError;
  });

  test('showNotification adds notification to list', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.showNotification('Test message', 'success');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Test message');
    expect(result.current.notifications[0].type).toBe('success');
  });

  test('dismissNotification removes notification from list', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    let notificationId: string = '';

    act(() => {
      result.current.showNotification('Test message', 'info');
    });

    expect(result.current.notifications).toHaveLength(1);
    notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.dismissNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  test('showNotification auto-dismisses after specified duration', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.showNotification('Test message', 'warning', 100);
    });

    expect(result.current.notifications).toHaveLength(1);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(result.current.notifications).toHaveLength(0);

    jest.useRealTimers();
  });
});
