# iPixelColor & Protocol Control

Bibliothèque JavaScript ES modules pour contrôler les écrans de l’application **iPixelColor** dans le navigateur et sous Node.js.

Adaptation de [Wolphwood/js-idotmatrix-library](https://github.com/Wolphwood/js-idotmatrix-library), sous [CC BY-SA 4.0](LICENSE.md). La structure, les noms des adaptateurs, les signatures communes, les champs privés, les événements et les conventions de code sont repris de cette bibliothèque. Les trames et les réponses sont adaptées aux analyses locales d’iPixelColor 3.7.8.

```text
iPixelColor.js
node.js
bluetooth/
  GattAdapter.js
  WebBluetoothAdapter.js
  NodeWebBluetoothAdapter.js
canvas/
  CanvasAdapter.js
  WebCanvasAdapter.js
  NodeCanvasAdapter.js
protocol/
  frames.js
```

## Navigateur

```js
import { iPixelColor } from './iPixelColor.js';

const matrix = new iPixelColor();
connectButton.addEventListener('click', async () => {
  await matrix.connect();
  await matrix.requestDeviceInfo();
  await matrix.screenOn();
  await matrix.setBrightness(50);
  await matrix.setImageMode(1);
  await matrix.setPixel(2, 3, 255, 0, 0);
});
```

Web Bluetooth nécessite un contexte sécurisé et un geste utilisateur. Le sélecteur affiche tous les périphériques : choisir celui dont le nom contient `LED_BLE`. Un filtre de préfixe ne reproduirait pas la recherche par sous-chaîne de l’app. [Exemple complet](examples/browser.html).

## Node.js

```js
import { createNodeMatrix } from './node.js';

const matrix = createNodeMatrix();
const devices = await matrix.ble.scan({ duration: 4000 });
if (!devices.length) throw new Error('Aucun écran iPixelColor trouvé');
await matrix.connect(devices[0].id);
await matrix.requestDeviceInfo();
await matrix.setBrightness(50);
await matrix.disconnect();
```

`npm install` installe `webbluetooth` et `canvas`. Le scan Node filtre par sous-chaîne `LED_BLE` par défaut ; `contains: ''` désactive ce filtre. Pour BLE seul, injecter `new NodeWebBluetoothAdapter()` dans `new iPixelColor({ bluetoothadapter })` : Canvas n’est pas obligatoire. Les dépendances natives sont chargées à l’utilisation.

## Images, GIF et texte

```js
await matrix.sendImage(imageBytes, { slotIndex: 101 }); // aperçu
await matrix.sendGif(gifBytes, { slotIndex: 1 });       // canal stocké
const text = 'Bonjour';
const glyphs = matrix.textToBitmaps(text, 16, 'bold 14px sans-serif');
await matrix.sendText(glyphs, Array.from(text).length);
```

Les images sont des octets **déjà encodés pour le panneau** : RGB888, PNG ou autre chemin établi pour le modèle. Le SDK ne convertit pas automatiquement le format d’après les dimensions. `matrix.canvas.ctx` et `await matrix.canvas.toBuffer('image/png')` conservent l’interface Canvas originale.

Les envois attendent les ACK applicatifs et renvoient `{ family, status, sentBlocks, totalBlocks, raw }`. Le canal d’aperçu IPC est **101**, les en-têtes média font **15 octets**, et IPC n’a pas de champ `durationValue`. Les options inconnues sont refusées.

## Documentation et validation

- [API française](doc/fr/doc.md), [English API](doc/en/doc.md).
- [BLE](doc/fr/ble.md), [Canvas](doc/fr/canvas.md), [transferts et migration](doc/fr/sdk-transfers.md).
- [Protocole reconstruit](docs/PROTOCOLE.md), [outils](docs/OUTILS.md), [OTA](docs/OTA.md).
- [Recherche et limites](RESEARCH.md).

```sh
npm test
npm run check
```

Les tests sont hors ligne et utilisent des adaptateurs simulés. Aucun résultat sur écran physique n’est revendiqué. Les méthodes iDotMatrix sans équivalent IPC établi lèvent une erreur explicite ; voir la documentation de migration.
