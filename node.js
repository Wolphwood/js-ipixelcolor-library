/** Node.js entrypoint: connects the Node BLE and Canvas adapters to the same SDK. */
import { iPixelColor } from './iPixelColor.js';
import { NodeWebBluetoothAdapter } from './bluetooth/NodeWebBluetoothAdapter.js';
import { NodeCanvasAdapter } from './canvas/NodeCanvasAdapter.js';

export { iPixelColor, NodeWebBluetoothAdapter, NodeCanvasAdapter };

export function createNodeMatrix({ bluetoothadapter, canvasadapter, bluetoothOptions = {}, canvasOptions = {}, ...options } = {}) {
  const ble = bluetoothadapter ?? new NodeWebBluetoothAdapter(bluetoothOptions);
  const canvas = canvasadapter ?? new NodeCanvasAdapter({
    width: options.width ?? 16, height: options.height ?? 16, ...canvasOptions,
  });
  return new iPixelColor({ ...options, bluetoothadapter: ble, canvasadapter: canvas });
}
