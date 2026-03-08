/**
 * ParameterPanel 持久化功能集成测试
 * 
 * 验证需求 10.1-10.4：
 * - 10.1: 参数变化时保存到 localStorage
 * - 10.2: 启动时从 localStorage 加载设置
 * - 10.3: 首次使用时使用默认设置（智能压缩）
 * - 10.4: 500ms 延迟保存
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParameterPanel } from '../ParameterPanel';
import { loadSettings, saveSettings } from '../../../utils/storage';
import type { ProcessingParams, ImageFile, StoredCompressionSettings } from '../../../main/types';

// Mock storage utilities
jest.mock('../../../utils/storage');

const mockLoadSettings = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockSaveSettings = saveSettings as jest.MockedFunction<typeof saveSettings>;

describe('ParameterPanel - Persistence Integration', () => {
  const mockImageFile: ImageFile = {
    path: '/test/image.jpg',
    relativePath: 'image.jpg',
    format: 'jpg',
    size: 1024000,
    dimensions: { width: 1920, height: 1080 },
  };

  const defaultParams: ProcessingParams = {
    compression: {
      mode: 'smart',
      removeMetadata: true,
    },
  };

  let mockOnChange: jest.Mock;

  beforeEach(() => {
    mockOnChange = jest.fn();
    mockLoadSettings.mockClear();
    mockSaveSettings.mockClear();
    jest.clearAllTimers();
  });

  describe('Requirement 10.2: Load settings on mount', () => {
    it('should load saved settings from localStorage on mount', () => {
      const savedSettings: StoredCompressionSettings = {
        mode: 'quality',
        qualityPreset: 85,
        removeMetadata: false,
        version: '1.0',
      };

      mockLoadSettings.mockReturnValue(savedSettings);

      render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Verify loadSettings was called on mount
      expect(mockLoadSettings).toHaveBeenCalledTimes(1);
    });

    it('should apply loaded settings to component state', async () => {
      const savedSettings: StoredCompressionSettings = {
        mode: 'quality',
        qualityPreset: 70,
        removeMetadata: false,
        version: '1.0',
      };

      mockLoadSettings.mockReturnValue(savedSettings);

      render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Wait for settings to be applied and debounced onChange to be called
      await waitFor(
        () => {
          const calls = mockOnChange.mock.calls;
          const lastCall = calls[calls.length - 1];
          expect(lastCall[0].compression?.mode).toBe('quality');
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Requirement 10.3: Use defaults when no saved settings', () => {
    it('should use smart mode as default when no saved settings exist', async () => {
      mockLoadSettings.mockReturnValue(null);

      render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Verify loadSettings was called
      expect(mockLoadSettings).toHaveBeenCalledTimes(1);

      // Wait for debounced onChange to be called with default settings
      await waitFor(
        () => {
          const calls = mockOnChange.mock.calls;
          expect(calls.length).toBeGreaterThan(0);
          const lastCall = calls[calls.length - 1];
          expect(lastCall[0].compression?.mode).toBe('smart');
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Requirement 10.1 & 10.4: Save settings with 500ms delay', () => {
    it('should save settings after 500ms when compression mode changes', async () => {
      mockLoadSettings.mockReturnValue(null);

      const { container } = render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Expand panel
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        await userEvent.click(summary);
      }

      // Switch to compression tab
      const compressionTab = screen.getByText('优化');
      await userEvent.click(compressionTab);

      // Click quality mode button
      const qualityButton = screen.getByText('按质量');
      await userEvent.click(qualityButton);

      // Wait for 500ms debounce + some buffer
      await waitFor(
        () => {
          expect(mockSaveSettings).toHaveBeenCalled();
          const lastCall = mockSaveSettings.mock.calls[mockSaveSettings.mock.calls.length - 1];
          expect(lastCall[0].mode).toBe('quality');
        },
        { timeout: 1000 }
      );
    });

    it('should save all compression parameters correctly', async () => {
      mockLoadSettings.mockReturnValue(null);

      const { container } = render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Expand panel
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        await userEvent.click(summary);
      }

      // Switch to compression tab
      const compressionTab = screen.getByText('优化');
      await userEvent.click(compressionTab);

      // Switch to quality mode (simpler than targetSize)
      const qualityButton = screen.getByText('按质量');
      await userEvent.click(qualityButton);

      // Select quality preset 85
      const preset85Button = screen.getByText('85');
      await userEvent.click(preset85Button);

      // Wait for 500ms debounce + some buffer
      await waitFor(
        () => {
          expect(mockSaveSettings).toHaveBeenCalled();
          const lastCall = mockSaveSettings.mock.calls[mockSaveSettings.mock.calls.length - 1];
          expect(lastCall[0]).toMatchObject({
            mode: 'quality',
            qualityPreset: 85,
            removeMetadata: true,
            version: '1.0',
          });
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Round-trip persistence', () => {
    it('should correctly save and load quality mode settings', async () => {
      // First render: save settings
      mockLoadSettings.mockReturnValue(null);

      const { container, unmount } = render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Expand panel
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        await userEvent.click(summary);
      }

      // Switch to compression tab
      const compressionTab = screen.getByText('优化');
      await userEvent.click(compressionTab);

      // Switch to quality mode
      const qualityButton = screen.getByText('按质量');
      await userEvent.click(qualityButton);

      // Select quality preset 90
      const preset90Button = screen.getByText('90');
      await userEvent.click(preset90Button);

      // Wait for saveSettings to be called with quality mode (need to wait for 500ms debounce)
      await waitFor(
        () => {
          expect(mockSaveSettings).toHaveBeenCalled();
          const calls = mockSaveSettings.mock.calls;
          const lastCall = calls[calls.length - 1];
          expect(lastCall[0].mode).toBe('quality');
          expect(lastCall[0].qualityPreset).toBe(90);
        },
        { timeout: 1500 }
      );

      const savedSettings = mockSaveSettings.mock.calls[mockSaveSettings.mock.calls.length - 1][0];

      // Unmount component
      unmount();

      // Second render: load saved settings
      mockLoadSettings.mockReturnValue(savedSettings);
      mockOnChange.mockClear();

      render(
        <ParameterPanel
          params={defaultParams}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Verify loadSettings was called
      expect(mockLoadSettings).toHaveBeenCalledTimes(2); // Once in first render, once in second

      // Wait for settings to be applied (300ms debounce + buffer)
      await waitFor(
        () => {
          const calls = mockOnChange.mock.calls;
          expect(calls.length).toBeGreaterThan(0);
          const lastCall = calls[calls.length - 1];
          expect(lastCall[0].compression?.mode).toBe('quality');
          expect(lastCall[0].compression?.value).toBe(90);
        },
        { timeout: 1500 } // Increased timeout to account for 300ms debounce
      );
    });
  });
});
