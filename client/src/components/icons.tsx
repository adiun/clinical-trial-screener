import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 16): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4.5 3.2v9.6l8-4.8z" fill="currentColor" stroke="none" /></svg>
);
export const IconStop = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3.5" y="3.5" width="9" height="9" fill="currentColor" stroke="none" /></svg>
);
export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 4l8 8M12 4l-8 8" /></svg>
);
export const IconSun = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="8" cy="8" r="3" /><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" /></svg>
);
export const IconMoon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" /></svg>
);
export const IconChart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M2.5 13.5h11M4 11V7M7 11V4M10 11V8.5M13 11V5.5" /></svg>
);
export const IconKey = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="5.5" cy="10.5" r="3" /><path d="M7.7 8.3 13.5 2.5M11 5l2 2M9.5 6.5l1.5 1.5" /></svg>
);
export const IconBraces = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 2.5c-1.5 0-2 .7-2 2v1.6c0 1-.6 1.9-1.5 1.9.9 0 1.5.9 1.5 1.9v1.6c0 1.3.5 2 2 2M10 2.5c1.5 0 2 .7 2 2v1.6c0 1 .6 1.9 1.5 1.9-.9 0-1.5.9-1.5 1.9v1.6c0 1.3-.5 2-2 2" /></svg>
);
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 3v10M3 8h10" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 4.5h10M6.5 4.5v-1h3v1M4.5 4.5l.6 8h5.8l.6-8M6.8 7v3.5M9.2 7v3.5" /></svg>
);
export const IconReset = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 8a5 5 0 1 0 1.5-3.6M3 2.5v3h3" /></svg>
);
export const IconSparkle = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 2.5 9.3 6.7 13.5 8l-4.2 1.3L8 13.5 6.7 9.3 2.5 8l4.2-1.3z" /></svg>
);
export const IconChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 6.5 8 10.5l4-4" /></svg>
);
export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
);
export const IconWarning = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 2.5 14 13H2z" /><path d="M8 6.5v3M8 11.5v.1" /></svg>
);
