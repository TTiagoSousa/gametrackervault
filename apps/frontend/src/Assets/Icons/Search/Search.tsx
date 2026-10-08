interface SearchProps {
  color?: string;
}

const Search = ({ color = 'currentColor' }: SearchProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth="1.5" />
    <path d="M16 16L20 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default Search;
