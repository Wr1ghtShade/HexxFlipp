# 🐬 HexxFlipp

> 🐬 Le compagnon offline de ton Flipper Zero — 🔬 édition hex, décodage Mifare, comparaison diff. Multi-format (NFC, iButton, RFID, IR, BadUSB, Sub-GHz), single-file HTML.

Une web-app autonome qui transforme tes dumps Flipper en données lisibles, éditables et comparables — directement dans ton navigateur, sans serveur, sans réseau.

---

## 📸 Aperçu

### ⚡ Cyberpunk (défaut)
![Thème Cyberpunk](docs/hexxflip-cyber.png)

### 🌙 Dracula
![Thème Dracula](docs/hexxflipp-dracula.png)

### 🌑 Dark (sobre)
![Thème Dark](docs/hexxflipp-dark.png)

### ☀️ Light (clair)
![Thème Light](docs/hexxflip-light.png)

---

## ✨ Fonctionnalités

- 📡 **NFC** — Décodage Mifare Classic 1K/4K, NTAG/Ultralight, DESFire (UID, clés A/B, bits d'accès C1/C2/C3, secteurs)
- 🔑 **iButton** — Dallas ROM/SRAM/EEPROM, Cyfral, Metakom, calcul CRC-8, parsing 1WFS
- 🆔 **LF RFID** — EM4100, H10301, décodage Wiegand 26
- 📟 **Infrarouge** — Télécommande virtuelle, signaux Parsed & Raw
- 💻 **BadUSB** — Éditeur Duckyscript avec validateur syntaxique
- 📻 **Sub-GHz** — Visualisation impulsions RAW, presets, fréquences
- 🔀 **Mode diff** — Comparaison A/B côte à côte avec surlignage des différences
- ↩️ **Undo / redo** (50 étapes), recherche hex/ASCII, pagination
- 🎨 **4 thèmes** — Cyberpunk, Dracula, Dark, Clair
- 📦 **Single-file** — `dist/index.html` autonome, ouvrable en double-clic, **100% offline**

---

## 🚀 Installation rapide

```bash
git clone https://github.com/Wr1ghtShade/HexxFlipp.git
cd HexxFlipp
bash build.sh
```

→ Ouvre `dist/index.html` dans ton navigateur (ou double-clic depuis l'explorateur de fichiers).

**Prérequis** : Node.js ≥ 20 et npm. Sur Raspberry Pi : `sudo apt install nodejs npm`.

---

## 🛠 Développement

```bash
npm install
npm run dev     # serveur Vite avec HMR sur http://localhost:5173
npm run build   # bundle single-file → dist/index.html
npm run lint    # ESLint strict (TypeScript)
```

---

## 🏗 Architecture

```
src/
├── App.tsx                  # Composant racine (orchestration)
├── main.tsx                 # Point d'entrée React
├── types.ts                 # Types TypeScript partagés
│
├── hooks/
│   ├── useTheme.ts          # Persistence du thème
│   └── useHistory.ts        # Undo/redo (mode full + diff binaire)
│
├── io/
│   ├── fileLoader.ts        # Lecture fichier + détection type
│   ├── fileSaver.ts         # Téléchargement Blob
│   ├── modeConverter.ts     # Bascule Hex Brut ↔ Analyseur
│   ├── fileTypeDetector.ts  # Détection extension/contenu
│   └── limits.ts            # MAX_FILE_SIZE (100 Mo)
│
├── utils/
│   ├── nfcParser.ts         # Parser Mifare Classic + décodeur secteurs
│   ├── flipperParsers.ts    # iButton, RFID, IR, Sub-GHz, 1WFS
│   └── deepClone.ts         # Helpers de clonage des cartes
│
└── components/
    ├── AppHeader.tsx        # En-tête + actions
    ├── DropZone.tsx         # Zone de dépose initiale
    ├── StatusBar.tsx        # Barre d'état
    ├── KeysModal.tsx        # Modal clés A/B
    ├── FileNameModal.tsx    # Modal sauvegarde
    ├── CompareLayout.tsx    # Layout mode diff
    ├── HexGrid.tsx          # Grille hex éditable
    ├── NfcSidebar.tsx       # Panneau secteurs NFC
    ├── StatsPanel.tsx       # Statistiques & entropie
    ├── IButtonSidebar.tsx   # Panneau iButton
    ├── RfidSidebar.tsx      # Panneau RFID
    ├── IrRemoteConsole.tsx  # Console télécommande IR
    ├── BadUsbEditor.tsx     # Éditeur Duckyscript
    └── SubGhzConsole.tsx    # Console Sub-GHz
```

---

## 🛡 Sécurité

- **100% client-side** : aucun appel réseau, aucune télémétrie, aucun serveur
- Pas de `eval`, pas de `dangerouslySetInnerHTML` — surface XSS nulle
- `npm audit` : 0 vulnérabilité
- Validation stricte des saisies hex
- Borne de taille fichier : 100 Mo max

---

## 🧰 Stack

- ⚡ **Vite 8** + **vite-plugin-singlefile** (bundle HTML autonome)
- ⚛️ **React 19** + **TypeScript 6**
- 🎨 **Lucide React** (icônes)
- ✅ **ESLint** strict (TypeScript + React Hooks)

---

## ⚠️ Disclaimer

Outil de **lecture/analyse** de dumps légitimement obtenus depuis votre propre Flipper Zero. L'utilisation pour cloner/dupliquer des cartes ou badges sans autorisation peut être illégale dans votre juridiction.

---

## 📝 Licence

MIT
