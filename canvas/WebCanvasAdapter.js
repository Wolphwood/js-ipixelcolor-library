import { CanvasAdapter } from './CanvasAdapter.js';

export class WebCanvasAdapter extends CanvasAdapter {
  constructor(options = {}) {
    super(options);
    this.canvasFactory = options.canvasFactory ?? ((width, height) => {
      if (typeof document !== 'undefined') return document.createElement('canvas');
      if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
      throw new Error('Browser canvas API unavailable. Pass a canvas adapter for this environment.');
    });
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
    if (!this.canvas) throw new Error('No browser canvas');
    let blob;
    if (typeof this.canvas.convertToBlob === 'function') {
      blob = await this.canvas.convertToBlob({ type: format });
    } else if (typeof this.canvas.toBlob === 'function') {
      blob = await new Promise((resolve, reject) => {
        try {
          this.canvas.toBlob(value => value ? resolve(value) : reject(new Error('Canvas encoder returned null')), format);
        } catch (error) { reject(error); }
      });
    } else {
      throw new Error('Browser canvas does not support Blob encoding');
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    this.lastbuffer = bytes;
    return bytes;
  }
}
