# Adaptateurs BLE

`GattAdapter`, `WebBluetoothAdapter`, `NodeWebBluetoothAdapter` reprennent les interfaces de la bibliothèque source : `scan`, `connect`, `disconnect`, `connected`, `device`, `devices`, `attMtu`, `startNotifications`, `stopNotifications`, `registerNotificationCallback`, `unregisterNotificationCallback`, `onDisconnect`, `writeWithoutResponse`, `readDescriptor`.

IPC ajoute `writeWithResponse`, utilisé en priorité par le SDK. Service `0x00FA`, écriture `0xFA02`. Aucun UUID de notification n’est supposé : la découverte exige une caractéristique NOTIFY ou INDICATE unique dans le service contrôle. Si plusieurs existent, fournir `{ notify: uuid }` au constructeur de l’adaptateur. Les variantes nécessitant des notifications sur plusieurs services ne sont pas automatiquement configurées.

Le constructeur navigateur accepte `{ bluetooth, service, write, notify }`. `scan({ prefix = '' })` ouvre le sélecteur sans filtre par défaut pour permettre les noms contenant `LED_BLE` en milieu de chaîne. Le filtre fabricant Android n’est pas implémenté.

Le constructeur Node accepte les mêmes UUID et `bluetoothFactory` pour injection. `scan({ duration = 4000, prefix = '', suffix = '', contains = 'LED_BLE', firstOnly = false })` retourne des entrées `{ id, name, raw }`.

Les données de notification sont transmises sous forme de copies `Uint8Array`. Le SDK reconstitue les trames fragmentées ou concaténées par leur longueur LE16 et vide son tampon à la déconnexion. Les notifications doivent être des trames du protocole de contrôle IPC.
