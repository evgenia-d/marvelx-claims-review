import type { ReactNode } from "react";

export type IconProps = {
  /** Pixel size of the square icon. */
  size?: 12 | 14 | 16 | 20;
  className?: string;
};

function Svg({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </Svg>
  );
}

export function IconBang(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3.5v6" />
      <path d="M8 12.4v.01" />
    </Svg>
  );
}

export function IconTriangle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2.5 14.2 13.2H1.8Z" />
      <path d="M8 6.5v3" />
      <path d="M8 11.4v.01" />
    </Svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.25 8 10.25 12 6.25" />
    </Svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.5 3.5 12.5 5.5 5.5 12.5H3.5v-2Z" />
    </Svg>
  );
}

export function IconSwap(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 5.5h9.5" />
      <path d="M10 3l2.5 2.5L10 8" />
      <path d="M13 10.5H3.5" />
      <path d="M6 8l-2.5 2.5L6 13" />
    </Svg>
  );
}

export function IconUndo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 3.5 3 6l2.5 2.5" />
      <path d="M3 6h6.5a3.5 3.5 0 0 1 0 7H6" />
    </Svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3 5 8l5 5" />
    </Svg>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </Svg>
  );
}

export function IconRetry(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13 2.5v3h-3" />
    </Svg>
  );
}
