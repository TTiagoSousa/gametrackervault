interface RefreshProps {
  color?: string;
}

const Refresh = ({ color = 'currentColor' }: RefreshProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <path
      d="M20.25 12a8.25 8.25 0 1 1-2.42-5.83"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20.25 3.75v4.5h-4.5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Refresh;
