import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropZone } from '../DropZone';
import { INPUT_FORMATS } from '../../../main/formats';

describe('DropZone', () => {
  test('renders empty state when isEmpty is true', () => {
    const mockOnFilesDropped = jest.fn();
    
    render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={true} 
      />
    );

    // Check for empty state text (Requirement 7.3)
    expect(screen.getByText('拖入图片，马上处理')).toBeInTheDocument();
    expect(screen.getByText('或点击此处选择文件')).toBeInTheDocument();
    // One tag per readable format. Driven off the registry so adding a format
    // cannot leave this list behind.
    for (const format of INPUT_FORMATS) {
      expect(screen.getByText(format.toUpperCase())).toBeInTheDocument();
    }
  });

  test('renders loaded state when isEmpty is false', () => {
    const mockOnFilesDropped = jest.fn();
    
    render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={false}
        fileCount={5}
      />
    );

    // Check for loaded state text
    expect(screen.getByText('已选择 5 张图片')).toBeInTheDocument();
    expect(screen.getByText('点击或拖入更多文件以添加到批次')).toBeInTheDocument();
  });

  test('shows dragging state on drag enter', () => {
    const mockOnFilesDropped = jest.fn();
    
    const { container } = render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={true} 
      />
    );

    const dropZone = container.querySelector('.drop-zone');
    expect(dropZone).not.toHaveClass('dragging');

    // Simulate drag enter
    fireEvent.dragEnter(dropZone!);
    expect(dropZone).toHaveClass('dragging');
  });

  test('removes dragging state on drag leave', () => {
    const mockOnFilesDropped = jest.fn();
    
    const { container } = render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={true} 
      />
    );

    const dropZone = container.querySelector('.drop-zone');

    // Simulate drag enter then drag leave
    fireEvent.dragEnter(dropZone!);
    expect(dropZone).toHaveClass('dragging');

    fireEvent.dragLeave(dropZone!, { currentTarget: dropZone, target: dropZone });
    expect(dropZone).not.toHaveClass('dragging');
  });

  test('calls onFilesDropped with file paths on drop', () => {
    const mockOnFilesDropped = jest.fn();
    
    const { container } = render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={true} 
      />
    );

    const dropZone = container.querySelector('.drop-zone');

    // Create mock files with path property (Electron-specific)
    const mockFiles = [
      { path: '/test/image1.jpg', name: 'image1.jpg' },
      { path: '/test/image2.png', name: 'image2.png' }
    ];

    // Simulate drop event
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: mockFiles
      }
    });

    fireEvent(dropZone!, dropEvent);

    // Verify callback was called with file paths
    expect(mockOnFilesDropped).toHaveBeenCalledWith(['/test/image1.jpg', '/test/image2.png']);
  });

  test('removes dragging state after drop', () => {
    const mockOnFilesDropped = jest.fn();
    
    const { container } = render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={true} 
      />
    );

    const dropZone = container.querySelector('.drop-zone');

    // Simulate drag enter
    fireEvent.dragEnter(dropZone!);
    expect(dropZone).toHaveClass('dragging');

    // Simulate drop
    const mockFiles = [{ path: '/test/image1.jpg', name: 'image1.jpg' }];
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: mockFiles }
    });

    fireEvent(dropZone!, dropEvent);

    // Dragging state should be removed
    expect(dropZone).not.toHaveClass('dragging');
  });

  test('applies correct CSS classes based on state', () => {
    const mockOnFilesDropped = jest.fn();
    
    const { container, rerender } = render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={true} 
      />
    );

    const dropZone = container.querySelector('.drop-zone');
    
    // Empty state
    expect(dropZone).toHaveClass('empty');
    expect(dropZone).not.toHaveClass('has-files');

    // Loaded state
    rerender(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={false}
        fileCount={3}
      />
    );

    expect(dropZone).toHaveClass('has-files');
    expect(dropZone).not.toHaveClass('empty');
  });

  test('does not call onFilesDropped when no files are dropped', () => {
    const mockOnFilesDropped = jest.fn();
    
    const { container } = render(
      <DropZone 
        onFilesDropped={mockOnFilesDropped} 
        isEmpty={true} 
      />
    );

    const dropZone = container.querySelector('.drop-zone');

    // Simulate drop with no files
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [] }
    });

    fireEvent(dropZone!, dropEvent);

    // Callback should not be called
    expect(mockOnFilesDropped).not.toHaveBeenCalled();
  });
});
