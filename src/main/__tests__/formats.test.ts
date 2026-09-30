/**
 * Unit tests for the image format registry.
 *
 * The registry is the single source of truth for what BatchPic can read and
 * write, so these tests pin both its own consistency and its promise that every
 * listed format is actually served by the bundled libvips build.
 */

import sharp from 'sharp';
import {
  ALL_INPUT_EXTENSIONS,
  INPUT_EXTENSIONS,
  INPUT_FORMATS,
  INPUT_MIME_TYPES,
  MIME_BY_EXTENSION,
  OUTPUT_EXTENSION,
  OUTPUT_FORMATS,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  extensionFor,
  isInputFormat,
  isOutputFormat,
  isOutputFormatChoice,
  normalizeFormat,
  resolveOutputFormat,
  type InputFormat,
  type OutputFormat,
} from '../formats.js';

/** sharp's own id for a format; two differ from ours. */
const SHARP_ID: Record<InputFormat, string> = {
  jpg: 'jpeg',
  png: 'png',
  webp: 'webp',
  tiff: 'tiff',
  gif: 'gif',
  avif: 'heif',
};

describe('format lists', () => {
  it('should be non-empty and duplicate-free', () => {
    expect(INPUT_FORMATS.length).toBeGreaterThan(0);
    expect(OUTPUT_FORMATS.length).toBeGreaterThan(0);
    expect(new Set(INPUT_FORMATS).size).toBe(INPUT_FORMATS.length);
    expect(new Set(OUTPUT_FORMATS).size).toBe(OUTPUT_FORMATS.length);
  });

  it('should keep output formats a subset of input formats', () => {
    for (const format of OUTPUT_FORMATS) {
      expect(INPUT_FORMATS).toContain(format);
    }
  });

  it('should accept gif as input but never as a target', () => {
    // sharp's cgif encoder has no `quality` knob, so a GIF target would
    // silently void the smart/quality/targetSize modes.
    expect(INPUT_FORMATS).toContain('gif');
    expect(OUTPUT_FORMATS).not.toContain('gif');
  });
});

describe('extensions and MIME types', () => {
  it('should give every input format at least one extension and MIME type', () => {
    for (const format of INPUT_FORMATS) {
      expect(INPUT_EXTENSIONS[format].length).toBeGreaterThan(0);
      expect(INPUT_MIME_TYPES[format].length).toBeGreaterThan(0);
    }
  });

  it('should accept the alternate spellings that exist in the wild', () => {
    expect(INPUT_EXTENSIONS.jpg).toContain('jpeg');
    expect(INPUT_EXTENSIONS.tiff).toEqual(expect.arrayContaining(['tif', 'tiff']));
  });

  it('should expose every extension dotted, in the derived lookups', () => {
    for (const format of INPUT_FORMATS) {
      for (const extension of INPUT_EXTENSIONS[format]) {
        expect(SUPPORTED_EXTENSIONS.has(`.${extension}`)).toBe(true);
        expect(MIME_BY_EXTENSION[`.${extension}`]).toBe(INPUT_MIME_TYPES[format][0]);
      }
    }
  });

  it('should list the same extensions with and without the dot', () => {
    expect([...ALL_INPUT_EXTENSIONS].sort()).toEqual(
      [...SUPPORTED_EXTENSIONS].map((extension) => extension.slice(1)).sort(),
    );
    for (const extension of ALL_INPUT_EXTENSIONS) {
      expect(extension.startsWith('.')).toBe(false);
    }
  });

  it('should collect every MIME type into the flat allow-list', () => {
    for (const format of INPUT_FORMATS) {
      for (const mime of INPUT_MIME_TYPES[format]) {
        expect(SUPPORTED_MIME_TYPES).toContain(mime);
      }
    }
  });

  it('should give every output format exactly one extension', () => {
    for (const format of OUTPUT_FORMATS) {
      expect(OUTPUT_EXTENSION[format]).toMatch(/^[a-z0-9]+$/);
      expect(extensionFor(format)).toBe(OUTPUT_EXTENSION[format]);
    }
  });

  it('should write .tif so a same-format TIFF run keeps its base name', () => {
    expect(extensionFor('tiff')).toBe('tif');
    expect(SUPPORTED_EXTENSIONS.has('.tif')).toBe(true);
  });
});

