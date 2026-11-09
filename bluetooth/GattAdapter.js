/** Cross-runtime BLE/GATT lifecycle, write and notification implementation. */
export class GattAdapter {
  constructor({ service = 0x00fa, write = 0xfa02, notify = null } = {}) {
    this.service_uuid = service;
    this.write_uuid = write;
    this.notify_uuid = notify;
    this.devices = { id: new Map(), name: new Map() };
    this.callbacks = new Map();
    this.disconnectCallbacks = new Set();
    this.nextCallbackId = 0;
    this._device = null;
    this._server = null;
    this._write = null;
    this._notify = null;
    this._notifyListening = false;
    this._notifyActive = false;
    this._disconnectSource = null;
    this._disconnectReported = false;
    this._boundDisconnected = () => {
      if (this._disconnectReported || !this._server) return;
      this._disconnectReported = true;
      this._clearGatt();
      for (const cb of this.disconnectCallbacks) {
        try { cb(); } catch (error) { console.error('[BLE] Disconnect callback error:', error); }
      }
    };
    this._boundValueChanged = event => {
      const data = event?.target?.value ?? event?.value;
      if (!data) return;
      const buffer = this._asBytes(data);
      for (const callback of this.callbacks.values()) {
        try { callback(buffer.slice()); } catch (error) { console.error('[BLE] Notification callback error:', error); }
      }
    };
  }

  get device() { return this._device; }
  get connected() { return Boolean(this._device?.gatt?.connected && this._server); }
  get attMtu() { return null; } // Not available through the supported WebBluetooth API.

  _asBytes(value) {
    if (value instanceof Uint8Array) return value.slice();
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    throw new TypeError('BLE notification/write data must be a byte buffer');
  }

  _cacheDevice(device) {
    if (!device) return;
    const item = { id: device.id, name: device.name || 'Unknown', raw: device };
    if (item.id) this.devices.id.set(item.id, item);
    if (item.name) this.devices.name.set(item.name, item);
    return item;
  }

  _findDevice(value) {
    if (value && typeof value === 'object') return value.raw ?? value;
    if (typeof value === 'string') return (this.devices.id.get(value) ?? this.devices.name.get(value))?.raw ?? null;
    return null;
  }

  _clearGatt() {
    if (this._notify && this._notifyListening) {
      this._notify.removeEventListener?.('characteristicvaluechanged', this._boundValueChanged);
    }
    this._notifyListening = false;
    this._notifyActive = false;
    this._notify = null;
    this._write = null;
    this._server = null;
  }

