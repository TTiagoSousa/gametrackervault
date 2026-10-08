interface StarProps {
  color?: string;
  filled?: boolean;
}

const Star = ({ color = 'currentColor', filled = false }: StarProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <path
      d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385c.117.499-.436.895-.879.63l-4.725-2.885a.562.562 0 0 0-.586 0l-4.725 2.885c-.443.265-.996-.131-.879-.63l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Star;
