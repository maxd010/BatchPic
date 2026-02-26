# BatchPic 设计系统

基于 ui-ux-pro-max 工具生成的专业设计系统，针对桌面图片处理工具优化。

## 配色方案

### 主色调
- **Primary**: `#0D9488` (Teal) - 主要交互元素
- **Primary Hover**: `#0f766e` - 悬停状态
- **Secondary**: `#14B8A6` (Light Teal) - 次要元素
- **CTA**: `#F97316` (Orange) - 行动号召按钮
- **CTA Hover**: `#ea580c` - CTA 悬停状态

### 背景与文本
- **Background**: `#F0FDFA` - 页面背景（淡青色渐变）
- **Surface**: `#ffffff` - 卡片/面板背景
- **Text**: `#134E4A` - 主要文本
- **Text Muted**: `#5f7c79` - 次要文本
- **Border**: `#ccfbf1` - 边框颜色

### 状态颜色
- **Success**: `#10b981` - 成功状态
- **Success BG**: `#d1fae5` - 成功背景
- **Error**: `#ef4444` - 错误状态

## 字体系统

### 字体家族
- **主字体**: Plus Jakarta Sans (Google Fonts)
- **权重**: 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

### 字体大小
- **标题**: 28px (h1), 24px (h2), 16px (h3)
- **正文**: 14px
- **小字**: 13px, 12px

## 间距系统

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
```

## 圆角

```css
--radius-sm: 6px   /* 按钮、输入框 */
--radius-md: 12px  /* 卡片 */
--radius-lg: 16px  /* 大型容器 */
```

## 阴影

```css
--shadow-sm: 0 1px 2px rgba(13, 148, 136, 0.05)
--shadow-md: 0 4px 6px rgba(13, 148, 136, 0.07)
--shadow-lg: 0 10px 15px rgba(13, 148, 136, 0.1)
```

## 动画与过渡

### 过渡时长
```css
--transition-fast: 150ms ease-out   /* 快速交互 */
--transition-base: 200ms ease-out   /* 标准交互 */
--transition-slow: 300ms ease-out   /* 复杂动画 */
```

### 缓动函数
- **进入**: `ease-out` - 元素进入视图
- **退出**: `ease-in` - 元素离开视图
- **悬停**: `ease-out` - 悬停状态变化

### 关键动画
- **slideIn**: 通知、结果消息的滑入动画
- **shimmer**: 进度条的闪烁效果
- **bounce**: 拖放时的弹跳提示

## 微交互设计

### 按钮
- 悬停时轻微上移 (`translateY(-2px)`)
- 点击时回弹 (`translateY(0)`)
- 渐变背景 + 光泽效果
- 禁用状态灰色且无交互

### 卡片
- 悬停时阴影增强
- 轻微的上移效果
- 边框颜色过渡

### 输入框
- 聚焦时边框颜色变化
- 外发光效果 (`box-shadow`)
- 悬停时边框颜色加深

### 滑块
- 滑块手柄悬停时放大 (`scale(1.1)`)
- 点击时缩小 (`scale(0.95)`)
- 渐变背景

## 可访问性

### 焦点状态
- 所有交互元素都有明显的 `focus-visible` 样式
- 使用 CTA 橙色 (`#F97316`) 作为焦点指示器
- 3px 外轮廓 + 2px 偏移

### 减少动画
```css
@media (prefers-reduced-motion: reduce) {
  /* 禁用所有动画和过渡 */
}
```

### 对比度
- 文本对比度至少 4.5:1
- 主文本: `#134E4A` on `#F0FDFA`
- 次要文本: `#5f7c79` on `#ffffff`

### 触摸目标
- 最小触摸区域: 44x44px
- 按钮间距至少 8px

## 响应式断点

```css
@media (max-width: 1024px) {
  /* 平板布局 - 单列 */
}

@media (max-width: 768px) {
  /* 移动布局 - 紧凑间距 */
}
```

## 组件规范

### Header
- 渐变背景 (Primary → Secondary)
- 装饰性图案叠加
- 白色文本 + 阴影

### Drop Zone
- 虚线边框 (Primary)
- 悬停时边框变实 + 轻微上移
- 拖放时橙色高亮 + 缩放效果

### Parameter Panel
- 白色卡片背景
- 淡青色边框
- 悬停时阴影增强

### Export Button
- 橙色渐变背景 (CTA)
- 光泽扫过效果
- 悬停时上移 + 阴影增强

### Notifications
- 渐变背景 + 毛玻璃效果
- 从右侧滑入
- 白色文本 + 半透明关闭按钮

## 设计原则

1. **微交互优先**: 所有交互元素都有 50-300ms 的过渡效果
2. **视觉层次**: 使用颜色、大小、阴影建立清晰的层次
3. **一致性**: 所有组件使用统一的设计语言
4. **可访问性**: 遵循 WCAG 2.1 AA 标准
5. **性能**: 使用 CSS 动画而非 JavaScript
6. **响应式**: 移动优先的设计方法

## 反模式（避免）

- ❌ 使用 emoji 作为图标（应使用 SVG）
- ❌ 复杂的入门流程
- ❌ 缓慢的性能
- ❌ 线性动画（应使用 ease-out/ease-in）
- ❌ 忽略 prefers-reduced-motion
- ❌ 低对比度文本
- ❌ 过小的触摸目标

## 实现检查清单

- [x] Plus Jakarta Sans 字体已导入
- [x] CSS 变量定义完整
- [x] 所有交互元素有 cursor-pointer
- [x] 悬停状态有平滑过渡 (150-300ms)
- [x] 焦点状态可见（键盘导航）
- [x] 支持 prefers-reduced-motion
- [x] 响应式断点: 375px, 768px, 1024px, 1440px
- [x] 文本对比度 ≥ 4.5:1
- [x] 所有图标使用 SVG（非 emoji）
