import { GattAdapter } from './GattAdapter.js';

/** Browser Web Bluetooth implementation (requestDevice requires a user gesture). */
export class WebBluetoothAdapter extends GattAdapter {
  constructor(options = {}) {
    super(options);
    this.bluetooth = options.bluetooth ?? (typeof navigator !== 'undefined' ? navigator.bluetooth : null);
  }

  async scan({ prefix = '' } = {}) {
    if (!this.bluetooth?.requestDevice) throw new Error('Web Bluetooth API unavailable (use HTTPS and a supported browser)');
    const filters = prefix ? [{ namePrefix: prefix }] : undefined;
    const device = await this.bluetooth.requestDevice(filters
      ? { filters, optionalServices: [this.service_uuid] }
      : { acceptAllDevices: true, optionalServices: [this.service_uuid] });
    this._device = device;
    this._cacheDevice(device);
    return device;
  }

  async connect(target = this.device, options = {}) {
    const device = this._findDevice(target) ?? await this.scan(options);
    return this._connectDevice(device, options);
  }
}
