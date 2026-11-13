export const cosmicTheme = {
  colors: {
    deepSpace: '#030718',
    deepSpaceBlue: '#071A3D',
    nebulaPurple: '#6D3AA8',
    galaxyBlue: '#2588FF',
    starlight: '#EAF6FF',
    softStarlight: '#B9D7FF',
    textPrimary: '#F7FAFF',
    textSecondary: '#B8C9E8',
    surface: 'rgba(245, 249, 255, 0.94)',
  },
  gradients: {
    space: ['#020617', '#071A3D', '#20104B', '#071B3C'] as const,
    galaxy: [
      'rgba(37, 136, 255, 0)',
      'rgba(37, 136, 255, 0.18)',
      'rgba(109, 58, 168, 0)',
    ] as const,
  },
  motion: {
    nebulaDuration: 18000,
    starDuration: 2600,
  },
} as const;

export type CosmicTheme = typeof cosmicTheme;
