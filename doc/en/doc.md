# iPixelColor API

This JavaScript ES module adapts the local iDotMatrix library to the protocol recovered from iPixelColor 3.7.8. Import `iPixelColor` from `iPixelColor.js`, or `createNodeMatrix` from `node.js`. The BLE and Canvas adapter names, injection options (`bluetoothadapter`, `canvasadapter`), public signatures and event interface are retained.

See the [French API reference](../fr/doc.md) for the complete method and option tables, [migration details](../fr/sdk-transfers.md), and [research limits](../../RESEARCH.md).

Preview channel is 101. Media headers are 15 bytes and have no duration field. `sendImage(bytes, { slotIndex })` requires bytes already encoded for the panel; RGB888 and PNG are model-dependent paths. `sendGif` transfers GIF bytes. `sendText` transfers rasterized glyphs, not UTF-8. `textToBitmaps` uses the injected Canvas implementation.

`requestDeviceInfo()` synchronizes time and learns the wire screen type; `requestHardwareInfo()` updates hardware versions through the `hardwareInfo` event. Unknown MTU means a safe 20-byte ATT payload. Notifications are discovered by properties rather than assuming FA03.

Media uploads wait for application ACKs: 1 continues, 3 completes, 0/2 fail. No automatic retries are performed. Explicit disconnect aborts uploads and disables implicit reconnection.

The iDotMatrix methods `setEffect`, `setMicType`, `setTimeIndicator`, `freezeScreen`, `readScreenLight`, `askStatus`, `setEcoMode`, `sendJoint` reject because no IPC equivalent was established. Clock RGB arguments are retained but ignored: the recovered IPC clock command has no RGB fields. Audio bins use eleven inputs in the range 0–255.

No physical hardware validation has been performed. Run `npm test` and `npm run check` for offline checks.
