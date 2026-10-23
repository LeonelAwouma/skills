// Types shared by the engine. They mirror scripts/lib/storyboard.mjs in the celeste-video skill.

export type TransitionType = "cut" | "fade" | "bloom" | "wipe" | "push";

export type Narration = { text: string; spoken?: string; at?: number; speed?: number };

export type Contact = { kind: "email" | "phone" | "web" | "address"; value: string };

export type Visual =
  | { kind: "app"; appTitle?: string; nav?: string[] }
  | { kind: "automation"; source?: string; node?: string; before?: string; after?: string; done?: string; steps?: string[] }
  | { kind: "integrations"; hub?: string; tools?: { label: string; icon?: string }[] }
  | { kind: "timeline"; steps?: { title: string; sub?: string; icon?: string }[]; done?: string }
  | { kind: "screenshot"; images: { src: string; focus?: { x: number; y: number; zoom: number }[] }[] };

type Base = {
  id: string;
  duration: number;
  transition: { type: TransitionType };
  narration?: Narration[];
  bg?: "dark" | "light";
  music?: { energy?: number; fast?: boolean };
};

export type Scene =
  | (Base & { type: "kinetic"; lines: string[]; sub?: string; tone?: "accent" | "warn"; variant?: "slam" | "pop" })
  | (Base & { type: "problem-solution"; problem: { lines: string[] }; solution: { lines: string[] }; split?: number; labels?: Record<string, string> })
  | (Base & { type: "logo-reveal"; lines?: string[] })
  | (Base & { type: "showcase"; tag?: string; lines: string[]; visual: Visual; note?: string })
  | (Base & { type: "value"; lines: string[]; sub?: string })
  | (Base & { type: "cta"; lines: string[]; cta?: string; contactLabel?: string; contacts?: Contact[] })
  | (Base & { type: "bullets"; tag?: string; lines: string[]; items: { title: string; text?: string; icon?: string }[] })
  | (Base & { type: "screenshot"; lines?: string[]; image: string; focus?: { x: number; y: number; zoom: number; at?: number }[]; caption?: string });

export type Storyboard = {
  version: 1;
  meta: { brand: string; lang: string; slug?: string };
  video: { fps: number; format: "9:16" | "16:9" | "1:1"; shortSide: number; duration: number };
  scenes: Scene[];
  subtitles?: { burn?: boolean; maxChars?: number };
};

export type ThemeColors = {
  navy950: string; navy900: string; navy800: string; navy700: string;
  ink: string; royal: string; blue: string; sky: string; cyan: string;
  ice: string; mist: string; white: string; slate: string; line: string;
  warn: string; danger: string; ok: string;
};

export type Theme = {
  name: string;
  colors: ThemeColors;
  fonts: { display: string; ui: string };
  logo?: { src: string; aspect?: number; focus?: { x: number; y: number }; onDark?: boolean };
  mark?: { text?: string };
};

export type Assets = {
  logo: { src: string; aspect: number; focus: { x: number; y: number }; onDark: boolean } | null;
  music: { src: string; volume: number; ducked: number } | null;
  voice: boolean;
  missingImages: string[];
  brand: string;
  lang: string;
  subtitles: { burn: boolean; position: string };
  ducking: { attack: number; release: number };
};

export type VoiceManifest = {
  voice: string | null;
  segments: { id: string; text: string; file: string; start: number; duration: number; end: number }[];
  subtitles: { start: number; end: number; text: string }[];
};

/** One resolved scene on the timeline (frames). */
export type TimelineScene = {
  scene: Scene;
  index: number;
  startFrame: number;
  durationFrames: number;
  lead: number;
  nextLead: number;
  nextTransition: TransitionType | null;
  group: { index: number; size: number };
};
