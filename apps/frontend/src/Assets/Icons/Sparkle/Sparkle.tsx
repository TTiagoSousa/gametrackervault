interface SparkleProps {
  color?: string;
}

const Sparkle = ({ color = 'currentColor' }: SparkleProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden="true">
    <path d="M12 3l1.8 4.9a2 2 0 0 0 1.2 1.2L20 11l-4.9 1.8a2 2 0 0 0-1.2 1.2L12 19l-1.8-4.9a2 2 0 0 0-1.2-1.2L4 11l4.9-1.8a2 2 0 0 0 1.2-1.2L12 3Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 3v3M17.5 4.5h3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default Sparkle;
