/**
 * Property-based tests for ParameterPanel component
 * Feature: optimize-compression-settings
 * 
 * Property 2: 模式切换控件可见性 - Validates: Requirements 2.2, 3.1, 4.1, 6.4
 * Property 3: 质量预设选择反馈 - Validates: Requirements 3.4, 3.5
 * Property 4: 目标大小输入验证 - Validates: Requirements 4.3
 */

import * as fc from 'fast-check';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ParameterPanel } from '../ParameterPanel';
import { ProcessingParams, ImageFile } from '../../../main/types';

describe('ParameterPanel - Property-Based Tests', () => {
  const mockImageFile: ImageFile = {
    path: '/test/image.jpg',
    relativePath: 'image.jpg',
    format: 'jpg',
    size: 1024 * 100,
    dimensions: { width: 1920, height: 1080 }
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 2: Compression mode control visibility', () => {
    test('should show correct controls for all compression modes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
          (mode) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const modeLabels: Record<string, string> = {
              smart: '智能压缩 (默认)',
              quality: '按质量',
              targetSize: '按大小',
              none: '不压缩'
            };
            const modeButton = screen.getByText(modeLabels[mode]);
            fireEvent.click(modeButton);

            const hasQualityPresets = screen.queryByText('质量预设') !== null;
            const hasTargetSizeInput = screen.queryByLabelText('目标大小 (KB)') !== null;
            const metadataCheckbox = screen.queryByRole('checkbox', { name: /移除元数据/ });
            const isMetadataDisabled = metadataCheckbox?.hasAttribute('disabled') || false;

            switch (mode) {
              case 'smart':
                expect(hasQualityPresets).toBe(false);
                expect(hasTargetSizeInput).toBe(false);
                expect(isMetadataDisabled).toBe(true);
                break;
              case 'quality':
                expect(hasQualityPresets).toBe(true);
                expect(hasTargetSizeInput).toBe(false);
                expect(isMetadataDisabled).toBe(false);
                break;
              case 'targetSize':
                expect(hasQualityPresets).toBe(false);
                expect(hasTargetSizeInput).toBe(true);
                expect(isMetadataDisabled).toBe(false);
                break;
              case 'none':
                expect(hasQualityPresets).toBe(false);
                expect(hasTargetSizeInput).toBe(false);
                expect(isMetadataDisabled).toBe(false);
                break;
            }

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should never show both quality presets and target size input simultaneously', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
          (mode) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const modeLabels: Record<string, string> = {
              smart: '智能压缩 (默认)',
              quality: '按质量',
              targetSize: '按大小',
              none: '不压缩'
            };
            const modeButton = screen.getByText(modeLabels[mode]);
            fireEvent.click(modeButton);

            const hasQualityPresets = screen.queryByText('质量预设') !== null;
            const hasTargetSizeInput = screen.queryByLabelText('目标大小 (KB)') !== null;
            const bothVisible = hasQualityPresets && hasTargetSizeInput;
            
            expect(bothVisible).toBe(false);

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should disable metadata checkbox only in smart mode', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
          (mode) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const modeLabels: Record<string, string> = {
              smart: '智能压缩 (默认)',
              quality: '按质量',
              targetSize: '按大小',
              none: '不压缩'
            };
            const modeButton = screen.getByText(modeLabels[mode]);
            fireEvent.click(modeButton);

            const metadataCheckbox = screen.queryByRole('checkbox', { name: /移除元数据/ });
            const isDisabled = metadataCheckbox?.hasAttribute('disabled') || false;

            if (mode === 'smart') {
              expect(isDisabled).toBe(true);
            } else {
              expect(isDisabled).toBe(false);
            }

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Quality preset selection feedback', () => {
    test('should highlight only the selected quality preset', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(60, 70, 75, 80, 85, 90),
          (selectedPreset) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const qualityModeButton = screen.getByText('按质量');
            fireEvent.click(qualityModeButton);

            const presetButton = screen.getByText(selectedPreset.toString());
            fireEvent.click(presetButton);

            const allPresets = [60, 70, 75, 80, 85, 90];
            allPresets.forEach((preset) => {
              const button = screen.getByText(preset.toString());
              const isActive = button.classList.contains('active');
              
              if (preset === selectedPreset) {
                expect(isActive).toBe(true);
              } else {
                expect(isActive).toBe(false);
              }
            });

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain single selection across multiple preset clicks', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(60, 70, 75, 80, 85, 90), { minLength: 2, maxLength: 4 }),
          (presetSequence) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const qualityModeButton = screen.getByText('按质量');
            fireEvent.click(qualityModeButton);

            presetSequence.forEach((preset) => {
              const presetButton = screen.getByText(preset.toString());
              fireEvent.click(presetButton);
            });

            const lastSelectedPreset = presetSequence[presetSequence.length - 1];
            const allPresets = [60, 70, 75, 80, 85, 90];
            
            allPresets.forEach((preset) => {
              const button = screen.getByText(preset.toString());
              const isActive = button.classList.contains('active');
              
              if (preset === lastSelectedPreset) {
                expect(isActive).toBe(true);
              } else {
                expect(isActive).toBe(false);
              }
            });

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should have exactly one active preset at any time in quality mode', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(60, 70, 75, 80, 85, 90),
          (selectedPreset) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const qualityModeButton = screen.getByText('按质量');
            fireEvent.click(qualityModeButton);

            const presetButton = screen.getByText(selectedPreset.toString());
            fireEvent.click(presetButton);

            const allPresets = [60, 70, 75, 80, 85, 90];
            const activeCount = allPresets.filter((preset) => {
              const button = screen.getByText(preset.toString());
              return button.classList.contains('active');
            }).length;

            expect(activeCount).toBe(1);

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Target size input validation', () => {
    test('should clamp target size input to valid range [5, 10000]', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          (inputValue) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const targetSizeButton = screen.getByText('按大小');
            fireEvent.click(targetSizeButton);

            const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
            fireEvent.change(targetSizeInput, { target: { value: inputValue.toString() } });

            const actualValue = parseInt(targetSizeInput.value);

            expect(actualValue).toBeGreaterThanOrEqual(5);
            expect(actualValue).toBeLessThanOrEqual(10000);

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle boundary values correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(-1000, -1, 0, 1, 4, 5, 100, 5000, 10000, 10001, 50000, 999999),
          (inputValue) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const targetSizeButton = screen.getByText('按大小');
            fireEvent.click(targetSizeButton);

            const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
            fireEvent.change(targetSizeInput, { target: { value: inputValue.toString() } });

            const actualValue = parseInt(targetSizeInput.value);

            if (inputValue < 5) {
              expect(actualValue).toBe(5);
            } else if (inputValue > 10000) {
              expect(actualValue).toBe(10000);
            } else {
              expect(actualValue).toBe(inputValue);
            }

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should never allow values outside [5, 10000] range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100000, max: 100000 }),
          (inputValue) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const targetSizeButton = screen.getByText('按大小');
            fireEvent.click(targetSizeButton);

            const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
            fireEvent.change(targetSizeInput, { target: { value: inputValue.toString() } });

            const actualValue = parseInt(targetSizeInput.value);
            const isInRange = actualValue >= 5 && actualValue <= 10000;
            expect(isInRange).toBe(true);

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle invalid input gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', 'abc', 'NaN', 'null', 'undefined', '1.5', '-0', '+100'),
          (inputValue) => {
            cleanup();
            
            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const targetSizeButton = screen.getByText('按大小');
            fireEvent.click(targetSizeButton);

            const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
            fireEvent.change(targetSizeInput, { target: { value: inputValue } });

            const actualValue = parseInt(targetSizeInput.value);

            if (isNaN(actualValue)) {
              expect(true).toBe(true);
            } else {
              expect(actualValue).toBeGreaterThanOrEqual(5);
              expect(actualValue).toBeLessThanOrEqual(10000);
            }

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Metadata control visibility', () => {
    /**
     * **Validates: Requirements 5.1, 5.5**
     */
    test('should disable metadata checkbox in smart mode and enable in other modes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
          (mode) => {
            cleanup();

            const params: ProcessingParams = {};
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const modeLabels: Record<string, string> = {
              smart: '智能压缩 (默认)',
              quality: '按质量',
              targetSize: '按大小',
              none: '不压缩'
            };
            const modeButton = screen.getByText(modeLabels[mode]);
            fireEvent.click(modeButton);

            const metadataCheckbox = screen.queryByRole('checkbox', { name: /移除元数据/ });
            expect(metadataCheckbox).not.toBeNull();
            
            if (metadataCheckbox) {
              const isDisabled = metadataCheckbox.hasAttribute('disabled');
              if (mode === 'smart') {
                expect(isDisabled).toBe(true);
                expect(metadataCheckbox).toBeChecked();
              } else {
                expect(isDisabled).toBe(false);
              }
            }

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should force metadata removal in smart mode', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('quality', 'targetSize', 'none'),
          fc.boolean(),
          (initialMode, initialMetadataState) => {
            cleanup();

            const params: ProcessingParams = {
              compression: {
                mode: initialMode as any,
                removeMetadata: initialMetadataState
              }
            };
            
            render(
              <ParameterPanel
                params={params}
                onChange={mockOnChange}
                inputFiles={[mockImageFile]}
              />
            );

            const summary = document.querySelector('.panel-summary');
            if (summary) {
              fireEvent.click(summary);
            }

            const tabs = screen.getAllByText('优化');
            fireEvent.click(tabs[0]);

            const smartModeButton = screen.getByText('智能压缩 (默认)');
            fireEvent.click(smartModeButton);

            const metadataCheckbox = screen.getByRole('checkbox', { name: /移除元数据/ }) as HTMLInputElement;
            expect(metadataCheckbox.disabled).toBe(true);
            expect(metadataCheckbox.checked).toBe(true);

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
