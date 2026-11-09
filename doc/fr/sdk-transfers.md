# Transferts et migration iDotMatrix → iPixelColor

| Élément | iDotMatrix source | iPixelColor |
| --- | --- | --- |
| Classe / fichier | `iDotMatrix` / `iDotMatrix.js` | `iPixelColor` / `iPixelColor.js` |
| Adaptateurs | BLE et Canvas injectables | Mêmes noms, contrats et fichiers |
| Canal d’aperçu | 12 | 101 |
| En-tête média | 16 octets | 15 octets |
| GIF | `01 00` | `03 00`, format 2 |
| Texte | `03 00` | `00 01`, format 0 |
| Image | `02 00` | `02 00`, format 0 |
| Durée média | `durationValue` | Absente, option refusée |
| Blocs | 4096 | 4096 ou 12288 selon type/MCU |
| DIY direct | 9 octets | 9 octets, réponse `00 80` |
| Spectre audio | 32 hauteurs compactées | 11 valeurs converties depuis 0–255 |
| Notification GATT | FA03 par défaut | Découverte par propriétés ; UUID explicite possible |

Le CRC32 et la longueur totale du contenu sont répétés dans chaque bloc média. L’enveloppe directe DIY ne comporte ni CRC ni canal. Elle sert aux chemins caméra/undo/image directe : ce n’est pas un remplacement universel de `sendImage`.

Les commandes et les transferts sont sérialisés sur la même file. Chaque bloc attend son ACK avant le suivant ; statut 1 poursuit, 3 termine, 0 et 2 échouent. Le statut 3 avant le dernier bloc est rejeté. Un statut 1 sur le dernier bloc nécessite un ACK terminal séparé ; un timeout rejette l’opération. Un ACK d’un autre type de contenu est ignoré. Le manque d’espace `00 00 / 02` provoque un échec quel que soit le contenu actif.

Aucun retry automatique d’un bloc : le protocole ne porte pas d’index de bloc pour ces contenus et la réception après un timeout est incertaine. Les ACK n’ont pas d’identifiant de transaction ; un ACK tardif du même type ne peut pas être distingué avec certitude d’un ACK courant. Après un timeout, reconnecter et rétablir l’état du panneau avant un nouvel essai.

Les écritures demandent une réponse ATT quand l’adaptateur le permet. La taille de fragment réelle est `min(fragmentSize, MTU-3, 509)`, limitée à 20 lorsque le MTU n’est pas exposé. Web Bluetooth ne fournit pas le MTU négocié. Un adaptateur existant ne proposant que `writeWithoutResponse` reste utilisable.
