import type { ReactNode } from "react";

const symbols = {
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  previous: <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />,
  next: <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />,
  play: <path d="M8 5.3 18.5 12 8 18.7Z" fill="currentColor" strokeWidth=".8" />,
  pause: <path d="M8.3 6v12m7.4-12v12" strokeWidth="2.7" />,
  camera: (
    <>
      <path d="M3.2 8.2h4.2l1.7-2.9h5.8l1.7 2.9h4.2v11.1H3.2z" />
      <circle cx="12" cy="13.5" r="3.4" />
      <path d="M17.5 10.5h.8" />
    </>
  ),
  angles: (
    <>
      <path d="m12 3 8.6 5.1v8.4L12 21.3l-8.6-4.8V8.1zM3.5 8.1l8.5 5 8.5-5M12 13v8" />
      <path d="m7.7 5.6 8.5 4.9" opacity=".6" />
    </>
  ),
  plus: <path d="M5.5 12h13M12 5.5v13" />,
  minus: <path d="M5.5 12h13" />,
  home: (
    <>
      <path d="M4 9.6 12 4l8 5.6m-1.7-.7v10.4H5.7V8.9" />
      <path d="M10.1 19.2v-5.8h3.8v5.8" />
    </>
  ),
  expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />,
  contract: <path d="M4 9h5V4m6 0v5h5M4 15h5v5m6 0v-5h5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.45 9.7a2.58 2.58 0 1 1 4.23 2c-.92.72-1.68 1.19-1.68 2.52m0 2.55h.01" />
    </>
  ),
  close: <path d="m6.4 6.4 11.2 11.2m0-11.2L6.4 17.6" />,
  download: <path d="M12 3.8v10.6m-4.1-4 4.1 4.2 4.1-4.2M4.4 15.3v4.4h15.2v-4.4" />,
  share: <path d="M12 14V3.4m-3.8 4L12 3.4l3.8 4M8.4 9.6H5.3v10.5h13.4V9.6h-3.1" />,
  layers: (
    <>
      <path d="m3.3 9 8.7-5 8.7 5-8.7 5zM3.3 12.5l8.7 5 8.7-5m-17.4 3.6 8.7 5 8.7-5" />
    </>
  ),
  check: <path d="m4.8 12.4 4.4 4.4 10-10" strokeWidth="1.9" />,
  chevron: <path d="m6.7 9.6 5.3 5 5.3-5" />,
  orbit: (
    <>
      <circle cx="12" cy="12" r="3.15" />
      <path d="M17.2 6.35C14 6.15 9.3 8.3 5.85 11.45c-3.4 3.1-4.25 5.95-2.15 7s6.55-.05 10.6-2.85c4.45-3.05 6.95-6.75 5.5-8.2" />
      <path d="m17.8 4.6 2.1 2.9-3.4.78" />
    </>
  ),
  hand: (
    <path d="M7.7 12.4V6.8a1.55 1.55 0 0 1 3.1 0v4.2-6.7a1.55 1.55 0 0 1 3.1 0v6.7-5.1a1.5 1.5 0 0 1 3 0v5.8-3.6a1.4 1.4 0 0 1 2.8 0v5.5c0 4.35-2.5 7.3-6.25 7.3-2.2 0-3.85-.88-5.25-2.55l-4.1-4.75a1.68 1.68 0 0 1 2.3-2.4l1.3 1.2" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="m15.95 7.65-2.4 6.05-5.5 2.65 2.4-6.05z" />
      <path d="m10.45 10.3 3.1 3.4" opacity=".6" />
    </>
  ),
  grid: (
    <>
      <rect x="4.1" y="4.1" width="15.8" height="15.8" rx="1.1" />
      <path d="M4.2 9.35h15.6M4.2 14.65h15.6M9.35 4.2v15.6m5.3-15.6v15.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.55" />
      <path d="M12 6.65v5.55l3.65 2.15" />
    </>
  ),
  aperture: (
    <>
      <circle cx="12" cy="12" r="8.65" />
      <path d="m12 3.4 4.75 8.25M19.5 7.7h-9.55m9.55 8.6-4.75-8.25M12 20.6l-4.75-8.25M4.5 16.3h9.55M4.5 7.7l4.75 8.25" />
    </>
  ),
  leaf: (
    <>
      <path d="M4.55 15.7C3 8.2 10.2 4.3 19.4 4.6c.4 9.1-3.5 16.6-10.95 14.7" />
      <path d="m4.2 20 10.5-11m-5.45 5.7.25-4.25m2.18 1.55 4.05-.35" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11.2v5.5m0-9.5h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof symbols;

type GraphicProps = { size?: number; className?: string };

export function Icon({ name, size = 20, className }: GraphicProps & { name: IconName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {symbols[name]}
    </svg>
  );
}

const landmarks = {
  pendhapa: (
    <>
      <path d="M4 35.7h61M7.3 33.7h55.4m-52-2h49.3" opacity=".65" />
      <path
        d="m3.7 23.6 11.1-3.2 8.6-5.1 4.4-2.2 2.4-5.2 4.8-3.5 4.8 3.5 2.4 5.2 4.4 2.2 8.6 5.1 11.1 3.2-1.7 1.5-59.2-.1z"
        fill="currentColor"
        fillOpacity=".11"
      />
      <path d="M15 20.5h39.9m-32-5h24.2m-19.4-2.4h14.5m-11.9-5.3h9.3M5.9 23.6h58.2m-50.2 2.1v5.9m4-5.9v5.9m6.3-5.9v5.9m3.4-5.9v5.9m15.3-5.9v5.9m3.1-5.9v5.9m6.1-5.9v5.9m3.9-5.9v5.9" />
      <path d="m26 26.1 9-3.8 9 3.8m-16.9-.1h15.8m-13 0v6m10.3-6v6m-8.1-.1h5.9m-7.6 1.85h9.3" />
      <path
        d="m19 19.4 6.1-3.3m.8 3.3 3.5-3.3m2.4-4 2.2-3.7m6 11-2.1-3.3m7.5 3.3-3.1-3.3m9.7 6.8-4.1-1.7m-33.1 1.7 4.8-1.7"
        strokeWidth=".63"
        opacity=".6"
      />
    </>
  ),
  pasar: (
    <>
      <path d="M3 36h64m-62-1.8h59" opacity=".6" />
      <path
        d="m5 22 7.2-6.7h13.5l-2.5 6.9-1.65 1H5zm60 0-7.2-6.7H44.3l2.5 6.9 1.65 1H65z"
        fill="currentColor"
        fillOpacity=".11"
      />
      <path d="M7.5 23.2v10.9m15.2-11v11m24.7-11v11m15.1-11v11m-53.2-2.7h11.3m28.8 0h11.3" />
      <path
        d="M20.5 20.1q2.8-4 5.5-10L35 5.8l9 4.3q2.7 6 5.5 10L48 21.7H22z"
        fill="currentColor"
        fillOpacity=".15"
      />
      <path d="M21.5 19.8h27m-24-2.7q2.7-3.25 4.2-6.5L35 8l6.3 2.6q1.5 3.25 4.2 6.5zm-2.7 15.8h3.9V21.8m16.6.1v11h4.1m-18.4 1.5v-8.65q5.4-2.8 10.8 0v8.65m-11.3.4h12.05" />
      <path
        d="M10.5 29v-4h3.2v4m2.3 0v-4h3.3v4m31.5 0v-4h3.2v4m2.3 0v-4h3.3v4m-30.5-12.4 5.9-4.7 6 4.7m-7.9-.1 1.9-1.5 1.8 1.5m-6.7 16v-6m2.4 6v-6.7m4.8 6.7v-6.7"
        strokeWidth=".7"
        opacity=".72"
      />
    </>
  ),
  laweyan: (
    <>
      <path d="M3 36h64m-60-2h57" opacity=".63" />
      <path
        d="m3.8 19.5 8-8.9 12.4-1 9.6 9.8-2 .95H5.1zm32.5-5.15 7.4-5.3 9.8.05 8.4 6.25-1.7.8-22.3-.7z"
        fill="currentColor"
        fillOpacity=".12"
      />
      <path d="m8 20.5.4 12.9m20.1-12.9v4.8m10.9-9.5v5.2m19.8-4.8v5.1M7 26.5h17.7m32.6-2.7h6.5v10.1m-33.6-.4V20.8h2v-2.5h3v-2.1h5.4v2.1h3v2.5h2v12.7m-11.9.3v-10q3.8-3 7.65 0v10" />
      <path
        d="M12.2 24.6V22h4v2.6m3 0V22h4v2.6M9 28.4h12.9m-11.9 2h10.9m-8.55-12.75 3.5-5m.75 5.1 2.35-5.2m33.2 2.2-2.6-3.35"
        strokeWidth=".67"
        opacity=".67"
      />
      <path d="M47.7 34V21.8m-1.3-.25 12.6.2M58 22v12m-9.1-11.8h7.9l-.25 7.6q-3.35-1.2-7.85.1z" />
      <path d="m50.1 25.5 1.2-1.3 1.25 1.3-1.25 1.25zm3.6.65 1.1-1.2 1.05 1.2-1.05 1.1z" strokeWidth=".65" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type LandmarkId = keyof typeof landmarks;

export function LandmarkIcon({ id, className }: { id: LandmarkId; className?: string }) {
  return (
    <svg
      viewBox="0 0 70 42"
      width="70"
      height="42"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.08"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {landmarks[id]}
    </svg>
  );
}

export function Mark({ size = 36, className }: GraphicProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20 2.8c-1.95 5.1-5 8.25-9.2 11.7-3.65 3-6 6.9-6 12.1L20 34.7l15.2-8.1c0-5.2-2.35-9.1-6-12.1C25 11.05 21.95 7.9 20 2.8Z"
        fill="currentColor"
        fillOpacity=".06"
      />
      <path
        d="M20 7.7c-1.75 3.35-4.3 5.95-7.45 8.65-2.6 2.25-4.3 5-4.75 8.45L20 31.4l12.2-6.6c-.45-3.45-2.15-6.2-4.75-8.45C24.3 13.65 21.75 11.05 20 7.7Zm0 27v2.5"
        opacity=".7"
      />
      <path d="M20 27.4V12.8m0 10.35c-1.4-2.95-4.5-5.7-7.2-5.9.4 3.2 3.3 6.4 7.2 7.7m0-4.35c1.8-2.8 3.55-4.2 5.95-4.7-.1 2.7-2.6 5.55-5.95 6.7M11 25.2l9 4.65 9-4.65" />
    </svg>
  );
}
