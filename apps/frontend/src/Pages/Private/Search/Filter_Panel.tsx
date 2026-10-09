import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FilterOption, GameFilters, ListFilter } from '../../../Hooks/Games/types';

export interface FilterValues {
  lists: Record<ListFilter, number[]>;
  yearFrom: string;
  yearTo: string;
  minRating: number;
}

interface Filter_Panel_Props {
  filters: GameFilters | null;
  // Se as opções não carregarem, o painel diz porquê em vez de ficar a carregar
  error: string | null;
  values: FilterValues;
  onToggle: (filter: ListFilter, id: number) => void;
  onYear: (which: 'yearFrom' | 'yearTo', value: string) => void;
  onRating: (value: number) => void;
}

// Os grupos com poucas opções aparecem como fichas; as plataformas (são ~200)
// têm lista com pesquisa
const CHIP_GROUPS: ListFilter[] = ['genres', 'themes', 'modes', 'perspectives', 'types'];

const Chip_Group = ({ options, selected, onToggle }: { options: FilterOption[]; selected: number[]; onToggle: (id: number) => void }) => (
  <div className='Filter_Chips'>
    {options.map((option) => {
      const active = selected.includes(option.id);
      return (
        <button
          key={option.id}
          type='button'
          className={`Filter_Chip${active ? ' active' : ''}`}
          aria-pressed={active}
          onClick={() => onToggle(option.id)}
        >
          {option.name}
        </button>
      );
    })}
  </div>
);

const Platform_List = ({ options, selected, onToggle }: { options: FilterOption[]; selected: number[]; onToggle: (id: number) => void }) => {
  const { t } = useTranslation('search');
  const [term, setTerm] = useState('');

  // As escolhidas vêm sempre primeiro, para não se perderem na lista
  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const matches = needle ? options.filter((o) => o.name.toLowerCase().includes(needle)) : options;
    return [...matches.filter((o) => selected.includes(o.id)), ...matches.filter((o) => !selected.includes(o.id))];
  }, [options, selected, term]);

  return (
    <div className='Filter_Platforms'>
      <input
        type='search'
        className='Filter_Platforms_Search'
        placeholder={t('platformSearch')}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className='Filter_Platforms_List'>
        {visible.map((option) => (
          <label key={option.id} className='Filter_Check'>
            <input type='checkbox' checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} />
            <span>{option.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Painel de filtros: cada grupo abre e fecha (details/summary), e mostra quantos
// estão escolhidos mesmo fechado.
const Filter_Panel = ({ filters, error, values, onToggle, onYear, onRating }: Filter_Panel_Props) => {
  const { t } = useTranslation('search');

  if (!filters) {
    return <p className='Filter_Loading'>{error ? t('filtersError', { message: error }) : t('loadingFilters')}</p>;
  }

  const count = (filter: ListFilter) => values.lists[filter].length;
  const yearCount = (values.yearFrom ? 1 : 0) + (values.yearTo ? 1 : 0);

  return (
    <div className='Filter_Groups'>
      <details className='Filter_Group' open>
        <summary>
          <span>{t('platforms')}</span>
          {count('platforms') > 0 && <span className='Filter_Count'>{count('platforms')}</span>}
        </summary>
        <Platform_List options={filters.platforms} selected={values.lists.platforms} onToggle={(id) => onToggle('platforms', id)} />
      </details>

      {CHIP_GROUPS.map((group) => (
        <details key={group} className='Filter_Group' open={group === 'genres' || count(group) > 0}>
          <summary>
            <span>{t(group)}</span>
            {count(group) > 0 && <span className='Filter_Count'>{count(group)}</span>}
          </summary>
          <Chip_Group options={filters[group]} selected={values.lists[group]} onToggle={(id) => onToggle(group, id)} />
        </details>
      ))}

      <details className='Filter_Group' open={yearCount > 0}>
        <summary>
          <span>{t('years')}</span>
          {yearCount > 0 && <span className='Filter_Count'>{yearCount}</span>}
        </summary>
        <div className='Filter_Years'>
          <label>
            <span>{t('yearFrom')}</span>
            <input type='number' inputMode='numeric' min={1950} max={2100} placeholder='1980' value={values.yearFrom} onChange={(e) => onYear('yearFrom', e.target.value)} />
          </label>
          <label>
            <span>{t('yearTo')}</span>
            <input type='number' inputMode='numeric' min={1950} max={2100} placeholder={String(new Date().getFullYear())} value={values.yearTo} onChange={(e) => onYear('yearTo', e.target.value)} />
          </label>
        </div>
      </details>

      <details className='Filter_Group' open={values.minRating > 0}>
        <summary>
          <span>{t('minRating')}</span>
          {values.minRating > 0 && <span className='Filter_Count'>{values.minRating}</span>}
        </summary>
        <div className='Filter_Rating'>
          <input
            type='range'
            min={0}
            max={95}
            step={5}
            value={values.minRating}
            onChange={(e) => onRating(Number(e.target.value))}
            aria-label={t('minRating')}
          />
          <span className='Filter_Rating_Value'>{values.minRating > 0 ? `${values.minRating}+` : t('anyRating')}</span>
        </div>
      </details>
    </div>
  );
};

export default Filter_Panel;
