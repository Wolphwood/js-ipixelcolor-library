import { GattAdapter } from './GattAdapter.js';

/** Node transport. The optional webbluetooth module is imported only on first scan. */
export class NodeWebBluetoothAdapter extends GattAdapter {
  constructor(options = {}) {
    super(options);
    this.bluetoothFactory = options.bluetoothFactory ?? null;
  }

  async scan({ duration = 4000, prefix = '', suffix = '', contains = 'LED_BLE', firstOnly = false } = {}) {
    if (!Number.isFinite(duration) || duration < 0) throw new RangeError('duration must be >= 0');
    if (!this.bluetoothFactory) {
      const { Bluetooth } = await import('webbluetooth');
      this.bluetoothFactory = settings => new Bluetooth(settings);
    }
    this.devices.id.clear();
    this.devices.name.clear();
    let resolveMatch;
    let finished = false;
    const firstMatch = new Promise(resolve => { resolveMatch = resolve; });
    const deviceFound = device => {
      if (finished) return false;
      const name = device.name ?? '';
      if (contains && !name.includes(contains)) return false;
      if ((prefix && !name.startsWith(prefix)) || (suffix && !name.endsWith(suffix))) return false;
      this._cacheDevice(device);
      if (firstOnly) resolveMatch();
      return firstOnly;
    };
    const engine = this.bluetoothFactory({ deviceFound, scanTime: Math.max(1, Math.ceil(duration / 1000)) });
    // Keep any pending provider rejection handled, even when scanning is canceled.
    Promise.resolve().then(() => engine.requestDevice({ acceptAllDevices: true }))
      .then(device => { if (device) deviceFound(device); })
      .catch(() => {});
    let timer;
    const deadline = new Promise(resolve => { timer = setTimeout(resolve, duration); });
    try {
      if (firstOnly) await Promise.race([firstMatch, deadline]);
      else await deadline;
    } finally {
      finished = true;
      clearTimeout(timer);
      try { engine.cancelScan?.(); } catch {}
    }
    return [...this.devices.id.values()];
  }

  async connect(target = this.device, options = {}) {
    let device = this._findDevice(target);
    if (!device) {
      await this.scan(options);
      device = this._findDevice(target);
    }
    if (!device) throw new Error(`BLE device not found: ${String(target)}`);
    return this._connectDevice(device, options);
  }
}
