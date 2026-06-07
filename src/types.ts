export type FileMode = 'raw' | 'nfc' | 'ibtn' | 'rfid' | 'ir' | 'badusb' | 'sub';

export interface NfcLine {
  type: 'comment' | 'empty' | 'header' | 'block';
  key?: string;        // Pour les en-têtes (ex: "Device type")
  value?: string;      // Pour les en-têtes (ex: "Mifare Classic")
  blockIndex?: number; // Pour les blocs de données (ex: 0 à 63)
  bytes?: string[];    // Tableau de 16 octets sous forme de chaînes de 2 car. (ex: "47", "??")
  raw: string;         // Ligne brute d'origine pour reconstruire le fichier à l'identique
}

export interface MifareClassicCard {
  fileType: string;
  version: number;
  deviceType: string;
  uid: string;
  atqa?: string;
  sak?: string;
  ats?: string;
  mifareClassicType?: string;
  dataFormatVersion?: number;
  lines: NfcLine[];
}

export interface IButtonCard {
  fileType: string;
  version: number;
  protocol: string;
  romData?: string[]; // 8 octets hex
  sramData?: string[]; // DS1992 (128 octets) ou DS1996 (1024 octets)
  eepromData?: string[]; // DS1971 (32 octets)
  data?: string[]; // Cyfral / Metakom (8 octets)
  lines: NfcLine[];
}

export interface RfidCard {
  fileType: string;
  version: number;
  keyType: string; // ex: EM4100
  data: string[]; // octets hex de longueur variable (ex: 5 octets pour EM4100)
  lines: NfcLine[];
}

export interface IrButton {
  name: string;
  type: 'parsed' | 'raw';
  protocol?: string;
  address?: string; // 4 octets hex
  command?: string; // 4 octets hex
  frequency?: number;
  dutyCycle?: number;
  data?: string; // chaîne brute des timings (ex: "504 3432 502 ...")
}

export interface IrCard {
  fileType: string;
  version: number;
  buttons: IrButton[];
  lines: NfcLine[];
}

export interface SectorPermission {
  blockIndex: number;
  blockType: 'data' | 'trailer';
  read: string;       // "Key A / Key B", "Key B Only", "Never", etc.
  write: string;      // "Key A / Key B", "Key B Only", "Never", etc.
  increment: string;  // "Key A / Key B", "Key B Only", "Never", etc.
  decrement: string;  // "Key A / Key B", "Key B Only", "Never", etc.
  desc: string;
}

export interface DecodedSector {
  sectorIndex: number;
  startBlock: number;
  endBlock: number;
  keyA: string;           // "A0 A1 A2 A3 A4 A5" ou "?? ?? ??"
  keyB: string;           // "C1 27 86..." ou "?? ?? ??"
  accessBytes: string[];   // Les 3 octets de contrôle (ex: ["78", "77", "88"])
  userByte: string;       // L'octet d'utilisateur (ex: "C1")
  permissions: SectorPermission[];
  isValid: boolean;       // Si les bits inversés correspondent bien aux bits normaux
}

export interface SubGhzCard {
  fileType: string;
  version: number;
  frequency?: number;
  preset?: string;
  protocol?: string;
  bit?: number;
  key?: string;
  rawTimes?: number[];
  lines: NfcLine[];
}

export interface CompareState {
  fileName: string;
  fileSize: number;
  rawBytes: Uint8Array | null;
  nfcCard: MifareClassicCard | null;
  ibtnCard: IButtonCard | null;
  rfidCard: RfidCard | null;
  irCard: IrCard | null;
  badusbScript: string | null;
  subGhzCard: SubGhzCard | null;
}

export interface HexEditorState {
  fileMode: FileMode;
  fileName: string;
  fileSize: number;
  rawBytes: Uint8Array | null; // Null en mode Flipper structuré
  nfcCard: MifareClassicCard | null;
  ibtnCard: IButtonCard | null;
  rfidCard: RfidCard | null;
  irCard: IrCard | null;
  badusbScript: string | null;
  subGhzCard: SubGhzCard | null;
  cursorIndex: number | null;   // Position de l'octet sélectionné
  selectionStart: number | null; // Début de la sélection
  selectionEnd: number | null;   // Fin de la sélection
  isEditingAscii: boolean;      // Vrai si on édite la colonne ASCII, Faux pour la colonne Hex
  compareState: CompareState | null;
  isCompareMode: boolean;
}
