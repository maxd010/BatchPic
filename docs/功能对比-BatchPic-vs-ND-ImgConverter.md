# 功能对比：BatchPic vs ND-ImgConverter

> 对比日期：2026-09-29
>
> - **BatchPic** —— 本项目，Electron 28 + React 18 + TypeScript + sharp(libvips)
> - **ND-ImgConverter** —— 第三方开源 v0.8.4，Tauri 2 + Rust + React 19
>   （`github.com/duongtruongdp/ND-ImgConverter`）
>
> 两者的定位不同：BatchPic 是围绕「交付前把图片压到可控体积」这一件事做的窄而深；
> ND-ImgConverter 是覆盖尽量多格式与场景的通用转换器。下表是逐项对照。

---

## 功能矩阵

| 能力 | BatchPic | ND-ImgConverter |
| :--- | :--- | :--- |
| 格式支持 | ⚠️ 读 6 种 / 写 5 种（JPG/PNG/WebP/TIFF/GIF/AVIF，其中 GIF 只读） | ✅ JPEG/PNG/WebP/AVIF/BMP/ICO/TIFF/TGA/GIF/EXR 等十余种 |
| 相机 RAW | ❌ | ✅ CR2/CR3/DNG/ARW/NEF/ORF/RAF |
| HEIC / HEIF | ⚠️ AVIF（HEIF 容器）可读写；HEIC 不可 | ✅ 本地解码 |
| 压缩到目标大小 | ✅ 核心卖点（二分搜索） | ⚠️ 只有质量滑块 + 体积预估 |
| 智能压缩 | ✅ 按格式自动选参 | ❌ |
| 色彩管理 ICC | ❌ | ✅ lcms2，sRGB/Display P3/Adobe RGB |
| 水印 | ❌ | ✅ 文字/图片，位置缩放透明度 |
| EXIF | ✅ 自动定向（修竖拍躺倒） | ✅ 剥离 GPS/缩略图等 |
| 模板 / 预设 | ✅ TemplateManager | ❌ |
| 文件夹监听自动化 | ✅ watch folder（2026-09-29 新增） | ✅ watch folder + 双 profile |
| 视频工具 | ❌ | ✅ 转 GIF、视频转码、抽帧（内置 FFmpeg） |
| 更新检查 | ❌ | ✅ GitHub release |
| 明暗主题 | ❌ | ✅ |
| 输出目录 | ⚠️ 跟随源目录（转换写原目录，同格式写同级 `{folder}-processed`） | ✅ 系统选择器 |

### 矩阵说明

- **格式支持**：2026-09-30 起从 3 种扩到「读 6 写 5」，边界现在唯一由
  `src/main/formats.ts` 的 `INPUT_FORMATS` / `OUTPUT_FORMATS` 决定——`FileScanner` 的扩展名与
  魔数白名单、`preload.ts` 的参数校验、UI 的格式下拉和 DropZone 标签全部从它派生。
  这次扩展**没有引入任何依赖**，用到的编解码器 sharp 预编译包里本来就有；此前只是被
  `ImageFile.format` 的硬编码联合类型挡在门外。仍不及 ND 的面：无 RAW、无 HEIC
  （预编译 libheif 只登记 `.avif`）、无 BMP/ICO/TGA/EXR。
  GIF 刻意只读不写——它的编码器没有质量参数，放开成输出格式会让压缩档位静默失效。
- **压缩到目标大小**：这是 BatchPic 唯一的功能护城河。`ImageProcessor.compressToTargetSize`
  用二分搜索反复调编码器逼近目标体积；ND 只提供质量滑块加输出体积预估，需要用户自己试。
- **输出目录**：BatchPic 不设全局固定输出目录（早期 README 里「固定输出到 `~/BatchPic_Output`」
  的说法已过时）。当前规则由 `SharpImageProcessor.getOutputPath` 决定：
  格式变化 → 写在原文件旁，仅扩展名不同；同格式 → 写进与源文件夹同级的
  `{folderName}-processed`，避免覆盖原图。
