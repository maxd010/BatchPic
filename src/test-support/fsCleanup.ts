/**
 * 测试用的文件系统清理工具。
 *
 * 背景：SharpImageProcessor 的构造函数会调用 `sharp.cache({ files: 20 })`，
 * sharp 因此会持有输入文件的句柄。在 Windows 上，句柄未释放时对临时目录执行
 * `fs.rm` 会抛出 `EBUSY: resource busy or locked`，导致整个测试套件 fail 在
 * 清理阶段（用例本身其实是通过的）。
 *
 * 这里的做法是先释放 sharp 的文件缓存，再带重试地删除目录，最后把失败降级为
 * 警告——临时目录清理失败不应该让测试结果失真。
 */

import fs from "fs/promises";
import sharp from "sharp";

/**
 * 释放 sharp 持有的文件句柄缓存。
 * 仅影响测试进程内的 sharp 全局缓存设置，不涉及产品代码行为。
 */
export function releaseSharpFileHandles(): void {
  sharp.cache(false);
}

/**
 * 删除目录，遇到 Windows 文件占用时重试。
 *
 * @param dir 要删除的目录
 * @param attempts 最多尝试次数（默认 5 次）
 */
export async function removeDirWithRetry(
  dir: string,
  attempts = 5,
): Promise<void> {
  releaseSharpFileHandles();

  for (let i = 0; i < attempts; i++) {
    try {
      await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return;
    } catch (error) {
      if (i === attempts - 1) {
        console.warn(
          `[test] 清理临时目录失败（已忽略，不影响用例结果）: ${dir}`,
          error,
        );
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
