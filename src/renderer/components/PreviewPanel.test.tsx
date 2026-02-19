import { render, screen } from '@testing-library/react';
import { PreviewPanel } from './PreviewPanel';
import { ImageFile, ProcessingParams } from '../../main/types';

describe('PreviewPanel', () => {
  const mockImageFile: ImageFile = {
    path: '/test/image.jpg',
    relativePath: 'test/image.jpg',
    format: 'jpg',
    size: 1024000,
    dimensions: { width: 1920, height: 1080 },
  };

  describe('empty state', () => {
    it('should display placeholder when no image is provided', () => {
      const params: ProcessingParams = {};
      render(<PreviewPanel params={params} />);
      
      expect(screen.getByText('拖入图片以查看预览')).toBeInTheDocument();
    });
  });

  describe('with image', () => {
    it('should display original dimensions', () => {
      const params: ProcessingParams = {};
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      const values = container.querySelectorAll('.value');
      expect(values[0]).toHaveTextContent('1920');
      expect(values[1]).toHaveTextContent('1080');
    });

    it('should display original aspect ratio', () => {
      const params: ProcessingParams = {};
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // 1920/1080 = 1.78
      const values = container.querySelectorAll('.value');
      expect(values[2]).toHaveTextContent('1.78');
    });

    it('should display file name in preview', () => {
      const params: ProcessingParams = {};
      render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      expect(screen.getByText('test/image.jpg')).toBeInTheDocument();
    });
  });

  describe('resize by width', () => {
    it('should calculate height maintaining aspect ratio', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'width',
          value: 960,
        },
      };
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // 960 width, height should be 540 (maintaining 16:9 ratio)
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('960');
      expect(values[4]).toHaveTextContent('540');
    });
  });

  describe('resize by height', () => {
    it('should calculate width maintaining aspect ratio', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'height',
          value: 540,
        },
      };
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // 540 height, width should be 960 (maintaining 16:9 ratio)
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('960');
      expect(values[4]).toHaveTextContent('540');
    });
  });

  describe('resize by long edge', () => {
    it('should resize based on longest dimension', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'longEdge',
          value: 960,
        },
      };
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // Long edge is 1920, scale to 960 (0.5x)
      // 1920 * 0.5 = 960, 1080 * 0.5 = 540
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('960');
      expect(values[4]).toHaveTextContent('540');
    });
  });

  describe('resize by short edge', () => {
    it('should resize based on shortest dimension', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'shortEdge',
          value: 540,
        },
      };
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // Short edge is 1080, scale to 540 (0.5x)
      // 1920 * 0.5 = 960, 1080 * 0.5 = 540
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('960');
      expect(values[4]).toHaveTextContent('540');
    });
  });

  describe('aspect ratio cropping', () => {
    it('should crop to 1:1 aspect ratio', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'aspectRatio',
          value: 0,
          aspectRatio: '1:1',
        },
      };
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // Image is 1920x1080, for 1:1 ratio, crop to 1080x1080
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('1080');
      expect(values[4]).toHaveTextContent('1080');
    });

    it('should crop to 4:5 aspect ratio', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'aspectRatio',
          value: 0,
          aspectRatio: '4:5',
        },
      };
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // Image is 1920x1080, for 4:5 ratio (0.8), crop width to 864
      // 1080 * 0.8 = 864
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('864');
      expect(values[4]).toHaveTextContent('1080');
    });

    it('should crop to 16:9 aspect ratio', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'aspectRatio',
          value: 0,
          aspectRatio: '16:9',
        },
      };
      const { container } = render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      // Image is already 16:9, should remain unchanged
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('1920');
      expect(values[4]).toHaveTextContent('1080');
    });
  });

  describe('real-time updates', () => {
    it('should update dimensions when parameters change', () => {
      const { rerender, container } = render(
        <PreviewPanel 
          originalImage={mockImageFile} 
          params={{}}
        />
      );
      
      // Initially should show original dimensions
      let values = container.querySelectorAll('.value');
      expect(values[0]).toHaveTextContent('1920');
      
      // Update with resize parameter
      rerender(
        <PreviewPanel 
          originalImage={mockImageFile} 
          params={{
            resize: {
              mode: 'width',
              value: 960,
            },
          }}
        />
      );
      
      // Should now show resized dimensions
      values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('960');
      expect(values[4]).toHaveTextContent('540');
    });
  });

  describe('changes summary', () => {
    it('should display changes summary when dimensions change', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'width',
          value: 960,
        },
      };
      render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      expect(screen.getByText(/尺寸变化/)).toBeInTheDocument();
      expect(screen.getByText(/1920×1080 → 960×540/)).toBeInTheDocument();
    });

    it('should display aspect ratio change when cropping', () => {
      const params: ProcessingParams = {
        resize: {
          mode: 'aspectRatio',
          value: 0,
          aspectRatio: '1:1',
        },
      };
      render(<PreviewPanel originalImage={mockImageFile} params={params} />);
      
      expect(screen.getByText(/宽高比变化/)).toBeInTheDocument();
    });

    it('should not display changes summary when no changes', () => {
      const params: ProcessingParams = {};
      const { container } = render(
        <PreviewPanel originalImage={mockImageFile} params={params} />
      );
      
      const changesSummary = container.querySelector('.changes-summary');
      expect(changesSummary).not.toBeInTheDocument();
    });
  });

  describe('portrait image', () => {
    it('should handle portrait orientation correctly', () => {
      const portraitImage: ImageFile = {
        path: '/test/portrait.jpg',
        relativePath: 'test/portrait.jpg',
        format: 'jpg',
        size: 512000,
        dimensions: { width: 1080, height: 1920 },
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'shortEdge',
          value: 540,
        },
      };
      const { container } = render(<PreviewPanel originalImage={portraitImage} params={params} />);
      
      // Short edge is 1080, scale to 540 (0.5x)
      // 1080 * 0.5 = 540, 1920 * 0.5 = 960
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('540');
      expect(values[4]).toHaveTextContent('960');
    });
  });

  describe('square image', () => {
    it('should handle square images correctly', () => {
      const squareImage: ImageFile = {
        path: '/test/square.jpg',
        relativePath: 'test/square.jpg',
        format: 'jpg',
        size: 256000,
        dimensions: { width: 1000, height: 1000 },
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'width',
          value: 500,
        },
      };
      const { container } = render(<PreviewPanel originalImage={squareImage} params={params} />);
      
      // Both dimensions should be 500
      const values = container.querySelectorAll('.value');
      expect(values[3]).toHaveTextContent('500');
      expect(values[4]).toHaveTextContent('500');
    });
  });
});
