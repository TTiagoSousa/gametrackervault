interface LogoProps {
  color?: string;
}

// Game controller — the GameTracker Vault brand mark.
const Logo = ({ color = 'currentColor' }: LogoProps) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 7h11a4.5 4.5 0 0 1 4.4 5.4l-.9 4.4a2.6 2.6 0 0 1-4.5 1.2L14.6 16H9.4l-1.9 2a2.6 2.6 0 0 1-4.5-1.2l-.9-4.4A4.5 4.5 0 0 1 6.5 7z" />
    <path d="M7 10.5v3M5.5 12h3" />
    <circle cx="16" cy="11" r="0.6" fill={color} />
    <circle cx="18" cy="13" r="0.6" fill={color} />
  </svg>
);

export default Logo;
