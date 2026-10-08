import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Chevron } from '../../../Imports/icons';
import './Global_Dropdown.scss';

export interface Global_Dropdown_Option {
  value: string;
  label: string;
}

interface Global_Dropdown_Props {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Global_Dropdown_Option[];
  placeholder?: string;
  disabled?: boolean;
  maxVisibleOptions?: number;
  searchable?: boolean;
}

// Altura aproximada de cada <li> (padding + linha de texto) e do padding do painel,
// usadas para limitar a altura a N opções visíveis em vez de um pixel fixo.
const OPTION_HEIGHT = 34;
const PANEL_PADDING = 6;
const SEARCH_HEIGHT = 38;

const Global_Dropdown = ({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  maxVisibleOptions = 5,
  searchable = false,
}: Global_Dropdown_Props) => {
  const { t } = useTranslation('ui');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  // Fechar limpa sempre a pesquisa — feito aqui e não num efeito, para o estado
  // mudar por acção do utilizador em vez de por reacção a si próprio.
  const close = () => {
    setOpen(false);
    setQuery('');
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fieldRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open]);

  const selectedOption = options.find((option) => option.value === value);

  const visibleOptions =
    searchable && query.trim()
      ? options.filter((option) =>
          option.label.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : options;

  return (
    <div
      className={`Dropdown_Field${open ? ' Open' : ''}${disabled ? ' Disabled' : ''}`}
      ref={fieldRef}
    >
      <button
        id={id}
        type='button'
        className='Dropdown_Field_Trigger'
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className={selectedOption ? '' : 'Placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Chevron />
      </button>

      {open &&
        createPortal(
          <div
            className='Dropdown_Field_Panel'
            ref={panelRef}
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            {searchable && (
              <input
                className='Dropdown_Field_Search'
                value={query}
                autoFocus
                placeholder={t('dropdown.searchPlaceholder')}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}

            <ul
              className='Dropdown_Field_Options'
              style={{
                maxHeight:
                  maxVisibleOptions * OPTION_HEIGHT +
                  PANEL_PADDING * 2 +
                  (searchable ? SEARCH_HEIGHT : 0),
              }}
            >
              {visibleOptions.length === 0 && (
                <li className='Dropdown_Field_Empty'>{t('dropdown.noResults')}</li>
              )}

              {visibleOptions.map((option) => (
                <li
                  key={option.value}
                  className={option.value === value ? 'Selected' : ''}
                  onClick={() => {
                    onChange?.(option.value);
                    close();
                  }}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Global_Dropdown;
