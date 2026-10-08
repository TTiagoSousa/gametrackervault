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

// O tamanho vem sempre da div pai — este componente ocupa 100% do que lhe derem.
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
