import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParameterPanel } from '../ParameterPanel';
import { ProcessingParams, ImageFile } from '../../../main/types';

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

  /**
   * Validates: Requirements 1.1, 1.2
   * 测试标签页标题显示"优化"而非"压缩"
   */
  describe('Tab titles', () => {
    it('should display "优化" as compression tab title', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板以查看标签页
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 查找"优化"标签页
      const optimizationTab = screen.getByText('优化');
      expect(optimizationTab).toBeInTheDocument();
      
      // 确保不存在"压缩"标签页
      expect(screen.queryByText('压缩')).not.toBeInTheDocument();
    });
  });

  /**
   * Validates: Requirements 2.1, 2.2, 2.8, 6.3
   * 测试默认状态渲染（智能模式、质量预设 80）
   */
  describe('Default state', () => {
    it('should render with smart compression mode as default', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 验证智能压缩模式按钮被选中
      const smartButton = screen.getByText('智能压缩 (默认)');
      expect(smartButton).toHaveClass('active');
    });

    it('should have quality preset 80 as default', () => {
      const params: ProcessingParams = {
        compression: { mode: 'quality', value: 80 }
      };
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按质量模式
      const qualityButton = screen.getByText('按质量');
      fireEvent.click(qualityButton);

      // 验证质量预设 80 被选中
      const preset80 = screen.getByText('80');
      expect(preset80).toHaveClass('active');
    });
  });

  /**
   * Validates: Requirements 2.2, 3.1, 4.1, 6.4
   * 测试模式切换后控件显示/隐藏
   */
  describe('Compression mode switching', () => {
    it('should hide quality controls in smart mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 验证智能模式下没有质量预设控件
      expect(screen.queryByText('质量预设')).not.toBeInTheDocument();
    });

    it('should show quality presets in quality mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按质量模式
      const qualityButton = screen.getByText('按质量');
      fireEvent.click(qualityButton);

      // 验证质量预设控件显示
      expect(screen.getByText('质量预设')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('90')).toBeInTheDocument();
    });

    it('should show target size input in targetSize mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按大小模式
      const targetSizeButton = screen.getByText('按大小');
      fireEvent.click(targetSizeButton);

      // 验证目标大小输入框显示
      expect(screen.getByLabelText('目标大小 (KB)')).toBeInTheDocument();
    });

    it('should hide all controls in none mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到不压缩模式
      const noneButton = screen.getByText('不压缩');
      fireEvent.click(noneButton);

      // 验证没有质量预设和目标大小控件
      expect(screen.queryByText('质量预设')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('目标大小 (KB)')).not.toBeInTheDocument();
    });
  });

  /**
   * Validates: Requirements 3.4
   * 测试质量预设按钮点击和高亮
   */
  describe('Quality preset buttons', () => {
    it('should highlight clicked preset button', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按质量模式
      const qualityButton = screen.getByText('按质量');
      fireEvent.click(qualityButton);

      // 点击质量预设 70
      const preset70 = screen.getByText('70');
      fireEvent.click(preset70);

      // 验证 70 被高亮
      expect(preset70).toHaveClass('active');
    });

    it('should only highlight one preset at a time', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按质量模式
      const qualityButton = screen.getByText('按质量');
      fireEvent.click(qualityButton);

      // 点击质量预设 70
      const preset70 = screen.getByText('70');
      fireEvent.click(preset70);

      // 点击质量预设 85
      const preset85 = screen.getByText('85');
      fireEvent.click(preset85);

      // 验证只有 85 被高亮
      expect(preset85).toHaveClass('active');
      expect(preset70).not.toHaveClass('active');
    });

    it('should call onChange when preset is clicked', async () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按质量模式
      const qualityButton = screen.getByText('按质量');
      fireEvent.click(qualityButton);

      mockOnChange.mockClear();

      // 点击质量预设 90
      const preset90 = screen.getByText('90');
      fireEvent.click(preset90);

      // 等待防抖
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });

      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.compression?.mode).toBe('quality');
      expect(callArgs.compression?.value).toBe(90);
    });
  });

  /**
   * Validates: Requirements 5.1, 5.5
   * 测试元数据复选框在不同模式下的状态
   */
  describe('Metadata checkbox', () => {
    it('should be disabled in smart mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 验证元数据复选框被禁用
      const metadataCheckbox = screen.getByRole('checkbox', { name: /移除元数据/ });
      expect(metadataCheckbox).toBeDisabled();
      expect(metadataCheckbox).toBeChecked();
    });

    it('should be enabled in quality mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按质量模式
      const qualityButton = screen.getByText('按质量');
      fireEvent.click(qualityButton);

      // 验证元数据复选框可用
      const metadataCheckbox = screen.getByRole('checkbox', { name: /移除元数据/ });
      expect(metadataCheckbox).not.toBeDisabled();
    });

    it('should be enabled in targetSize mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按大小模式
      const targetSizeButton = screen.getByText('按大小');
      fireEvent.click(targetSizeButton);

      // 验证元数据复选框可用
      const metadataCheckbox = screen.getByRole('checkbox', { name: /移除元数据/ });
      expect(metadataCheckbox).not.toBeDisabled();
    });

    it('should be enabled in none mode', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到不压缩模式
      const noneButton = screen.getByText('不压缩');
      fireEvent.click(noneButton);

      // 验证元数据复选框可用
      const metadataCheckbox = screen.getByRole('checkbox', { name: /移除元数据/ });
      expect(metadataCheckbox).not.toBeDisabled();
    });

    it('should call onChange when checkbox is toggled', async () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按质量模式
      const qualityButton = screen.getByText('按质量');
      fireEvent.click(qualityButton);

      mockOnChange.mockClear();

      // 取消勾选元数据复选框
      const metadataCheckbox = screen.getByRole('checkbox', { name: /移除元数据/ });
      fireEvent.click(metadataCheckbox);

      // 等待防抖
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });

      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.compression?.removeMetadata).toBe(false);
    });
  });

  /**
   * Validates: Requirements 4.3
   * 测试目标大小输入验证(边界值 5, 10000)
   */
  describe('Target size input validation', () => {
    it('should enforce minimum value of 5', async () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按大小模式
      const targetSizeButton = screen.getByText('按大小');
      fireEvent.click(targetSizeButton);

      // 输入小于最小值的数字
      const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
      fireEvent.change(targetSizeInput, { target: { value: '3' } });

      // 验证值被限制为最小值
      expect(parseInt(targetSizeInput.value)).toBeGreaterThanOrEqual(5);
    });

    it('should enforce maximum value of 10000', async () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按大小模式
      const targetSizeButton = screen.getByText('按大小');
      fireEvent.click(targetSizeButton);

      // 输入大于最大值的数字
      const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
      fireEvent.change(targetSizeInput, { target: { value: '15000' } });

      // 验证值被限制为最大值
      expect(parseInt(targetSizeInput.value)).toBeLessThanOrEqual(10000);
    });

    it('should accept valid values within range', async () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按大小模式
      const targetSizeButton = screen.getByText('按大小');
      fireEvent.click(targetSizeButton);

      mockOnChange.mockClear();

      // 输入有效值
      const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
      fireEvent.change(targetSizeInput, { target: { value: '500' } });

      // 等待防抖
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });

      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.compression?.mode).toBe('targetSize');
      expect(callArgs.compression?.value).toBe(500);
    });
  });

  /**
   * Validates: Requirements 8.2
   * 测试防抖机制(300ms)
   */
  describe('Debounce mechanism', () => {
    it('should debounce onChange calls by 300ms', async () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 切换到按大小模式
      const targetSizeButton = screen.getByText('按大小');
      fireEvent.click(targetSizeButton);

      mockOnChange.mockClear();

      // 快速连续输入多次
      const targetSizeInput = screen.getByLabelText('目标大小 (KB)') as HTMLInputElement;
      fireEvent.change(targetSizeInput, { target: { value: '100' } });
      fireEvent.change(targetSizeInput, { target: { value: '200' } });
      fireEvent.change(targetSizeInput, { target: { value: '300' } });

      // 在 300ms 之前不应该调用 onChange
      expect(mockOnChange).not.toHaveBeenCalled();

      // 等待防抖时间
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 500 });

      // 应该只调用一次，使用最后的值
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.compression?.value).toBe(300);
    });
  });

  /**
   * 测试文件大小信息显示
   */
  describe('File size information', () => {
    it('should display original and estimated size', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[mockImageFile]}
          estimatedSize={50 * 1024}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 验证文件大小信息显示
      expect(screen.getByText(/原始:/)).toBeInTheDocument();
      expect(screen.getByText(/100\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/预估:/)).toBeInTheDocument();
      expect(screen.getByText(/50\.0 KB/)).toBeInTheDocument();
    });

    it('should not display size info without input files', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <ParameterPanel
          params={params}
          onChange={mockOnChange}
          inputFiles={[]}
        />
      );

      // 展开面板
      const summary = container.querySelector('.panel-summary');
      if (summary) {
        fireEvent.click(summary);
      }

      // 切换到优化标签页
      const optimizationTab = screen.getByText('优化');
      fireEvent.click(optimizationTab);

      // 验证没有文件大小信息
      expect(screen.queryByText(/原始:/)).not.toBeInTheDocument();
    });
  });
});
