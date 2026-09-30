import { useCallback, useEffect, useState } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  FolderArrowDownIcon,
  FolderOpenIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  XCircleIcon,
  XMarkIcon,
} from "./Icons";
import "./FolderWatchPanel.css";

/** One row in the activity stream. */
interface WatchLogEntry {
  id: string;
  sourceFile: string;
  outputFile?: string;
  outputSize?: number;
  originalSize?: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface FolderWatchPanelProps {
  params: any;
  onClose: () => void;
}

/** Keep the stream bounded so a long-running watch cannot grow without limit. */
const MAX_LOG_ENTRIES = 50;

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function baseName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

/**
 * Electron wraps a rejected IPC call as
 * `Error invoking remote method 'x': Error: <message>`, where only the tail is
 * meaningful. Strip the wrapper so the panel shows a readable reason.
 */
function cleanErrorMessage(raw: string): string {
  const match = raw.match(
    /Error invoking remote method '[^']*':\s*(?:Error:\s*)?([\s\S]*)$/,
  );
  return match ? match[1].trim() : raw;
}

function toErrorMessage(error: unknown): string {
  return cleanErrorMessage(
    error instanceof Error ? error.message : String(error),
  );
}

/** Human-readable summary of the parameters the watcher will apply. */
function describeParams(params: any): string[] {
  if (!params) return ["沿用当前处理参数"];

  const summary: string[] = [];

  summary.push(
    params.format
      ? `输出格式：${String(params.format).toUpperCase()}`
      : "输出格式：保持原格式",
  );

  const compression = params.compression;
  if (!compression || compression.mode === "none") {
    summary.push("压缩：不压缩");
  } else if (compression.mode === "smart") {
    summary.push("压缩：智能压缩");
  } else if (compression.mode === "quality") {
    summary.push(`压缩：质量 ${compression.value ?? "默认"}`);
  } else if (compression.mode === "targetSize") {
    summary.push(`压缩：目标 ${compression.value ?? "默认"} KB`);
  }

  const resize = params.resize;
  if (!resize) {
    summary.push("尺寸：保持原尺寸");
  } else if (resize.mode === "scale") {
    summary.push(`尺寸：缩放 ${resize.value}%`);
  } else {
    summary.push(`尺寸：${resize.mode} ${resize.value}px`);
  }

  return summary;
}

