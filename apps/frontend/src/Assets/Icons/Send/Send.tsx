interface SendProps {
  color?: string;
}

const Send = ({ color = 'currentColor' }: SendProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden="true">
    <path d="M5 12h13M12 5l7 7-7 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default Send;
