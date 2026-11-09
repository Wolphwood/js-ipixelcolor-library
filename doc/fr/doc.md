# API iPixelColor

```js
import { iPixelColor } from '../../iPixelColor.js';
const matrix = new iPixelColor({ bluetoothadapter, canvasadapter });
```

Les options `bluetoothadapter` et `canvasadapter`, les propriétés `ble`, `canvas`, `width`, `height`, ainsi que les interfaces des adaptateurs sont conservées depuis iDotMatrix. Les options `bluetooth` et `canvas` sont refusées pour éviter une injection silencieusement ignorée.

## Construction et connexion

| Option | Défaut | Sens |
| --- | --- | --- |
| `width`, `height` | 16, 16 | Dimensions avant détection |
| `screenType` | aucun | Type filaire IPC connu ; applique dimensions, bloc et profil texte |
| `fragmentSize` | 20 | Maximum demandé, entier 1–509 ; limité au MTU réel moins 3, ou 20 si inconnu |
| `ackTimeoutMs` | 5000 | Attente d’un ACK applicatif |
| `blockSize` | 4096 | 4096 ou 12288, ajusté par les réponses type/MCU |
| `passwordLength` | 6 | 4 pour les variantes spécifiées dans le protocole |
| `language` | 0 | Octet langue des commandes heure/canal |
| `clockVariant` | `standard` | `standard`, `week`, `mecha` selon CID/PID |
| `throwErrors` | true | Convention source conservée ; les erreurs de transport/transfert rejettent toujours |

`connect(deviceId?)` connecte et active les notifications. Dans le navigateur, l’absence de cible ouvre le sélecteur. `disconnect()` arrête les notifications et interdit la reconnexion implicite jusqu’au prochain `connect()`.

`requestDeviceInfo({ timeoutMs? })` synchronise l’heure, attend la réponse `01 80`, met à jour dimensions, type interne et taille des blocs. `getDeviceInfo()` retourne les informations actuellement connues, sans commande distante ni hypothèse sur les descripteurs iDotMatrix. `requestHardwareInfo()` envoie `04 00 05 80` ; la réponse arrive par événement `hardwareInfo` et met à jour `mcuVersion`.

## Commandes

| Méthode | Paramètres et comportement |
| --- | --- |
| `screenOn()`, `screenOff()` | Marche/arrêt |
| `setBrightness(level)` | 5–100, bornes conservées de l’API source |
| `setImageMode(mode = 1)` | 0 quitter sans sauvegarder, 1 entrer/effacer, 2 quitter/garder, 3 entrer/conserver |
| `setPixel(x, y, r, g, b)` | RGB puis coordonnées, coordonnées dans le panneau et ≤255 |
| `clearPixel(x, y)` | Pixel noir |
| `setFullscreenColor(r, g, b)` | Dessin par lignes, à utiliser en mode DIY ; largeur/hauteur ≤256 |
| `setScoreboard(score1, score2)` | Deux scores 0–999 |
| `setChronograph(mode = 0)` | 0 reset, 1 démarrer, 2 pause, 3 reprendre |
| `setCountdown(mode, minutes, seconds)` | Opcode IPC `0D 80` ; mêmes modes, minutes 0–255, secondes 0–59 |
| `chronograph` | Raccourcis `set`, `reset`, `stop`, `start`, `pause`, `resume` |
| `countdown` | Raccourcis `disable`, `stop`, `reset`, `start(minutes, seconds)`, `pause`, `resume` |
| `setClockTime(date = new Date())` | Variante sélectionnée à la construction |
| `setClockStyle(style, visibleDate, hour24, r, g, b)` | Style/date/calendrier IPC ; RGB conservés dans la signature mais ignorés, aucun champ couleur IPC établi |
| `setWeek(week)` | Lundi=1 à dimanche=7 |
| `flipScreen(enabled)` | Orientation 0/1, comportement dépendant du modèle |
| `setPassword(pin)`, `resetPassword(pin)`, `verifyPassword(pin)` | Paires de chiffres décimales, 4 ou 6 chiffres selon option |
| `sendImageRythm(animIndex, frame)` | Deux octets rythme simple ; plages source conservées, modes firmware à confirmer |
| `sendCustomRythm(style, rawHeights)` | 11 valeurs d’entrée 0–255, conversion `max(1,floor(v*15/255))`, valeurs absentes zéro |
| `sendRythmSimulation(mode, intensity)` | Simulation locale utilisant les trames IPC, orthographe source `Rythm` conservée |
| `stopMusicRythm()` | Envoie un rythme simple zéro ; effet d’arrêt à confirmer sur matériel |
| `setTextSpeed(speed)` | Octet vitesse texte |
| `setChannel(slotIndex, language?)` | Sélection d’un canal stocké |
| `deleteChannels(indices)` | Suppression d’une liste de canaux |
| `setTiming(enabled, num, week, hour, minute)` | Programmation horaire, week est un masque firmware |
| `exitMode()` | Quitter le mode courant |
| `deleteDeviceData()` | Effacer les données ; aucun redémarrage démontré |

Les méthodes de commandes simples attendent les écritures ATT et ne garantissent pas l’acceptation applicative. L’API conserve les bornes et conventions source lorsqu’elles sont compatibles ; ce ne sont pas des preuves de plages acceptées par tous les firmwares.

## Contenus et événements

`sendImage(buffer, { slotIndex = 101 })`, `sendGif(buffer, { slotIndex = 101 })`, `sendDIYImage(buffer)` : voir [transferts](sdk-transfers.md).

`textToBitmaps(text, targetHeight = 32, fontConfig = 'bold 22px sans-serif')` : tags IPC pour glyphes 8×16, 16×32 ou 32×64, bit de poids faible en premier. La hauteur doit tenir dans le panneau. `Array.from(text).length` donne le nombre d’éléments générés, sans promesse de rendu Android pour les scripts complexes ou emoji.

`sendText(textBitmaps, numChars, textMode = 1, speed = 95, textColorMode = 1, textColor = [255,0,0], textBgMode = 0, textBgColor = [0,0,0], slotIndex = 101)` conserve l’ordre des paramètres source. En-tête de contenu de 14 octets ou 17 selon le profil interne, champs bordure à zéro. Taille strictement inférieure à 102400 octets.

`send(payload, delayMs = 8)` permet l’envoi brut sérialisé d’une trame complète. `on(name, callback)` renvoie une fonction de désabonnement ; `off(name, callback)` désabonne aussi. Événements : `connected`, `disconnected`, `notification`, `response`, `deviceInfo`, `hardwareInfo`, `passwordRequired`, `timeAck`, `passwordOrDrawingResponse`, `protocolError`. Une notification consommée par le transfert reste observable via `notification`.

Les raccourcis audio conservent la file source : une trame en attente remplace la précédente ; ils ne sont pas une file d’envoi garantie pour chaque échantillon. Les erreurs audio sont journalisées.

## Méthodes sans équivalent établi

`setEffect`, `setMicType`, `setTimeIndicator`, `freezeScreen`, `readScreenLight`, `askStatus`, `setEcoMode`, `sendJoint` rejettent explicitement avec une erreur. Les opcodes iDotMatrix correspondants ne sont pas réutilisés sans preuve IPC.
