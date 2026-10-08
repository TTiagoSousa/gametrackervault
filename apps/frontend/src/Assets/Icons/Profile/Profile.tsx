interface ProfileProps {
  color?: string;
}

const Profile = ({ color = 'currentColor' }: ProfileProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5" />
    <path
      d="M4 20c0-3.3137 3.5817-6 8-6s8 2.6863 8 6"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export default Profile;
