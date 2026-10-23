import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import themeJson from "../generated/theme.json";
import type { Theme } from "../engine/types";

// The theme is merged by `cv prepare` (preset + video/theme.json) into src/generated/theme.json.
export const THEME = themeJson as unknown as Theme;
export const COLORS = THEME.colors;

export const GRADIENT_ACCENT_DARK = `linear-gradient(100deg, ${COLORS.cyan} 0%, ${COLORS.sky} 100%)`;
export const GRADIENT_ACCENT_LIGHT = `linear-gradient(100deg, ${COLORS.royal} 0%, ${COLORS.blue} 55%, ${COLORS.cyan} 100%)`;

// Only fonts available as weights 500/700/800 are offered. Add one here to support it.
const LOADERS: Record<string, () => { fontFamily: string }> = {
  Inter: () => loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] }),
  Manrope: () => loadManrope("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] }),
  Poppins: () => loadPoppins("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] }),
  Sora: () => loadSora("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] }),
  DMSans: () => loadDMSans("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] }),
  PlusJakartaSans: () => loadJakarta("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] }),
};

const load = (name: string, fallback: string) => (LOADERS[name] ?? LOADERS[fallback])().fontFamily;

export const FONT_DISPLAY = load(THEME.fonts.display, "PlusJakartaSans");
export const FONT_UI = load(THEME.fonts.ui, "Inter");
