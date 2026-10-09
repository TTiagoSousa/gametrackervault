interface HelpProps {
  color?: string;
}

const Help = ({ color = 'currentColor' }: HelpProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 17h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default Help;
