import { createRequire } from 'node:module';
import { CanvasAdapter } from './CanvasAdapter.js';

const require = createRequire(import.meta.url);

export class NodeCanvasAdapter extends CanvasAdapter {
  constructor(options = {}) {
    super(options);
    // Lazy native dependency so importing this class does not require canvas to be installed
    // when callers inject a compatible factory (e.g., tests).
    this.canvasFactory = options.canvasFactory ?? require('canvas').createCanvas;
    this.canvas = this.createScratchCanvas(this.width, this.height);
    this.context = this.canvas.getContext('2d', this.contextOptions);
    if (!this.context) throw new Error('2D canvas context unavailable');
  }

  createScratchCanvas(width, height) {
    CanvasAdapter.dimension(width, 'width');
    CanvasAdapter.dimension(height, 'height');
    const canvas = this.canvasFactory(width, height);
    if (!canvas) throw new Error('canvasFactory returned no canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  async toBuffer(format = 'image/png') {
    if (!this.canvas) throw new Error('No Node canvas');
    if (typeof this.canvas.toBuffer !== 'function') throw new Error('Node canvas does not support toBuffer');
    const result = await this.canvas.toBuffer(format);
    const bytes = new Uint8Array(result.buffer ? result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) : result);
    this.lastbuffer = bytes;
    return bytes;
  }
}
