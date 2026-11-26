export type PassQuality = 'high' | 'medium' | 'low';

export const PASS_QUALITY = {
  high: { faceWidth: 1152, cordSamples: 120, cordSides: 8, contour: 8, brassSides: 60, anisotropy: 8, relief: true },
  medium: { faceWidth: 864, cordSamples: 94, cordSides: 7, contour: 6, brassSides: 44, anisotropy: 4, relief: true },
  low: { faceWidth: 640, cordSamples: 66, cordSides: 5, contour: 4, brassSides: 28, anisotropy: 2, relief: false },
} as const;

export type QualitySettings = typeof PASS_QUALITY[PassQuality];
