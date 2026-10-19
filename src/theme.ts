export const colors = {
  bg: '#07090d',
  surface: '#10141b',
  surface2: '#171c25',
  line: '#222a36',
  text: '#f1f5f9',
  muted: '#8b97a8',
  faint: '#5b6676',
  accent: '#2ee6c5',
  accentInk: '#04201b',
  danger: '#ff5d73',
  scrim: 'rgba(0,0,0,0.6)',
} as const;

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const type = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 15 },
  small: { fontSize: 13 },
};
