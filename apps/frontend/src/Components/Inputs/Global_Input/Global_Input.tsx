import './Global_Input.scss';

interface Global_Input_Props {
  id?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoComplete?: string;
}

// The size always comes from the parent div — this component fills 100% of what it's given.
const Global_Input = ({
  id,
  type = 'text',
  value,
  onChange,
  onKeyDown,
  placeholder,
  maxLength,
  disabled,
  autoComplete,
}: Global_Input_Props) => {
  return (
    <div className='Global_Input'>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoComplete={autoComplete}
      />
    </div>
  );
};

export default Global_Input;
