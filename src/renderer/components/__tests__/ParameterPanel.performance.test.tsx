/**
 * Performance tests for ParameterPanel component
 * 
 * Validates:
 * - Requirement 8.1: UI mode switching < 100ms
 * - Requirement 8.2: Parameter debounce = 300ms
 * - Requirement 10.4: Persistence delay = 500ms
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParameterPanel } from '../ParameterPanel';
import { ProcessingParams, ImageFile } from '../../../main/types';
import * as storage from '../../../utils/storage';

// Mock storage functions
jest.mock('../../../utils/storage');

describe('ParameterPanel Performance Tests', () => {
  const mockOnChange = jest.fn();
  const mockInputFiles: ImageFile[] = [
    {
      path: '/test/image.jpg',
      relativePath: 'image.jpg',
      name: 'image.jpg',
      size: 1024 * 1024, // 1MB
      format: 'jpg',
      dimensions: { width: 1920, height: 1080 },
    },
  ];

  const defaultParams: ProcessingParams = {
    compression: {
      mode: 'smart',
      removeMetadata: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (storage.loadSettings as jest.Mock).mockReturnValue(null);
    (storage.saveSettings as jest.Mock).mockImplementation(() => {});
  });

  /**
   * Requirement 8.1: UI mode switching response time < 100ms
   */
  describe('UI Mode Switching Performance', () => {
    test('compression mode switch completes within 100ms', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel first
      const summary = screen.getByText(/格式:/);
      await user.click(summary);

      // Switch to compression tab
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      // Measure time to switch from smart to quality mode
      const startTime = performance.now();
      
      const qualityButton = screen.getByText('按质量');
      await user.click(qualityButton);

      // Wait for UI to update (quality presets should appear)
      await waitFor(() => {
        expect(screen.getByText('60')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const switchTime = endTime - startTime;

      console.log(`[Performance] Mode switch time: ${switchTime.toFixed(2)}ms`);
      
      // Requirement 8.1: Should complete within 100ms
      expect(switchTime).toBeLessThan(100);
    });

    test('tab switching completes within 100ms', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel
      const summary = screen.getByText(/格式:/);
      await user.click(summary);

      // Measure time to switch tabs
      const startTime = performance.now();
      
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      // Wait for compression tab content to appear
      await waitFor(() => {
        expect(screen.getByText('智能压缩 (默认)')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const switchTime = endTime - startTime;

      console.log(`[Performance] Tab switch time: ${switchTime.toFixed(2)}ms`);
      
      // Requirement 8.1: Should complete within 100ms
      expect(switchTime).toBeLessThan(100);
    });

    test('quality preset selection completes within 100ms', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterPanel
          params={{
            compression: {
              mode: 'quality',
              value: 80,
              removeMetadata: true,
            },
          }}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel and go to compression tab
      const summary = screen.getByText(/格式:/);
      await user.click(summary);
      
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      // Wait for quality presets to appear
      await waitFor(() => {
        expect(screen.getByText('60')).toBeInTheDocument();
      });

      // Measure time to select a preset
      const startTime = performance.now();
      
      const preset70 = screen.getByText('70');
      await user.click(preset70);

      // Wait for button to be highlighted
      await waitFor(() => {
        expect(preset70).toHaveClass('active');
      });

      const endTime = performance.now();
      const selectionTime = endTime - startTime;

      console.log(`[Performance] Preset selection time: ${selectionTime.toFixed(2)}ms`);
      
      // Requirement 8.1: Should complete within 100ms
      expect(selectionTime).toBeLessThan(100);
    });
  });

  /**
   * Requirement 8.2: Parameter debounce delay = 300ms
   */
  describe('Parameter Debounce Timing', () => {
    test('onChange callback fires after 300ms debounce', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      render(
        <ParameterPanel
          params={{
            compression: {
              mode: 'quality',
              value: 80,
              removeMetadata: true,
            },
          }}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel and go to compression tab
      const summary = screen.getByText(/格式:/);
      await user.click(summary);
      
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      mockOnChange.mockClear();

      // Change quality preset
      const preset70 = screen.getByText('70');
      await user.click(preset70);

      // Should not fire immediately
      expect(mockOnChange).not.toHaveBeenCalled();

      // Should not fire before 300ms
      jest.advanceTimersByTime(200);
      expect(mockOnChange).not.toHaveBeenCalled();

      // Should fire after 300ms
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
      });

      // Verify the debounced value
      const calledParams = mockOnChange.mock.calls[0][0];
      expect(calledParams.compression?.value).toBe(70);

      jest.useRealTimers();
    });

    test('rapid changes only trigger one onChange after 300ms', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      render(
        <ParameterPanel
          params={{
            compression: {
              mode: 'quality',
              value: 80,
              removeMetadata: true,
            },
          }}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel and go to compression tab
      const summary = screen.getByText(/格式:/);
      await user.click(summary);
      
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      mockOnChange.mockClear();

      // Make rapid changes
      await user.click(screen.getByText('70'));
      jest.advanceTimersByTime(100);
      
      await user.click(screen.getByText('75'));
      jest.advanceTimersByTime(100);
      
      await user.click(screen.getByText('85'));

      // Should not fire yet
      expect(mockOnChange).not.toHaveBeenCalled();

      // Wait for debounce (300ms from last change)
      jest.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
      });

      // Should have the last value (85)
      const calledParams = mockOnChange.mock.calls[0][0];
      expect(calledParams.compression?.value).toBe(85);

      jest.useRealTimers();
    });
  });

  /**
   * Requirement 10.4: Persistence delay = 500ms
   */
  describe('Persistence Timing', () => {
    test('settings save after 500ms debounce', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      render(
        <ParameterPanel
          params={{
            compression: {
              mode: 'quality',
              value: 80,
              removeMetadata: true,
            },
          }}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel and go to compression tab
      const summary = screen.getByText(/格式:/);
      await user.click(summary);
      
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      (storage.saveSettings as jest.Mock).mockClear();

      // Change quality preset
      const preset70 = screen.getByText('70');
      await user.click(preset70);

      // Should not save immediately
      expect(storage.saveSettings).not.toHaveBeenCalled();

      // Should not save before 500ms
      jest.advanceTimersByTime(400);
      expect(storage.saveSettings).not.toHaveBeenCalled();

      // Should save after 500ms
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(storage.saveSettings).toHaveBeenCalledTimes(1);
      });

      // Verify saved settings
      const savedSettings = (storage.saveSettings as jest.Mock).mock.calls[0][0];
      expect(savedSettings.mode).toBe('quality');
      expect(savedSettings.qualityPreset).toBe(70);

      jest.useRealTimers();
    });

    test('rapid changes only trigger one save after 500ms', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      render(
        <ParameterPanel
          params={{
            compression: {
              mode: 'quality',
              value: 80,
              removeMetadata: true,
            },
          }}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel and go to compression tab
      const summary = screen.getByText(/格式:/);
      await user.click(summary);
      
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      (storage.saveSettings as jest.Mock).mockClear();

      // Make rapid changes
      await user.click(screen.getByText('70'));
      jest.advanceTimersByTime(200);
      
      await user.click(screen.getByText('75'));
      jest.advanceTimersByTime(200);
      
      await user.click(screen.getByText('85'));

      // Should not save yet
      expect(storage.saveSettings).not.toHaveBeenCalled();

      // Wait for persistence debounce (500ms from last change)
      jest.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(storage.saveSettings).toHaveBeenCalledTimes(1);
      });

      // Should have the last value (85)
      const savedSettings = (storage.saveSettings as jest.Mock).mock.calls[0][0];
      expect(savedSettings.qualityPreset).toBe(85);

      jest.useRealTimers();
    });
  });

  /**
   * Visual feedback performance (Requirement 8.4)
   */
  describe('Visual Feedback Performance', () => {
    test('hover states apply without layout shift', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterPanel
          params={{
            compression: {
              mode: 'quality',
              value: 80,
              removeMetadata: true,
            },
          }}
          onChange={mockOnChange}
          inputFiles={mockInputFiles}
        />
      );

      // Expand panel and go to compression tab
      const summary = screen.getByText(/格式:/);
      await user.click(summary);
      
      const compressionTab = screen.getByText('优化');
      await user.click(compressionTab);

      // Get a preset button
      const preset70 = screen.getByText('70');
      const initialRect = preset70.getBoundingClientRect();

      // Hover over button
      await user.hover(preset70);

      // Check that position hasn't changed (no layout shift)
      const hoverRect = preset70.getBoundingClientRect();
      expect(hoverRect.top).toBe(initialRect.top);
      expect(hoverRect.left).toBe(initialRect.left);
      expect(hoverRect.width).toBe(initialRect.width);
      expect(hoverRect.height).toBe(initialRect.height);
    });
  });
});
