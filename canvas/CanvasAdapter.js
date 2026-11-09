/** Shared browser/Node canvas contract. Adapters provide native canvas creation. */
export class CanvasAdapter {
  constructor({ width = 16, height = 16, options = {} } = {}) {
    this.width = CanvasAdapter.dimension(width, 'width');
    this.height = CanvasAdapter.dimension(height, 'height');
    this.contextOptions = options;
    this.canvas = null;
    this.context = null;
    this.lastbuffer = null;
  }

  static dimension(value, name) {
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      throw new RangeError(`${name} must be an integer between 1 and 65535`);
    }
    return value;
  }

  get size() { return { width: this.width, height: this.height }; }
  get ctx() { return this.context; }

  clear() {
    if (!this.context) return;
    this.context.clearRect(0, 0, this.width, this.height);
    this.lastbuffer = null;
  }

  resize(width = this.width, height = this.height) {
    const nextWidth = CanvasAdapter.dimension(width, 'width');
    const nextHeight = CanvasAdapter.dimension(height, 'height');
    if (nextWidth === this.width && nextHeight === this.height) return;
    this.width = nextWidth;
    this.height = nextHeight;
    if (this.canvas) {
      // Native canvas resizing clears its contents and resets context state.
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
      this.context = this.canvas.getContext('2d', this.contextOptions);
      if (!this.context) throw new Error('2D canvas context is unavailable after resize');
    }
    this.lastbuffer = null;
  }

  /** Used by textToBitmaps: create a temporary native canvas in either runtime. */
  createScratchCanvas(_width, _height) {
    throw new Error('createScratchCanvas() must be implemented by the adapter');
  }

  async toBuffer(_format = 'image/png') {
    throw new Error('toBuffer() must be implemented by the adapter');
  }
}