- **文件夹监听自动化**：BatchPic 于 2026-09-29 补齐，详见下节。
- **双 profile**：ND 因为同时处理图片与视频，图片/视频各有一套独立配置；BatchPic 只有图片，
  因此是单套参数。

---

## 本次新增：文件夹监听自动化

### 参照实现

ND 的实现在 `src-tauri/src/engine/watcher.rs`，要点：

- `notify-debouncer-mini` 建立监听，**固定 1.5 秒防抖**，等文件拷贝完成；
- `RecursiveMode::NonRecursive`，只监听顶层；
- 事件回调过滤扩展名，并**跳过落在输出目录内的文件**，否则自己的输出会再次触发监听形成死循环；
- 每个文件处理完成后向前端 emit `folder-automation-event`（含来源、输出、体积、成功与否、时间戳）。

### BatchPic 的实现

文件：`src/main/FolderWatcher.ts`，配套 `src/main/main.ts`（IPC）、`src/main/preload.ts`
（通道）、`src/renderer/components/FolderWatchPanel.tsx`（界面）。

保留的设计：防抖窗口、非递归、输出目录排除、事件推送。

**一处主动改进**：ND 固定防抖 1.5 秒后就无条件处理。若拷贝持续时间超过该窗口，
文件仍会在没写完时被交给编码器而失败。BatchPic 在防抖之后增加**文件大小稳定二次确认**——
同一个文件必须连续两次报告相同大小才进入处理，未稳定则再等一轮。这样慢速拷贝、
大文件下载都不会被处理到半截。

其余实现细节：

| 项 | BatchPic 取值 | 说明 |
| :--- | :--- | :--- |
| 监听 API | Node 内置 `fs.watch` | 零依赖，方向与项目「不加冗余依赖」一致 |
| 防抖窗口 | 1500 ms | 对齐 ND |
| 稳定复核间隔 | 500 ms | 本项目新增 |
| 递归 | 否 | 对齐 ND |
| 处理的扩展名 | `.jpg/.jpeg/.png/.webp` | BatchPic 支持范围 |
| 忽略的临时文件 | `.tmp/.crdownload/.part/.partial/.download` | 避免抓到下载中的半成品 |
| 输出命名 | 保持基名，扩展名跟随目标格式 | 例如 `shot.png` → `shot.webp` |
| 界面入口 | 主窗口右上角按钮 → 模态面板 | 主窗口仅 460×680，模态比内嵌更合适 |

界面包含：监听/输出目录选择、当前将套用的处理参数摘要、启停开关与状态指示、
以及实时活动流（最近 50 条，含文件名、体积变化、成功/失败与时间）。

### 已知边界

- 输出目录与监听目录设为**同一个**目录时，所有文件都会被「输出目录排除」规则跳过，
  不会发生自我循环，但也不会有任何处理发生——这是刻意的保守行为，若需要就地覆盖应改用
  主界面的批量处理。
- 修改处理参数后需**重新启动监听**才会生效，面板内已就此给出提示。
- `fs.watch` 在部分平台可能不提供文件名，此时会跳过该事件而不是猜测性地处理整个目录。

---

## 结论

两者不构成替换关系：

- **BatchPic 的取舍**是把「批量导出后体积可控」做扎实——目标体积二分搜索、智能压缩、
  模板复用、EXIF 自动定向，代价是格式面窄、无视频、无色彩管理。
- **ND-ImgConverter 的取舍**是把覆盖面做宽——十余种格式、RAW、HEIC、ICC、水印、视频工具，
  代价是零测试（`src` 与 `src-tauri` 下无任何测试文件），且没有「压缩到目标大小」这类
  需要反复试探的精细控制。

因此可借鉴的方向按优先级排列：

1. **ICC 色彩管理**——sharp 底层 libvips 原生支持，成本低、收益直接；
2. **RAW / HEIC 输入**——同样是 libvips 能力，能显著拓宽素材来源；
3. 水印与视频工具——需要新依赖（FFmpeg），且与「交付前压缩」的核心场景关联较弱，
   建议排在最后。