  async _connectDevice(device, { maxTries = 3, retryDelayMs = 600 } = {}) {
    if (!device?.gatt) throw new Error('Selected device has no GATT interface');
    if (!Number.isInteger(maxTries) || maxTries < 1) throw new RangeError('maxTries must be positive');
    if (this.connected && this._device === device) return this._server;
    if (this._device && this._device !== device) await this.disconnect();
    this._device = device;
    this._cacheDevice(device);
    if (this._disconnectSource !== device) {
      this._disconnectSource?.removeEventListener?.('gattserverdisconnected', this._boundDisconnected);
      device.addEventListener?.('gattserverdisconnected', this._boundDisconnected);
      this._disconnectSource = device;
    }
    let lastError;
    for (let attempt = 0; attempt < maxTries; attempt++) {
      try {
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(this.service_uuid);
        const write = await service.getCharacteristic(this.write_uuid);
        let notify;
        try {
          if (this.notify_uuid == null) throw new Error('Discover notification characteristic by properties');
          notify = await service.getCharacteristic(this.notify_uuid);
        }
        catch (error) {
          // Under the expected service only; never guess if multiple notifiers exist.
          const characteristics = typeof service.getCharacteristics === 'function'
            ? await service.getCharacteristics() : [];
          const matches = characteristics.filter(c => c.properties?.notify || c.properties?.indicate);
          if (matches.length !== 1) throw error;
          notify = matches[0];
        }
        this._server = server;
        this._write = write;
        this._notify = notify;
        this._disconnectReported = false;
        return server;
      } catch (error) {
        lastError = error;
        this._clearGatt();
        try { device.gatt.disconnect?.(); } catch {}
        if (attempt + 1 < maxTries && retryDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }
    }
    throw new Error(`BLE connection failed after ${maxTries} attempt(s): ${lastError?.message ?? lastError}`, { cause: lastError });
  }

  async disconnect() {
    const device = this._device;
    const wasConnected = this.connected;
    try { await this.stopNotifications(); }
    finally {
      this._clearGatt();
      if (device?.gatt?.connected) await device.gatt.disconnect?.();
    }
    if (wasConnected && !this._disconnectReported) {
      // Browser events may be asynchronous; notify only once on explicit disconnect.
      this._disconnectReported = true;
      for (const callback of this.disconnectCallbacks) {
        try { callback(); } catch (error) { console.error('[BLE] Disconnect callback error:', error); }
      }
    }
    // Preserve paired device for explicit reconnect, but detach listener until reconnect.
    this._disconnectSource?.removeEventListener?.('gattserverdisconnected', this._boundDisconnected);
    this._disconnectSource = null;
  }

  onDisconnect(callback) {
    if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
    this.disconnectCallbacks.add(callback);
    return () => this.disconnectCallbacks.delete(callback);
  }

  registerNotificationCallback(callback) {
    if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
    for (const [id, existing] of this.callbacks) if (existing === callback) return id;
    const id = this.nextCallbackId++;
    this.callbacks.set(id, callback);
    return id;
  }

  unregisterNotificationCallback(id = -1) {
    if (id === -1) this.callbacks.clear();
    else this.callbacks.delete(id);
  }

  async startNotifications(callback) {
    if (callback) this.registerNotificationCallback(callback);
    if (!this._notify) throw new Error('BLE notification characteristic is unavailable; connect first');
    if (!this._notifyListening) {
      this._notify.addEventListener?.('characteristicvaluechanged', this._boundValueChanged);
      this._notifyListening = true;
    }
    if (!this._notifyActive) {
      try { await this._notify.startNotifications(); this._notifyActive = true; }
      catch (error) {
        this._notify.removeEventListener?.('characteristicvaluechanged', this._boundValueChanged);
        this._notifyListening = false;
        throw error;
      }
    }
  }

  async stopNotifications() {
    const notify = this._notify;
    this.callbacks.clear();
    if (notify && this._notifyListening) notify.removeEventListener?.('characteristicvaluechanged', this._boundValueChanged);
    this._notifyListening = false;
    if (notify && this._notifyActive && typeof notify.stopNotifications === 'function') await notify.stopNotifications();
    this._notifyActive = false;
  }

  async writeWithResponse(data) {
    if (!this.connected || !this._write) throw new Error('BLE write attempted while disconnected');
    const bytes = this._asBytes(data);
    if (typeof this._write.writeValueWithResponse === 'function' && this._write.properties?.write !== false) {
      await this._write.writeValueWithResponse(bytes);
    } else if (typeof this._write.writeValue === 'function') {
      await this._write.writeValue(bytes);
    } else if (this._write.properties?.writeWithoutResponse && typeof this._write.writeValueWithoutResponse === 'function') {
      await this._write.writeValueWithoutResponse(bytes);
    } else throw new Error('BLE characteristic does not support writing');
  }

  async writeWithoutResponse(data) {
    if (!this.connected || !this._write) throw new Error('BLE write attempted while disconnected');
    const bytes = this._asBytes(data);
    if (typeof this._write.writeValueWithoutResponse === 'function') {
      await this._write.writeValueWithoutResponse(bytes);
    } else if (typeof this._write.writeValue === 'function') {
      await this._write.writeValue(bytes); // Compatibility fallback: confirmed GATT write, not firmware success.
    } else throw new Error('BLE characteristic does not support writing');
  }

  async readDescriptor(uuid = 0x2901) {
    if (!this.connected || !this._write) throw new Error('BLE descriptor read attempted while disconnected');
    const desc = await this._write.getDescriptor(uuid);
    const value = await desc.readValue();
    return this._asBytes(value);
  }
}
