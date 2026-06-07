# Changelog — HexxFlipp

Toutes les évolutions notables du projet.

---

## [1.0.10] — 2026-06-07
### 📸 Documentation
- Ajout de captures d'écran des 4 thèmes dans `docs/` (cyber, dracula, dark, light)
- Intégration des screenshots au `README.md`

---

## [1.0.09] — 2026-06-07
### 🎨 Nouveau thème
- **Thème Dark** ajouté (sobre, type GitHub/VSCode Dark) :
  - Palette grise neutre (bg `#0d1117`, accent bleu `#58a6ff`)
  - Pas de néons ni d'effets glow — alternative discrète à Cyberpunk
  - Icône `Eclipse` dans le sélecteur, positionnée entre Dracula et Light
- `useTheme` : type `Theme` étendu + validation par `Set<Theme>` au lieu d'un OR-chain

---

## [1.0.08] — 2026-06-07
### 🧹 Nettoyage
- Suppression de la mention "Antigravity" dans la barre d'état (footer)
- Footer simplifié : `HexxFlipp v{version}` (cohérent avec le nom du repo GitHub)

---

## [1.0.07] — 2026-06-07
### 🏗 Refactor majeur — architecture modulaire
- **`App.tsx` découpé de 1648 → 447 lignes** (-73 %), focus orchestration uniquement
- Extraction de 14 modules :
  - `hooks/useTheme.ts`, `hooks/useHistory.ts`
  - `io/fileLoader.ts`, `io/fileSaver.ts`, `io/modeConverter.ts`, `io/fileTypeDetector.ts`, `io/limits.ts`
  - `utils/deepClone.ts`
  - Composants : `AppHeader`, `DropZone`, `StatusBar`, `KeysModal`, `FileNameModal`, `CompareLayout`

### ⚡ Performance
- **Undo/redo diff incrémental en mode raw** — fini le clone Uint8Array complet à chaque édition (évite l'OOM sur gros fichiers binaires)
- **`KeysModal`** : `decodeSector` mémoïsé via `useMemo` (plus appelé à chaque re-render)
- **`prefetchConfig`-like** : détection unifiée du format Flipper (suppression de 6 magic-strings dupliquées)

### 🛡 Sécurité & robustesse
- **Borne de taille fichier** : 100 Mo max à l'ouverture (évite le freeze du tab sur drag d'un ISO 4 Go)
- **`FileReader.onerror` + `onabort`** : plus d'échec silencieux à la lecture
- **Validation hex stricte** dans `HexGrid.updateByteAt` (rejet explicite des entrées invalides)
- **`FileTooLargeError`** + `ModeConversionError` : erreurs typées avec messages clairs
- **`localStorage` try/catch** : compatible mode privé strict
- **ESLint** : passage de `recommended` à `strict` + `stylistic`

### ✨ UX
- **Modal de sauvegarde thématisé** (`FileNameModal`) — remplace les 5 `prompt()` natifs
- **Page d'accueil** : zone de dépose extraite en composant `DropZone` réutilisable
- **`index.html`** : suppression du redirect JS bricolé vers `dist/` (pollution historique navigation)

### 🔧 Sérialisation
- **IR file** : sérialisation préservante des commentaires utilisateur (rejoue `lines` au lieu de reconstruire from-scratch)

### 📦 Build & dev
- **`build.sh`** : script unique pour cloner → builder en une commande
- **`.gitignore`** strict : exclusion explicite des dumps Flipper réels (`*.nfc`, `*.ibtn`, `*.rfid`, `*.sub`, `*.ir`, `*.badusb`)

---

## [1.0.06] — Version initiale (avant refactor)
### Fonctionnalités principales
- 📡 **NFC** — Mifare Classic 1K/4K, NTAG/Ultralight, DESFire
  - Décodage UID, clés A/B, bits d'accès C1/C2/C3 par secteur
  - Visualisation des permissions block-par-block
  - Conversion .nfc ↔ .bin
- 🔑 **iButton** — Dallas ROM/SRAM/EEPROM, Cyfral, Metakom
  - Calcul CRC-8 1-Wire
  - Parser système de fichiers 1WFS (DS1992/DS1996)
- 🆔 **LF RFID** — EM4100, H10301
  - Décodage Wiegand 26
- 📟 **Infrarouge** — Télécommande virtuelle interactive
  - Signaux Parsed (protocole/address/command) + Raw (timings)
- 💻 **BadUSB** — Éditeur Duckyscript
  - Numérotation de lignes, cheat sheet, validateur syntaxique
- 📻 **Sub-GHz** — Visualisation impulsions RAW
  - Presets, fréquences, protocoles

### Fonctionnalités transverses
- 🔀 Mode diff côte à côte avec scroll synchronisé
- ↩️ Undo/redo (50 étapes)
- 🔍 Recherche hex et ASCII avec navigation entre résultats
- 📑 Pagination automatique pour gros fichiers binaires
- 🎨 3 thèmes : Cyberpunk, Dracula, Clair
- 📦 Bundle single-file via `vite-plugin-singlefile`
- 🔢 Auto-incrément de version au build (`scripts/increment-version.js`)

### Stack technique
- ⚛️ React 19 + TypeScript 6
- ⚡ Vite 8
- 🎨 lucide-react (icônes)
- ✅ ESLint + typescript-eslint

---
