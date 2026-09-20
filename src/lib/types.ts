export type ItemClass = "progression" | "useful" | "filler" | "trap";

export type RawTrack = {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  durationMs: number;
  trackNumber: number;
};

export type RawAlbum = {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  year: number | null;
  tracks: RawTrack[];
};

export type Track = RawTrack & {
  albumId: string;
  albumName: string;
  artwork: string;
  locationId: number;
  locationName: string;
};

export type Album = Omit<RawAlbum, "tracks"> & {
  itemId: number;
  itemName: string;
  starter: boolean;
  tracks: Track[];
};

export type Placement = {
  locationId: number;
  itemId: number;
  itemName: string;
  classification: ItemClass;
  destPlayer: "self" | "remote";
  destName?: string;
  destGame?: string;
};

export type ReceivedItem = {
  itemId: number;
  itemName: string;
  classification: ItemClass;
  fromPlayer: string;
  locationName?: string;
  at: number;
};

export type ChatKind = "system" | "bot" | "user" | "item" | "check" | "multi";

export type ChatMessage = {
  id: string;
  at: number;
  kind: ChatKind;
  author: string;
  text: string;
  art?: string;
  classification?: ItemClass;
};

export type LiveConfig = {
  host: string;
  port: string;
  slot: string;
  password: string;
  game: string;
};

export type RemoteGift = {
  itemId: number;
  itemName: string;
  albumId: string;
  afterChecks: number;
  granted: boolean;
};

export type ViewId = "station" | "crate" | "world";
