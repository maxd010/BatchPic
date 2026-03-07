
# 优化交互体验

## 修改主窗口尺寸

## 修改设置-尺寸，只保留以下选项

    ○ Max edge 1920 px

    ○ Width  1200 px

    ○ Scale 100% (default)

### 修改设置-压缩
    标题不要显示“Compression”，而是 Optimize

#### 智能压缩 (default) Smart compression
    Optimize size while keeping good quality

        用户 不用选任何东西。
        程序自动：
        - 判断 PNG / JPG / WebP
        - 选择合适质量
        - 去 metadata
        - 做优化
    
    #### 质量选项，Quality
            60
            70
            75
            80
            85
            90

    #### Target size
        200 KB

    #### ☐ Remove metadata

## 修改设置UI，移除多余信息

## 移除“处理模板”，改为自动保存用户最后一次的设置，下次启动应用之前设置好的参数不变。

## 修改图片处理过程界面UI

### 处理进度与已选择图片列表，二合一

    - 移除已选择图片
    - 处理进度添加图片缩略图

    - 处理进度，增加点击弹出对比窗口

    - 「 清空全部 」 按钮，放在处理进度列表项标题右侧；
 
    - [ Open Folder ] 按钮，放在处理进度列表项标题右侧

    - 移除底部处理完成信息

    - 列表项添加信息 Original: 3.4 MB、Estimated: 780 KB

### 开始导出图片，仅手动处理模式显示

## 处理后的图片保存路径策略

    默认：
    Save to: Same folder
    Suffix: -opt

    同时支持：
    Subfolder: optimized
    Overwrite original


---

# 增强功能

## 添加更多常用格式图片的支持

## 设置项
  
  ### 处理后的图片保存策略
    - 原路径，加后缀 -opt （可修改）
    - 子文件夹，optimized（可重命名）