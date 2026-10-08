import './Simple_Button.scss';

interface Simple_Button_Props {
  text?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const Simple_Button = ({
  text = '',
  onClick,
  type = 'button',
  disabled = false,
}: Simple_Button_Props) => {
  return (
    <button
      className="Simple_Button"
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{text}</span>
    </button>
  );
};

export default Simple_Button;
