# CanvasAdapter - Web et Node.js

`CanvasAdapter` est un contrat commun de rendu 2D. `WebCanvasAdapter` crée un Canvas HTML (ou `OffscreenCanvas`), et `NodeCanvasAdapter` utilise le package natif `canvas`. Leur API publique est identique :

- `canvas`, `ctx`, `context`, `size`, `width`, `height`, `lastbuffer`
- `clear()` : efface l'image via `clearRect`
- `resize(width, height)` : valide les dimensions, change le Canvas et réacquiert le contexte
- `createScratchCanvas(width, height)` : Canvas auxiliaire, notamment pour les glyphes texte
- `await toBuffer(format='image/png')` : retourne les octets `Uint8Array`, mis en cache dans `lastbuffer`

Un redimensionnement efface le contenu du Canvas, conformément au comportement natif. L'encodage Web accepte `convertToBlob()` et `toBlob()` ; un Blob `null` déclenche une erreur et non une Promise bloquée. L'encodeur Node retourne une copie `Uint8Array` du Buffer natif. Une dépendance native `canvas` est requise pour Node hors tests.

## Exemple commun

```js
const { ctx } = matrix.canvas;
ctx.fillStyle = '#00ff00';
ctx.fillRect(0, 0, matrix.canvas.width, matrix.canvas.height);
const bytes = await matrix.canvas.toBuffer();
await matrix.sendImage(bytes, { slotIndex: 12 });
```


## Initialisation

Navigateur : `new iPixelColor()` crée automatiquement `WebCanvasAdapter` si le DOM ou OffscreenCanvas existe.

Node : utiliser `createNodeMatrix()` depuis `node.js`, ou injecter `new NodeCanvasAdapter()` dans `new iPixelColor({ canvasadapter })`. La création sans Canvas en Node est autorisée pour les seules commandes BLE, mais l'encodage et `textToBitmaps()` nécessitent l'adapter.

`getDeviceInfo()` et les notifications firmware de 9 octets règlent les dimensions du Canvas pour les types connus (`1 → 16×16`, `3 → 32×32`, `4 → 64×64`) ; aucune supposition n'est faite pour les types inconnus.

Les tests utilisent des faux Canvas. Le rendu des polices et leur conformité binaire doivent encore être confirmés sur matériel réel.