export function FolderWatchPanel({ params, onClose }: FolderWatchPanelProps) {
  const [watchPath, setWatchPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isWatching, setIsWatching] = useState(false);
  const [logs, setLogs] = useState<WatchLogEntry[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to watcher events pushed from the main process.
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onFolderWatchEvent) return;

    const unsubscribeEvent = api.onFolderWatchEvent((event: any) => {
      setLogs((previous) =>
        [
          {
            id: `${event.sourceFile}-${event.timestamp}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            ...event,
          },
          ...previous,
        ].slice(0, MAX_LOG_ENTRIES),
      );
    });

    const unsubscribeError = api.onFolderWatchError?.((payload: any) => {
      setError(payload?.message ?? "监听发生错误");
      setIsWatching(false);
    });

    return () => {
      unsubscribeEvent?.();
      unsubscribeError?.();
    };
  }, []);

  // Re-sync with the main process (panel reopened, or window reloaded).
  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      ?.getFolderWatchStatus?.()
      .then((status: any) => {
        if (cancelled || !status) return;
        setIsWatching(status.isWatching);
        if (status.watchPath) setWatchPath(status.watchPath);
        if (status.outputPath) setOutputPath(status.outputPath);
      })
      .catch(() => {
        /* status is advisory; a failure must not block the panel */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pickDirectory = useCallback(
    async (apply: (value: string) => void) => {
      try {
        const selected = await window.electronAPI.openDirectoryDialog();
        if (selected) apply(selected);
      } catch (pickError) {
        setError(toErrorMessage(pickError));
      }
    },
    [],
  );

  const handleToggle = useCallback(async () => {
    setError(null);

    if (isWatching) {
      try {
        const status = await window.electronAPI.stopFolderWatch();
        setIsWatching(status?.isWatching ?? false);
      } catch (stopError) {
        setError(toErrorMessage(stopError));
      }
      return;
    }

    if (!watchPath || !outputPath) {
      setError("请先选择监听目录和输出目录");
      return;
    }

    setIsBusy(true);
    try {
      const status = await window.electronAPI.startFolderWatch({
        watchPath,
        outputPath,
        params,
      });
      setIsWatching(status?.isWatching ?? false);
    } catch (startError) {
      setError(toErrorMessage(startError));
    } finally {
      setIsBusy(false);
    }
  }, [isWatching, watchPath, outputPath, params]);

  const parameterSummary = describeParams(params);

  return (
    <div className="folder-watch-overlay" onClick={onClose}>
      <div
        className="folder-watch-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="folder-watch-header">
          <div className="folder-watch-heading">
            <h2>文件夹监听</h2>
            <p>监视一个目录，新图片落入后自动按当前参数处理</p>
          </div>
          <button
            className="folder-watch-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <XMarkIcon className="icon" />
          </button>
        </header>

        <div className="folder-watch-body">
          <section className="folder-watch-section">
            <button
              className="folder-watch-path"
              disabled={isWatching}
              onClick={() => pickDirectory(setWatchPath)}
            >
              <FolderOpenIcon className="folder-watch-path-icon is-watch" />
              <span className="folder-watch-path-text">
                <span className="folder-watch-path-label">1 · 监听目录</span>
                <span className="folder-watch-path-value">
                  {watchPath || "点击选择要监视的目录…"}
                </span>
              </span>
            </button>

            <button
              className="folder-watch-path"
              disabled={isWatching}
              onClick={() => pickDirectory(setOutputPath)}
            >
              <FolderArrowDownIcon className="folder-watch-path-icon is-output" />
              <span className="folder-watch-path-text">
                <span className="folder-watch-path-label">2 · 输出目录</span>
                <span className="folder-watch-path-value">
                  {outputPath || "点击选择处理结果的存放目录…"}
                </span>
              </span>
            </button>
          </section>

          <section className="folder-watch-section">
            <div className="folder-watch-section-title">将使用的处理参数</div>
            <ul className="folder-watch-params">
              {parameterSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="folder-watch-hint">
              修改参数后需重新启动监听才会生效。
            </p>
          </section>

          <section className="folder-watch-controls">
            <div className="folder-watch-status">
              <span
                className={`folder-watch-dot ${isWatching ? "is-live" : ""}`}
              />
              <span>{isWatching ? "监听中，等待新图片…" : "未启动"}</span>
            </div>
            <button
              className={`folder-watch-toggle ${isWatching ? "is-stop" : ""}`}
              disabled={
                isBusy || (!isWatching && (!watchPath || !outputPath))
              }
              onClick={handleToggle}
            >
              {isWatching ? (
                <StopIcon className="icon" />
              ) : (
                <PlayIcon className="icon" />
              )}
              {isWatching ? "停止监听" : isBusy ? "启动中…" : "开始监听"}
            </button>
          </section>

          {error && <div className="folder-watch-error">{error}</div>}

          <section className="folder-watch-log">
            <div className="folder-watch-log-header">
              <span>活动记录</span>
              <span className="folder-watch-log-count">
                {logs.length} 条
                {logs.length > 0 && (
                  <button
                    className="folder-watch-log-clear"
                    onClick={() => setLogs([])}
                  >
                    <TrashIcon className="icon" /> 清空
                  </button>
                )}
              </span>
            </div>

            <div className="folder-watch-log-list">
              {logs.length === 0 ? (
                <div className="folder-watch-empty">
                  <ClockIcon className="icon" />
                  <span>暂无活动。向监听目录放入图片即可看到结果。</span>
                </div>
              ) : (
                logs.map((entry) => (
                  <div key={entry.id} className="folder-watch-log-item">
                    {entry.success ? (
                      <CheckCircleIcon className="folder-watch-log-icon is-success" />
                    ) : (
                      <XCircleIcon className="folder-watch-log-icon is-failure" />
                    )}
                    <div className="folder-watch-log-text">
                      <span className="folder-watch-log-name">
                        {baseName(entry.sourceFile)}
                      </span>
                      <span className="folder-watch-log-meta">
                        {entry.timestamp} ·{" "}
                        {entry.success
                          ? `${formatBytes(entry.originalSize)} → ${formatBytes(entry.outputSize)}`
                          : entry.error || "处理失败"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
