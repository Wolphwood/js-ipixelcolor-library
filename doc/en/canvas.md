# CanvasAdapter - Browser and Node.js

`CanvasAdapter` defines a common 2D rendering contract. `WebCanvasAdapter` creates an HTML canvas (or OffscreenCanvas); `NodeCanvasAdapter` uses the native `canvas` package. Both expose `canvas`, `ctx`, `context`, `size`, `width`, `height`, `lastbuffer`, `clear()`, `resize(width,height)`, `createScratchCanvas(width,height)` and `await toBuffer(format='image/png')`.

`clear()` calls native `clearRect`. Resizing validates dimensions and reacquires the 2D context, but clears the image (native Canvas behavior). Web encoding supports `convertToBlob()` and `toBlob()` and rejects null results; Node encoding copies the returned native Buffer to a `Uint8Array`.

```js
matrix.canvas.ctx.fillStyle = '#00ff00';
matrix.canvas.ctx.fillRect(0, 0, matrix.canvas.width, matrix.canvas.height);
const png = await matrix.canvas.toBuffer();
await matrix.sendImage(png, { slotIndex: 12 });
```


In browsers, `new iPixelColor()` creates the Web canvas automatically. In Node.js use `createNodeMatrix()` from `node.js`, or inject `new NodeCanvasAdapter()` with `{ canvasadapter }`. Node SDK instances without a canvas can still send BLE commands, but encoding and `textToBitmaps()` require an adapter.

Known device types (`1 = 16×16`, `3 = 32×32`, `4 = 64×64`) synchronize the Canvas dimensions when reported by a firmware notification. Unknown types do not trigger speculative resizing.

Rendering has been tested with simulated canvases, not against real LED screens.
