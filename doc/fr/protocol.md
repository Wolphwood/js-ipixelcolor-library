# Protocole iPixelColor

La [spécification issue des APK](../../docs/PROTOCOLE.md) décrit les commandes, champs, CRC, glyphes, panneaux, zones, alarmes et protocoles OTA. Le SDK implémente les fonctions listées dans [l’API](doc.md), pas l’intégralité des chemins de l’application Android.

Les encodeurs purs sont dans `protocol/frames.js` : `encodeMediaBlocks`, `encodeDIYBlocks`, `crc32`, `getPanelProfile`, `decodeNotification`, `FrameDecoder`. Les identifiants publics des encodeurs restent GIF=1, image=2, texte=3 ; ils sont traduits vers les opcodes IPC. Les opcodes des notifications décodées sont des entiers little endian.
