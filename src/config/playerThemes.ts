/**
 * Player look & feel presets.
 *
 * Each theme bundles its artwork, the geometry calibration for that artwork and
 * the palette / staging values that get written onto the semantic design tokens.
 * This file is the single source of truth for both the player and the admin picker.
 */

export interface PlayerThemeGeometry {
  base: { aspectRatio: number };
  platter: { leftPct: number; topPct: number; sizePct: number };
  tonearm: {
    rightPct: number;
    topPct: number;
    widthPct: number;
    lengthScale: number;
    pivotXPct: number;
    pivotYPct: number;
  };
  angles: { REST: number; START: number; END: number };
}

export interface PlayerTheme extends PlayerThemeGeometry {
  id: string;
  name: string;
  description: string;
  assets: { deck: string; record: string; tonearm: string; thumb: string };
  /** CSS custom properties applied to :root while this theme is active. */
  tokens: Record<string, string>;
}

const SHARED_ANGLES = { REST: 2.0, START: 27.5, END: 41.4 };

export const PLAYER_THEMES: PlayerTheme[] = [
  {
    id: "vintage_walnut",
    name: "Vintage Walnut",
    description: "Warm wood hi-fi deck with brass accents in a dark, cosy room.",
    assets: {
      deck: "/images/themes/vintage_walnut/deck.png",
      record: "/images/themes/vintage_walnut/record.png",
      tonearm: "/images/themes/vintage_walnut/tonearm.png",
      thumb: "/images/themes/vintage_walnut/thumb.jpg",
    },
    base: { aspectRatio: 1.169 },
    platter: { leftPct: 11.4, topPct: 17.9, sizePct: 55.0 },
    tonearm: {
      rightPct: 2.7,
      topPct: 10.0,
      widthPct: 39.3,
      lengthScale: 1.0,
      pivotXPct: 54.0,
      pivotYPct: 24.0,
    },
    angles: { ...SHARED_ANGLES },
    tokens: {
      "--background": "26 22% 8%",
      "--foreground": "32 18% 78%",
      "--card": "26 20% 11%",
      "--card-foreground": "32 18% 78%",
      "--popover": "26 20% 11%",
      "--popover-foreground": "32 18% 78%",
      "--primary": "30 55% 46%",
      "--primary-foreground": "32 30% 95%",
      "--secondary": "26 18% 16%",
      "--secondary-foreground": "32 18% 78%",
      "--muted": "28 12% 24%",
      "--muted-foreground": "30 10% 55%",
      "--accent": "36 60% 55%",
      "--accent-foreground": "30 30% 12%",
      "--border": "28 16% 21%",
      "--input": "28 14% 18%",
      "--ring": "30 55% 46%",
      "--vinyl-glow": "34 55% 45%",
      "--warm-shadow": "22 40% 4%",
      "--light-deck":
        "radial-gradient(120% 90% at 18% -10%, hsl(38 60% 88% / 0.55) 0%, hsl(38 40% 70% / 0.18) 35%, transparent 70%)",
      "--vignette-deck":
        "radial-gradient(130% 110% at 45% 35%, transparent 45%, hsl(22 40% 4% / 0.35) 100%)",
      "--sheen-vinyl":
        "radial-gradient(140% 120% at 22% 12%, hsl(38 45% 82% / 0.3) 0%, hsl(34 35% 70% / 0.1) 28%, transparent 58%)",
      "--surface-room":
        "radial-gradient(ellipse 120% 90% at 50% -20%, hsl(28 22% 15%) 0%, hsl(26 24% 9%) 45%, hsl(24 26% 5%) 100%)",
    },
  },
  {
    id: "matte_black",
    name: "Matte Black Studio",
    description: "Modern black studio deck, cool grey accents, near-black room.",
    assets: {
      deck: "/images/themes/matte_black/deck.png",
      record: "/images/themes/matte_black/record.png",
      tonearm: "/images/themes/matte_black/tonearm.png",
      thumb: "/images/themes/matte_black/thumb.jpg",
    },
    base: { aspectRatio: 1.2414 },
    platter: { leftPct: 12.65, topPct: 17.35, sizePct: 52.1 },
    tonearm: {
      rightPct: 6.1,
      topPct: 3.4,
      widthPct: 37.2,
      lengthScale: 1.0,
      pivotXPct: 54.0,
      pivotYPct: 24.0,
    },
    angles: { ...SHARED_ANGLES },
    tokens: {
      "--background": "220 8% 6%",
      "--foreground": "220 8% 82%",
      "--card": "220 8% 10%",
      "--card-foreground": "220 8% 82%",
      "--popover": "220 8% 10%",
      "--popover-foreground": "220 8% 82%",
      "--primary": "220 6% 62%",
      "--primary-foreground": "220 10% 10%",
      "--secondary": "220 7% 14%",
      "--secondary-foreground": "220 8% 82%",
      "--muted": "220 6% 22%",
      "--muted-foreground": "220 6% 58%",
      "--accent": "200 12% 72%",
      "--accent-foreground": "220 10% 10%",
      "--border": "220 7% 18%",
      "--input": "220 7% 15%",
      "--ring": "200 12% 60%",
      "--vinyl-glow": "205 15% 60%",
      "--warm-shadow": "220 12% 2%",
      "--light-deck":
        "radial-gradient(120% 90% at 22% -12%, hsl(210 15% 92% / 0.4) 0%, hsl(210 10% 70% / 0.12) 38%, transparent 72%)",
      "--vignette-deck":
        "radial-gradient(130% 110% at 45% 35%, transparent 42%, hsl(220 12% 2% / 0.45) 100%)",
      "--sheen-vinyl":
        "radial-gradient(140% 120% at 24% 10%, hsl(210 20% 90% / 0.26) 0%, hsl(210 12% 72% / 0.08) 28%, transparent 58%)",
      "--surface-room":
        "radial-gradient(ellipse 120% 90% at 50% -20%, hsl(220 8% 12%) 0%, hsl(220 9% 7%) 45%, hsl(220 10% 4%) 100%)",
    },
  },
  {
    id: "cream_retro",
    name: "Cream Retro Suitcase",
    description: "1960s portable player in cream and tan with pastel teal accents.",
    assets: {
      deck: "/images/themes/cream_retro/deck.png",
      record: "/images/themes/cream_retro/record.png",
      tonearm: "/images/themes/cream_retro/tonearm.png",
      thumb: "/images/themes/cream_retro/thumb.jpg",
    },
    base: { aspectRatio: 1.2414 },
    platter: { leftPct: 11.06, topPct: 16.22, sizePct: 53.2 },
    tonearm: {
      rightPct: 5.4,
      topPct: 2.7,
      widthPct: 38.0,
      lengthScale: 1.0,
      pivotXPct: 54.0,
      pivotYPct: 24.0,
    },
    angles: { ...SHARED_ANGLES },
    tokens: {
      "--background": "36 30% 90%",
      "--foreground": "28 25% 20%",
      "--card": "36 34% 94%",
      "--card-foreground": "28 25% 20%",
      "--popover": "36 34% 94%",
      "--popover-foreground": "28 25% 20%",
      "--primary": "182 32% 42%",
      "--primary-foreground": "40 40% 96%",
      "--secondary": "34 28% 84%",
      "--secondary-foreground": "28 25% 24%",
      "--muted": "34 22% 78%",
      "--muted-foreground": "30 14% 40%",
      "--accent": "180 34% 48%",
      "--accent-foreground": "40 40% 96%",
      "--border": "34 22% 76%",
      "--input": "34 24% 82%",
      "--ring": "182 32% 42%",
      "--vinyl-glow": "182 32% 50%",
      "--warm-shadow": "28 25% 30%",
      "--light-deck":
        "radial-gradient(120% 90% at 20% -12%, hsl(44 60% 96% / 0.6) 0%, hsl(40 45% 84% / 0.2) 36%, transparent 72%)",
      "--vignette-deck":
        "radial-gradient(130% 110% at 45% 35%, transparent 50%, hsl(28 25% 30% / 0.2) 100%)",
      "--sheen-vinyl":
        "radial-gradient(140% 120% at 22% 12%, hsl(44 50% 94% / 0.34) 0%, hsl(40 35% 82% / 0.12) 28%, transparent 58%)",
      "--surface-room":
        "radial-gradient(ellipse 120% 90% at 50% -20%, hsl(38 40% 94%) 0%, hsl(34 30% 87%) 45%, hsl(30 24% 79%) 100%)",
    },
  },
  {
    id: "brushed_silver",
    name: "Brushed Silver Hi-Tech",
    description: "Silver and glass audiophile deck in a cool, neutral room.",
    assets: {
      deck: "/images/themes/brushed_silver/deck.png",
      record: "/images/themes/brushed_silver/record.png",
      tonearm: "/images/themes/brushed_silver/tonearm.png",
      thumb: "/images/themes/brushed_silver/thumb.jpg",
    },
    base: { aspectRatio: 1.2414 },
    platter: { leftPct: 11.6, topPct: 16.03, sizePct: 52.8 },
    tonearm: {
      rightPct: 5.0,
      topPct: 2.4,
      widthPct: 37.7,
      lengthScale: 1.0,
      pivotXPct: 54.0,
      pivotYPct: 24.0,
    },
    angles: { ...SHARED_ANGLES },
    tokens: {
      "--background": "212 16% 14%",
      "--foreground": "210 14% 84%",
      "--card": "212 16% 18%",
      "--card-foreground": "210 14% 84%",
      "--popover": "212 16% 18%",
      "--popover-foreground": "210 14% 84%",
      "--primary": "205 30% 60%",
      "--primary-foreground": "212 25% 12%",
      "--secondary": "212 14% 22%",
      "--secondary-foreground": "210 14% 84%",
      "--muted": "212 10% 30%",
      "--muted-foreground": "210 10% 62%",
      "--accent": "198 42% 66%",
      "--accent-foreground": "212 25% 12%",
      "--border": "212 12% 27%",
      "--input": "212 12% 23%",
      "--ring": "205 30% 60%",
      "--vinyl-glow": "200 35% 62%",
      "--warm-shadow": "212 22% 6%",
      "--light-deck":
        "radial-gradient(120% 90% at 20% -12%, hsl(205 30% 96% / 0.5) 0%, hsl(205 20% 80% / 0.16) 36%, transparent 72%)",
      "--vignette-deck":
        "radial-gradient(130% 110% at 45% 35%, transparent 46%, hsl(212 22% 6% / 0.35) 100%)",
      "--sheen-vinyl":
        "radial-gradient(140% 120% at 22% 12%, hsl(205 35% 94% / 0.3) 0%, hsl(205 22% 80% / 0.1) 28%, transparent 58%)",
      "--surface-room":
        "radial-gradient(ellipse 120% 90% at 50% -20%, hsl(212 16% 22%) 0%, hsl(212 17% 15%) 45%, hsl(212 20% 10%) 100%)",
    },
  },
];

export const DEFAULT_THEME_ID = "vintage_walnut";

export const getPlayerTheme = (id?: string | null): PlayerTheme =>
  PLAYER_THEMES.find((theme) => theme.id === id) ??
  PLAYER_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID)!;

/** Writes a theme's tokens onto the document root. */
export const applyPlayerThemeTokens = (theme: PlayerTheme) => {
  const root = document.documentElement;
  Object.entries(theme.tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
};