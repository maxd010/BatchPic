#!/usr/bin/env node
/**
 * BatchPic 图标生成器（跨平台）
 *
 * 从 `icon-source.png` 生成 Electron 需要的两个图标文件：
 *   - icon.ico  (Windows) 256 用 PNG 存，128/64/48/32/16 用 DIB 存
 *   - icon.icns (macOS)   16/32/64/128/256/512/1024 全部用 PNG 块
 *
 * 这套格式是照原有图标文件（ImageMagick 产物）实测对齐的，不要随意改动存法：
 *   - ICO 的 256 尺寸若也用 DIB 会让文件暴增；小尺寸用 PNG 则在老工具里兼容性差。
 *   - ICNS 的 ic07/ic08/ic09/ic10 是 macOS 实际读取的四个标准类型。
 *
 * 依赖：sharp（项目已有依赖，无需额外安装，也不需要 ImageMagick / iconutil）
 * 用法：node build/icons/generate-icons.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DIR, "icon-source.png");
const ICO_PATH = path.join(DIR, "icon.ico");
const ICNS_PATH = path.join(DIR, "icon.icns");

/** Windows 图标尺寸，与 build/icons/README.md 的规格一致 */
const ICO_SIZES = [256, 128, 64, 48, 32, 16];
/** 只有 256 用 PNG 压缩存；其余用未压缩 DIB（32bpp + AND 掩码） */
const ICO_PNG_SIZES = new Set([256]);

/**
 * macOS 图标块。第二个元素是像素尺寸；
 * icp4/icp5/icp6 是 16/32/64 的 PNG 类型，ic07~ic10 依次是 128/256/512/1024，
 * ic11~ic14 是对应的 @2x 别名（与原有文件保持同样的重复度）。
 */
const ICNS_CHUNKS = [
  ["icp4", 16],
  ["icp5", 32],
  ["ic11", 32],
  ["ic12", 64],
  ["ic07", 128],
  ["ic13", 256],
  ["ic08", 256],
  ["ic14", 512],
  ["ic09", 512],
  ["ic10", 1024],
];

const RESIZE = { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } };

/** 生成指定尺寸的 PNG buffer */
function pngAt(size) {
  return sharp(SRC).resize(size, size, RESIZE).png({ compressionLevel: 9 }).toBuffer();
}

/** 生成指定尺寸的 RGBA 原始像素 */
async function rgbaAt(size) {
  const { data } = await sharp(SRC)
    .resize(size, size, RESIZE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/**
 * 把 RGBA 像素打成 ICO 里的 DIB 条目：
 * BITMAPINFOHEADER(40) + XOR 位图(BGRA, 自下而上) + AND 掩码(1bpp, 每行补齐到 4 字节)
 */
function dibEntry(rgba, size) {
  const xorSize = size * size * 4;
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andSize = andRowBytes * size;

  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); // biSize
  header.writeInt32LE(size, 4); // biWidth
  header.writeInt32LE(size * 2, 8); // biHeight = XOR + AND 两张图
  header.writeUInt16LE(1, 12); // biPlanes
  header.writeUInt16LE(32, 14); // biBitCount
  header.writeUInt32LE(0, 16); // biCompression = BI_RGB
  header.writeUInt32LE(xorSize, 20); // biSizeImage
  header.writeInt32LE(0, 24); // biXPelsPerMeter
  header.writeInt32LE(0, 28); // biYPelsPerMeter
  header.writeUInt32LE(0, 32); // biClrUsed
  header.writeUInt32LE(0, 36); // biClrImportant

  const xor = Buffer.alloc(xorSize);
  const and = Buffer.alloc(andSize, 0);
  for (let y = 0; y < size; y++) {
    const srcRow = (size - 1 - y) * size * 4; // DIB 自下而上
    const dstRow = y * size * 4;
    for (let x = 0; x < size; x++) {
      const s = srcRow + x * 4;
      const d = dstRow + x * 4;
      xor[d] = rgba[s + 2]; // B
      xor[d + 1] = rgba[s + 1]; // G
      xor[d + 2] = rgba[s]; // R
      xor[d + 3] = rgba[s + 3]; // A
      if (rgba[s + 3] < 128) {
        and[y * andRowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return Buffer.concat([header, xor, and]);
}

async function buildIco() {
  const images = [];
  for (const size of ICO_SIZES) {
    if (ICO_PNG_SIZES.has(size)) {
      images.push({ size, kind: "PNG", data: await pngAt(size) });
    } else {
      images.push({ size, kind: "DIB", data: dibEntry(await rgbaAt(size), size) });
    }
  }

  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type = icon
  dir.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map((img) => {
    const e = Buffer.alloc(16);
    e[0] = img.size === 256 ? 0 : img.size; // 0 表示 256
    e[1] = img.size === 256 ? 0 : img.size;
    e[2] = 0; // 调色板数量
    e[3] = 0; // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(img.data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.data.length;
    return e;
  });

  fs.writeFileSync(ICO_PATH, Buffer.concat([dir, ...entries, ...images.map((i) => i.data)]));
  return images;
}

async function buildIcns() {
  const chunks = [];
  for (const [type, size] of ICNS_CHUNKS) {
    const png = await pngAt(size);
    const head = Buffer.alloc(8);
    head.write(type, 0, 4, "latin1");
    head.writeUInt32BE(8 + png.length, 4);
    chunks.push(Buffer.concat([head, png]));
  }

  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, 4, "latin1");
  head.writeUInt32BE(8 + body.length, 4);

  fs.writeFileSync(ICNS_PATH, Buffer.concat([head, body]));
  return ICNS_CHUNKS;
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`找不到源文件: ${SRC}`);
    process.exit(1);
  }

  const meta = await sharp(SRC).metadata();
  console.log(`源文件: icon-source.png (${meta.width}x${meta.height})`);
  if (Math.min(meta.width, meta.height) < 1024) {
    console.warn(`⚠️  源图小于 1024x1024，1024 尺寸的图标会被放大而变糊`);
  }
  if (!meta.hasAlpha) {
    console.warn(`⚠️  源图没有 alpha 通道，图标会带白色背景`);
  }

  const icoImages = await buildIco();
  console.log(`已生成 icon.ico (${fs.statSync(ICO_PATH).size} bytes)`);
  for (const img of icoImages) {
    console.log(`  ${String(img.size).padStart(4)}x${String(img.size).padEnd(4)} ${img.kind} ${img.data.length} bytes`);
  }

  const icnsChunks = await buildIcns();
  console.log(`已生成 icon.icns (${fs.statSync(ICNS_PATH).size} bytes)`);
  for (const [type, size] of icnsChunks) {
    console.log(`  ${type} ${size}x${size}`);
  }
}

await main();
