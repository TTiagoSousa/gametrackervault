interface ChevronProps {
  color?: string;
}

const Chevron = ({ color = 'currentColor' }: ChevronProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <path d="M6 9L12 15L18 9" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default Chevron;
