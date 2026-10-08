interface CloseProps {
  color?: string;
}

const Close = ({ color = 'currentColor' }: CloseProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <path d="M18 6L6 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 6L18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default Close;