describe('normalizeFormat', () => {
  it('should map sharp\'s spellings onto ours', () => {
    // sharp reports JPEG as `jpeg`…
    expect(normalizeFormat('jpeg')).toBe('jpg');
    // …and AVIF as `heif`, because AVIF is a HEIF container.
    expect(normalizeFormat('heif')).toBe('avif');
  });

  it('should pass through every format we already spell the same way', () => {
    expect(normalizeFormat('png')).toBe('png');
    expect(normalizeFormat('webp')).toBe('webp');
    expect(normalizeFormat('tiff')).toBe('tiff');
    expect(normalizeFormat('gif')).toBe('gif');
  });

  it('should reject formats we do not promise to process', () => {
    // svg is readable by libvips but carries no magic bytes, so the scanner's
    // content check cannot vouch for it.
    expect(normalizeFormat('svg')).toBeNull();
    expect(normalizeFormat('pdf')).toBeNull();
    expect(normalizeFormat('jp2k')).toBeNull();
    expect(normalizeFormat(undefined)).toBeNull();
  });
});

describe('resolveOutputFormat', () => {
  it('should honour an explicit format regardless of the source', () => {
    expect(resolveOutputFormat('webp', 'tiff')).toBe('webp');
    expect(resolveOutputFormat('avif', 'gif')).toBe('avif');
  });

  it('should keep the source format when it can be encoded', () => {
    for (const format of OUTPUT_FORMATS) {
      expect(resolveOutputFormat(undefined, format)).toBe(format);
    }
  });

  it('should redirect a GIF kept "as is" to PNG', () => {
    // A GIF has no encoder, so "keep the source format" cannot be honoured.
    // PNG is the lossless, alpha-capable stand-in.
    expect(resolveOutputFormat(undefined, 'gif')).toBe('png');
  });
});

describe('type guards', () => {
  it('should recognise input formats', () => {
    for (const format of INPUT_FORMATS) {
      expect(isInputFormat(format)).toBe(true);
    }
    expect(isInputFormat('bmp')).toBe(false);
    expect(isInputFormat('gif')).toBe(true);
  });

  it('should recognise output formats and exclude gif', () => {
    for (const format of OUTPUT_FORMATS) {
      expect(isOutputFormat(format)).toBe(true);
    }
    expect(isOutputFormat('gif')).toBe(false);
  });

  it('should recognise the picker values', () => {
    expect(isOutputFormatChoice('original')).toBe(true);
    for (const format of OUTPUT_FORMATS) {
      expect(isOutputFormatChoice(format)).toBe(true);
    }
    expect(isOutputFormatChoice('gif')).toBe(false);
    expect(isOutputFormatChoice(undefined)).toBe(false);
  });
});

describe('agreement with the bundled libvips build', () => {
  it('should only list input formats sharp can actually decode', () => {
    for (const format of INPUT_FORMATS) {
      const entry = (sharp.format as Record<string, any>)[SHARP_ID[format]];
      expect(entry).toBeDefined();
      expect(entry.input?.file).toBe(true);
    }
  });

  it('should only list output formats sharp can actually encode', () => {
    for (const format of OUTPUT_FORMATS) {
      const entry = (sharp.format as Record<string, any>)[SHARP_ID[format]];
      expect(entry).toBeDefined();
      expect(entry.output?.file).toBe(true);
    }
  });

  it('should not claim to encode gif', () => {
    expect((sharp.format as any).gif.output?.file).toBe(true); // libvips can…
    expect(OUTPUT_FORMATS as readonly string[]).not.toContain('gif'); // …we still don't
  });
});

describe('OutputFormat typing sanity', () => {
  it('should keep the exported unions assignable to plain strings', () => {
    const asInput: InputFormat[] = [...INPUT_FORMATS];
    const asOutput: OutputFormat[] = [...OUTPUT_FORMATS];
    expect(asInput.every((format) => typeof format === 'string')).toBe(true);
    expect(asOutput.every((format) => typeof format === 'string')).toBe(true);
  });
});
