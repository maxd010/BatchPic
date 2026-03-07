import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateSelector } from '../TemplateSelector';
import { Template, ProcessingParams } from '../../main/types';

describe('TemplateSelector', () => {
  const mockTemplate1: Template = {
    id: 'template_1',
    name: 'Instagram 方形图',
    params: {
      resize: { mode: 'aspectRatio', value: 100, aspectRatio: '1:1' },
      compression: { mode: 'quality', value: 80 },
      format: 'jpg'
    },
    createdAt: new Date('2024-01-15')
  };

  const mockTemplate2: Template = {
    id: 'template_2',
    name: 'Twitter 横版图',
    params: {
      resize: { mode: 'aspectRatio', value: 100, aspectRatio: '16:9' },
      compression: { mode: 'quality', value: 75 },
      format: 'png'
    },
    createdAt: new Date('2024-01-16')
  };

  const mockOnSelect = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnSave.mockClear();
    mockOnDelete.mockClear();
  });

  describe('Template list display', () => {
    it('should display all templates', () => {
      render(
        <TemplateSelector
          templates={[mockTemplate1, mockTemplate2]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Instagram 方形图')).toBeInTheDocument();
      expect(screen.getByText('Twitter 横版图')).toBeInTheDocument();
    });

    it('should display template creation date', () => {
      render(
        <TemplateSelector
          templates={[mockTemplate1]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('2024/1/15')).toBeInTheDocument();
    });

    it('should show empty state when no templates exist', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('还没有保存的模板')).toBeInTheDocument();
      expect(screen.getByText(/点击"保存模板"按钮保存常用参数组合/)).toBeInTheDocument();
    });

    it('should highlight selected template', () => {
      render(
        <TemplateSelector
          templates={[mockTemplate1, mockTemplate2]}
          selectedId="template_1"
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const templateItems = screen.getAllByRole('button', { name: /方形图|横版图/ });
      const selectedItem = templateItems[0].closest('.template-item');
      expect(selectedItem).toHaveClass('selected');
    });
  });

  describe('Template selection', () => {
    it('should call onSelect when template is clicked', () => {
      render(
        <TemplateSelector
          templates={[mockTemplate1, mockTemplate2]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const selectButton = screen.getByText('Instagram 方形图');
      fireEvent.click(selectButton);

      expect(mockOnSelect).toHaveBeenCalledWith('template_1');
    });

    it('should call onSelect with correct template ID', () => {
      render(
        <TemplateSelector
          templates={[mockTemplate1, mockTemplate2]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const selectButton = screen.getByText('Twitter 横版图');
      fireEvent.click(selectButton);

      expect(mockOnSelect).toHaveBeenCalledWith('template_2');
    });
  });

  describe('Save template dialog', () => {
    it('should show save dialog when save button is clicked', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      expect(screen.getByText('保存新模板')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('例如: Instagram 方形图')).toBeInTheDocument();
    });

    it('should close dialog when cancel button is clicked', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('保存新模板')).not.toBeInTheDocument();
    });

    it('should close dialog when close button is clicked', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const closeButton = screen.getByRole('button', { name: '✕' });
      fireEvent.click(closeButton);

      expect(screen.queryByText('保存新模板')).not.toBeInTheDocument();
    });

    it('should close dialog when overlay is clicked', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const overlay = screen.getByText('保存新模板').closest('.dialog-overlay');
      fireEvent.click(overlay!);

      expect(screen.queryByText('保存新模板')).not.toBeInTheDocument();
    });
  });

  describe('Save template validation', () => {
    it('should show error when template name is empty', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const saveDialogButton = screen.getByText('保存');
      fireEvent.click(saveDialogButton);

      expect(screen.getByText('模板名称不能为空')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error when template name already exists', () => {
      render(
        <TemplateSelector
          templates={[mockTemplate1]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const input = screen.getByPlaceholderText('例如: Instagram 方形图') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Instagram 方形图' } });

      const saveDialogButton = screen.getByText('保存');
      fireEvent.click(saveDialogButton);

      expect(screen.getByText('模板名称已存在')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should trim whitespace from template name', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const input = screen.getByPlaceholderText('例如: Instagram 方形图') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '  新模板  ' } });

      const saveDialogButton = screen.getByText('保存');
      fireEvent.click(saveDialogButton);

      expect(mockOnSave).toHaveBeenCalledWith('新模板', expect.any(Object));
    });

    it('should clear error message when user types', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const saveDialogButton = screen.getByText('保存');
      fireEvent.click(saveDialogButton);

      expect(screen.getByText('模板名称不能为空')).toBeInTheDocument();

      const input = screen.getByPlaceholderText('例如: Instagram 方形图') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '新模板' } });

      expect(screen.queryByText('模板名称不能为空')).not.toBeInTheDocument();
    });
  });

  describe('Save template submission', () => {
    it('should call onSave with template name and params', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const input = screen.getByPlaceholderText('例如: Instagram 方形图') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '新模板' } });

      const saveDialogButton = screen.getByText('保存');
      fireEvent.click(saveDialogButton);

      expect(mockOnSave).toHaveBeenCalledWith('新模板', expect.any(Object));
    });

    it('should close dialog after successful save', () => {
      render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const input = screen.getByPlaceholderText('例如: Instagram 方形图') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '新模板' } });

      const saveDialogButton = screen.getByText('保存');
      fireEvent.click(saveDialogButton);

      expect(screen.queryByText('保存新模板')).not.toBeInTheDocument();
    });

    it('should reset form after successful save', () => {
      const { rerender } = render(
        <TemplateSelector
          templates={[]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const saveButton = screen.getByText('+ 保存模板');
      fireEvent.click(saveButton);

      const input = screen.getByPlaceholderText('例如: Instagram 方形图') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '新模板' } });

      const saveDialogButton = screen.getByText('保存');
      fireEvent.click(saveDialogButton);

      // Open dialog again
      fireEvent.click(screen.getByText('+ 保存模板'));

      const newInput = screen.getByPlaceholderText('例如: Instagram 方形图') as HTMLInputElement;
      expect(newInput.value).toBe('');
    });
  });

  describe('Delete template', () => {
    it('should call onDelete when delete button is clicked', () => {
      window.confirm = jest.fn(() => true);

      render(
        <TemplateSelector
          templates={[mockTemplate1]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: '✕' });
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith('template_1');
    });

    it('should show confirmation dialog before deleting', () => {
      window.confirm = jest.fn(() => true);

      render(
        <TemplateSelector
          templates={[mockTemplate1]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: '✕' });
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('确定要删除这个模板吗？');
    });

    it('should not call onDelete if user cancels confirmation', () => {
      window.confirm = jest.fn(() => false);

      render(
        <TemplateSelector
          templates={[mockTemplate1]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: '✕' });
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should delete correct template when multiple templates exist', () => {
      window.confirm = jest.fn(() => true);

      render(
        <TemplateSelector
          templates={[mockTemplate1, mockTemplate2]}
          onSelect={mockOnSelect}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: '✕' });
      fireEvent.click(deleteButtons[1]);

      expect(mockOnDelete).toHaveBeenCalledWith('template_2');
    });
  });
});
