// The engine reads ONLY these generated files (written by `cv prepare` / `cv build`).
import storyboardJson from "../generated/storyboard.json";
import assetsJson from "../generated/assets.json";
import manifestJson from "../generated/voiceover.manifest.json";
import type { Assets, Storyboard, VoiceManifest } from "./types";

export const STORYBOARD = storyboardJson as unknown as Storyboard;
export const ASSETS = assetsJson as unknown as Assets;
export const MANIFEST = manifestJson as unknown as VoiceManifest;
