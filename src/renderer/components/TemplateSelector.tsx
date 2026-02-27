import { useState } from 'react';
import { Template, ProcessingParams } from '../../main/types';
import { BookmarkIcon, PlusIcon, TrashIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  templates: Template[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onSave: (name: string, params: ProcessingParams) => void;
  onDelete: (id: string) => void;
}

/**
 * TemplateSelector - Component for managing processing templates
 */
export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  onSave,
  onDelete,
}: TemplateSelectorProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle save template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      setSaveError('模板名称不能为空');
      return;
    }

    if (templates.some(t => t.name === templateName.trim())) {
      setSaveError('模板名称已存在');
      return;
    }

    onSave(templateName.trim(), {} as ProcessingParams);
    
    setTemplateName('');
    setSaveError('');
    setShowSaveDialog(false);
  };

  // Handle delete template
  const handleDeleteTemplate = (id: string) => {
    onDelete(id);
  };

  return (
    <div className={`template-selector ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="template-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <BookmarkIcon className="section-icon" />
          <h3>处理模板</h3>
        </div>
        <div className="header-right">
          <button
            className="save-template-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSaveDialog(true);
            }}
            title="保存当前参数为模板"
          >
            <PlusIcon className="button-icon" />
            <span>保存</span>
          </button>
          {isExpanded ? <ChevronUpIcon className="toggle-icon" /> : <ChevronDownIcon className="toggle-icon" />}
        </div>
      </div>

      {/* Template list */}
      {isExpanded && (
        <div className="section-content">
          {templates.length > 0 ? (
            <div className="template-list">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-item ${selectedId === template.id ? 'selected' : ''}`}
                >
                  <button
                    className="template-select-button"
                    onClick={() => onSelect(template.id)}
                  >
                    <span className="template-name">{template.name}</span>
                    <span className="template-date">
                      {new Date(template.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </button>
                  <button
                    className="template-delete-button"
                    onClick={() => handleDeleteTemplate(template.id)}
                    title="删除模板"
                  >
                    <TrashIcon className="delete-icon" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>还没有保存的模板</p>
              <p className="hint">点击"保存"按钮保存常用参数组合</p>
            </div>
          )}
        </div>
      )}

      {/* Save template dialog */}
      {showSaveDialog && (
        <div className="dialog-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h4>保存新模板</h4>
              <button
                className="dialog-close"
                onClick={() => setShowSaveDialog(false)}
              >
                <XMarkIcon className="close-icon" />
              </button>
            </div>

            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="template-name">模板名称</label>
                <input
                  id="template-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    setSaveError('');
                  }}
                  placeholder="例如: Instagram 方形图"
                  className="form-input"
                  autoFocus
                />
                {saveError && <div className="error-message">{saveError}</div>}
              </div>
            </div>

            <div className="dialog-footer">
              <button
                className="button-cancel"
                onClick={() => setShowSaveDialog(false)}
              >
                取消
              </button>
              <button
                className="button-save"
                onClick={handleSaveTemplate}
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
