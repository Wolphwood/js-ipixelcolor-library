# Recherche iPixelColor et limites

L’implémentation repose sur les analyses locales des APK iPixelColor 3.7.8, package `com.wifiled.ipixels`, versionCode 380. Les sources et preuves restent dans `../analysis/` ; la [spécification](docs/PROTOCOLE.md) expose les références Java/Smali. Les adaptateurs et la classe sont adaptés de [Wolphwood/js-idotmatrix-library](https://github.com/Wolphwood/js-idotmatrix-library), avec conservation de sa licence et indication des modifications dans le README.

| Point | Établi / implémenté | Limite |
| --- | --- | --- |
| BLE | FA/FA02, fragmentation, écritures ATT, découverte NOTIFY/INDICATE | UUID effectif et services additionnels selon modèle à relever |
| Média | En-têtes IPC, CRC global, 4096/12288, aperçu 101, ACK | Formats image à sélectionner selon producteur/panneau, aucun écran testé |
| Réponses | Types, matériel, ACK contextualisés, réassemblage | ACK tardifs sans identifiant de transaction, absence de capture HCI |
| Panneaux | Types filaires 00/80–A0 et MCU 2 | Variantes CID/PID à configurer manuellement (PIN, horloge) ; mapping Mecha 21–23 non déduit automatiquement |
| Texte | Tags 0/2/6 du rasteriseur, masques LSB, en-tête 14/17 | Typographie Android, langues complexes, emoji, glyphes variables et effets à valider |
| Dessin | Pixels, remplissage par lignes | Coordonnées sur un octet, utiliser un autre chemin image au-delà de 256 |
| Commandes source sans équivalent | Méthodes présentes et rejet explicite | Aucun opcode supposé pour effet, micro, indicateur heure, freeze, timeout, statut, éco, joint |
| Zones et alarmes avec image | Formats décrits dans la spécification | Pas d’API haut niveau ajoutée dans ce port de la classe source |
| Wi-Fi | Trames TCP décrites, FrameDecoder réutilisable | Aucun transport TCP/provisionnement fourni |
| OTA | Protocoles documentés séparément | Aucun flasheur ; authentification native JieLi non résolue |

Les tests contrôlent les octets fixes du protocole, le CRC32 standard, les limites de bloc, les réponses, la sérialisation, les échecs de transfert, les adaptateurs injectés et les glyphes. Ces tests ne démontrent pas l’acceptation des commandes par les firmwares. Le registre conserve explicitement les différences entre analyse statique, implémentation et validation matérielle.
