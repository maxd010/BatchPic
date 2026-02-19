import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParameterPanel } from './ParameterPanel';
import { ProcessingParams, ImageFile } from '../../main/types';

describe('ParameterPanel', () => {
  const mockImageFile: ImageFile = {
    path: '/test/image.jpg',
    relativePath: 'image.jpg',
    format: 'jpg',
    size: 1024 * 100, // 100 KB
    dimensions: { width: 1920, height: 1080 }
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Resize options', () => {
    it('should render resize mode selector', () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      const resizeSelect = screen.getByDisplayValue('保持原始尺寸');
      expect(resizeSelect).toBeInTheDocument();
    });

    it('should show resize value input when width mode is selected', () => {
      const params: ProcessingParams = {
        resize: { mode: 'width', value: 800 }
      };
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      const resizeSelect = screen.getByDisplayValue('按宽度调整');
      expect(resizeSelect).toBeInTheDocument();
      
      const valueInput = screen.getByDisplayValue('800');
      expect(valueInput).toBeInTheDocument();
    });

    it('should show aspect ratio selector when aspectRatio mode is selected', () => {
      const params: ProcessingParams = {
        resize: { mode: 'aspectRatio', value: 100, aspectRatio: '1:1' }
      };
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      const resizeSelect = screen.getByDisplayValue('固定宽高比');
      expect(resizeSelect).toBeInTheDocument();
      
      const aspectRatioSelect = screen.getByDisplayValue('1:1 (正方形)');
      expect(aspectRatioSelect).toBeInTheDocument();
    });

    it('should call onChange when resize mode changes', async () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      mockOnChange.mockClear(); // Clear initial call from render

      const resizeSelect = screen.getByDisplayValue('保持原始尺寸') as HTMLSelectElement;
      fireEvent.change(resizeSelect, { target: { value: 'width' } });

      // Wait for debounce (300ms default)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });
      
      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.resize?.mode).toBe('width');
    });
  });

  describe('Compression options', () => {
    it('should render compression mode selector', () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      const compressionSelect = screen.getByDisplayValue('按质量压缩');
      expect(compressionSelect).toBeInTheDocument();
    });

    it('should show quality slider when quality mode is selected', () => {
      const params: ProcessingParams = {
        compression: { mode: 'quality', value: 70 }
      };
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      const qualitySlider = screen.getByDisplayValue('70');
      expect(qualitySlider).toBeInTheDocument();
      expect(qualitySlider).toHaveAttribute('type', 'range');
    });

    it('should show target size input when targetSize mode is selected', () => {
      const params: ProcessingParams = {
        compression: { mode: 'targetSize', value: 50 }
      };
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      const targetSizeInput = screen.getByDisplayValue('50');
      expect(targetSizeInput).toBeInTheDocument();
    });

    it('should display file size information', () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
          estimatedSize={50 * 1024}
        />
      );

      expect(screen.getByText(/原始大小:/)).toBeInTheDocument();
      expect(screen.getByText(/100\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/预估大小:/)).toBeInTheDocument();
      expect(screen.getByText(/50\.0 KB/)).toBeInTheDocument();
    });

    it('should call onChange when quality slider changes', async () => {
      const params: ProcessingParams = {
        compression: { mode: 'quality', value: 70 }
      };
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      mockOnChange.mockClear(); // Clear initial call from render

      const qualitySlider = screen.getByDisplayValue('70') as HTMLInputElement;
      fireEvent.change(qualitySlider, { target: { value: '50' } });

      // Wait for debounce (300ms default)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });
      
      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.compression?.value).toBe(50);
    });
  });

  describe('Format options', () => {
    it('should render format selector', () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      const formatSelect = screen.getByDisplayValue('保持原始格式');
      expect(formatSelect).toBeInTheDocument();
    });

    it('should call onChange when format changes', async () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      mockOnChange.mockClear(); // Clear initial call from render

      const formatSelect = screen.getByDisplayValue('保持原始格式') as HTMLSelectElement;
      fireEvent.change(formatSelect, { target: { value: 'png' } });

      // Wait for debounce (300ms default)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });
      
      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.format).toBe('png');
    });
  });

  describe('Parameter combinations', () => {
    it('should handle multiple parameter changes', async () => {
      const params: ProcessingParams = {};
      const { rerender } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // Change resize mode
      const resizeSelect = screen.getByDisplayValue('保持原始尺寸') as HTMLSelectElement;
      fireEvent.change(resizeSelect, { target: { value: 'width' } });

      // Change compression mode
      const compressionSelect = screen.getByDisplayValue('按质量压缩') as HTMLSelectElement;
      fireEvent.change(compressionSelect, { target: { value: 'targetSize' } });

      // Change format
      const formatSelect = screen.getByDisplayValue('保持原始格式') as HTMLSelectElement;
      fireEvent.change(formatSelect, { target: { value: 'webp' } });

      // Wait for debounce
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });

  describe('Empty state', () => {
    it('should render without input files', () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[]}
        />
      );

      expect(screen.getByDisplayValue('保持原始尺寸')).toBeInTheDocument();
    });

    it('should not display file size info without input files', () => {
      const params: ProcessingParams = {};
      render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[]}
        />
      );

      expect(screen.queryByText(/原始大小:/)).not.toBeInTheDocument();
    });
  });
});
