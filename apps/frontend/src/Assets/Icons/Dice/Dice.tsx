interface DiceProps {
  color?: string;
}

const Dice = ({ color = 'currentColor' }: DiceProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export default Dice;
