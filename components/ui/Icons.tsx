import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, strokeWidth = 2, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (p: IconProps) => <Icon strokeWidth={2.4} {...p}><path d="M5 12l5 5 9-10" /></Icon>;
export const BackIcon = (p: IconProps) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>;
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const PlayIcon = (p: IconProps) => <Icon fill="currentColor" stroke="none" {...p}><path d="M8 5v14l11-7z" /></Icon>;
export const GridIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></Icon>;
export const EditIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></Icon>;
export const QrIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3" /></Icon>;
export const SendIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><path d="M4 12l16-8-6 16-3-7z" /></Icon>;
export const ClockIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
export const MailIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></Icon>;
export const PinIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
export const GiftIcon = (p: IconProps) => <Icon strokeWidth={1.8} {...p}><path d="M3 9h18v12H3zM12 9v12M3 13h18M12 9c-2-4-6-4-6-1s6 1 6 1zM12 9c2-4 6-4 6-1s-6 1-6 1z" /></Icon>;

/** Google "G" in its brand colours. */
export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.86 8.88 4.75 12 4.75z" />
    </svg>
  );
}
