import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameFilters } from '../../../Hooks/Games/useGameFilters';
import { useGameSearch } from '../../../Hooks/Games/useGameSearch';
import { LIST_FILTERS, SORTS, type ListFilter, type Sort } from '../../../Hooks/Games/types';
import * as Icon from '../../../Imports/icons';
import Filter_Panel, { type FilterValues } from './Filter_Panel';
import Game_Result from './Game_Result';
import './Search.scss';

const SORT_LABEL: Record<Sort, string> = {
  popular: 'sortPopular',
  rating: 'sortRating',
  newest: 'sortNewest',
  oldest: 'sortOldest',
  name: 'sortName',
};

const parseIds = (value: string | null) =>
  (value ?? '').split(',').filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0);

/**
 * Game search. All state lives in the URL (/Vault/Search?q=…&genres=…):
 * reloading, going back or sharing the link restores the same search.
 */
const Search = () => {
  const { t } = useTranslation('search');
  const [params, setParams] = useSearchParams();
  const { filters, error: filtersError } = useGameFilters();
  const [panelOpen, setPanelOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // The fixed bar's height (changes on mobile, where it splits into two rows) goes to
  // --search-toolbar-height; the filter panel sticks right below it
  useEffect(() => {
    const page = pageRef.current;
    const toolbar = toolbarRef.current;
    if (!page || !toolbar) return;
    const publish = () => page.style.setProperty('--search-toolbar-height', `${toolbar.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  // Text is typed into local state and only goes to the URL after a pause
  const urlText = params.get('q') ?? '';
  const [text, setText] = useState(urlText);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text.trim() === urlText) return;
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        if (text.trim()) next.set('q', text.trim());
        else next.delete('q');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [text, urlText, setParams]);

  const values: FilterValues = useMemo(() => ({
    lists: Object.fromEntries(LIST_FILTERS.map((f) => [f, parseIds(params.get(f))])) as Record<ListFilter, number[]>,
    yearFrom: params.get('yearFrom') ?? '',
    yearTo: params.get('yearTo') ?? '',
    minRating: Number(params.get('minRating') ?? 0) || 0,
  }), [params]);

  const sortParam = params.get('sort');
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : 'popular';

  // The query sent to the API: the URL minus whatever isn't valid
  const apiQuery = useMemo(() => {
    const query = new URLSearchParams();
    if (urlText) query.set('q', urlText);
    for (const filter of LIST_FILTERS) {
      if (values.lists[filter].length) query.set(filter, values.lists[filter].join(','));
    }
    const yearFrom = Number(values.yearFrom);
    const yearTo = Number(values.yearTo);
    if (yearFrom >= 1950 && yearFrom <= 2100) query.set('yearFrom', String(yearFrom));
    if (yearTo >= 1950 && yearTo <= 2100) query.set('yearTo', String(yearTo));
    if (values.minRating > 0) query.set('minRating', String(values.minRating));
    if (!urlText) query.set('sort', sort);
    return query.toString();
  }, [urlText, values, sort]);

  const { items, total, error, loading, hasMore, loadingMore, loadMore, retry } = useGameSearch(apiQuery);

  const update = (mutate: (next: URLSearchParams) => void) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      mutate(next);
      return next;
    }, { replace: true });

  const toggle = (filter: ListFilter, id: number) =>
    update((next) => {
      const current = parseIds(next.get(filter));
      const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      if (updated.length) next.set(filter, updated.join(','));
      else next.delete(filter);
    });

  const setYear = (which: 'yearFrom' | 'yearTo', value: string) =>
    update((next) => {
      if (value) next.set(which, value);
      else next.delete(which);
    });

  const setRating = (value: number) =>
    update((next) => {
      if (value > 0) next.set('minRating', String(value));
      else next.delete('minRating');
    });

  const setSort = (value: Sort) =>
    update((next) => {
      if (value === 'popular') next.delete('sort');
      else next.set('sort', value);
    });

  const clearFilters = () =>
    update((next) => {
      for (const key of [...LIST_FILTERS, 'yearFrom', 'yearTo', 'minRating']) next.delete(key);
    });

  // Active filter chips, with each option's name
  // One chip per active filter — the lists, the years and the minimum rating — each
  // with the action that removes it
  const activeChips = useMemo(() => {
    const chips: { key: string; name: string; remove: () => void }[] = [];
    for (const filter of LIST_FILTERS) {
      for (const id of values.lists[filter]) {
        chips.push({
          key: `${filter}-${id}`,
          name: filters?.[filter].find((o) => o.id === id)?.name ?? '…',
          remove: () => toggle(filter, id),
        });
      }
    }
    if (values.yearFrom) chips.push({ key: 'yearFrom', name: t('chipYearFrom', { year: values.yearFrom }), remove: () => setYear('yearFrom', '') });
    if (values.yearTo) chips.push({ key: 'yearTo', name: t('chipYearTo', { year: values.yearTo }), remove: () => setYear('yearTo', '') });
    if (values.minRating > 0) chips.push({ key: 'minRating', name: t('chipRating', { value: values.minRating }), remove: () => setRating(0) });
    return chips;
    // toggle/setYear/setRating only depend on setParams, which is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, values, t]);

  const activeCount = activeChips.length;

  return (
    <div className='Search' ref={pageRef}>
      <div className='Search_Toolbar' ref={toolbarRef}>
      <label className='Search_Field'>
        <span className='Search_Field_Icon' aria-hidden='true'><Icon.Search /></span>
        <input
          type='search'
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          autoFocus
        />
        {/* Always in place (only invisible without text), so the field doesn't move */}
        <button
          type='button'
          className={`Search_Field_Clear${text ? '' : ' hidden'}`}
          onClick={() => setText('')}
          aria-label={t('clear')}
          tabIndex={text ? 0 : -1}
          aria-hidden={!text}
        >
          <Icon.Close />
        </button>
      </label>

        <button type='button' className='Search_Filters_Toggle' onClick={() => setPanelOpen(true)}>
          {t('showFilters')}
          <span className={`Filter_Count${activeCount > 0 ? '' : ' hidden'}`}>{activeCount}</span>
        </button>

        <label className='Search_Sort' title={urlText ? t('sortTextHint') : undefined}>
          <span>{t('sort')}</span>
          <select value={urlText ? 'relevance' : sort} disabled={Boolean(urlText)} onChange={(e) => setSort(e.target.value as Sort)}>
            {urlText && <option value='relevance'>{t('sortRelevance')}</option>}
            {SORTS.map((key) => <option key={key} value={key}>{t(SORT_LABEL[key])}</option>)}
          </select>
        </label>
      </div>

      <div className='Search_Body'>
        <aside className={`Search_Filters${panelOpen ? ' open' : ''}`} aria-label={t('filters')}>
          <div className='Search_Filters_Head'>
            <h2>{t('filters')}</h2>
            <button
              type='button'
              className={`Search_Link${activeCount > 0 ? '' : ' hidden'}`}
              onClick={clearFilters}
              tabIndex={activeCount > 0 ? 0 : -1}
              aria-hidden={activeCount === 0}
            >
              {t('clearFilters')}
            </button>
            <button type='button' className='Search_Filters_Close' onClick={() => setPanelOpen(false)} aria-label={t('closeFilters')}>
              <Icon.Close />
            </button>
          </div>
          <Filter_Panel filters={filters} error={filtersError} values={values} onToggle={toggle} onYear={setYear} onRating={setRating} />
        </aside>
        {panelOpen && <button type='button' className='Search_Scrim' aria-label={t('closeFilters')} onClick={() => setPanelOpen(false)} />}

        <section className='Search_Results'>
          <div className='Search_Results_Head'>
            <span className='Search_Count' aria-live='polite'>
              {loading ? t('searching') : error ? '' : t('results', { count: total })}
            </span>

            <div className='Search_Active'>
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type='button'
                  className='Search_Active_Chip'
                  onClick={chip.remove}
                  aria-label={t('removeFilter', { name: chip.name })}
                >
                  {chip.name}
                  <Icon.Close />
                </button>
              ))}
            </div>

            {/* Always in place, only invisible without filters — the row doesn't move */}
            <button
              type='button'
              className={`Search_Remove_All${activeCount > 0 ? '' : ' hidden'}`}
              onClick={clearFilters}
              tabIndex={activeCount > 0 ? 0 : -1}
              aria-hidden={activeCount === 0}
            >
              {t('removeAll')}
            </button>
          </div>

          {error ? (
            <div className='Search_State'>
              <h3>{t('errorTitle')}</h3>
              <p>{error}</p>
              <button type='button' className='Search_Button' onClick={retry}>{t('retry')}</button>
            </div>
          ) : !loading && items.length === 0 ? (
            <div className='Search_State'>
              <h3>{t('noResultsTitle')}</h3>
              <p>{t('noResultsText')}</p>
              {activeCount > 0 && <button type='button' className='Search_Button' onClick={clearFilters}>{t('clearFilters')}</button>}
            </div>
          ) : (
            <div className='Search_Grid' aria-busy={loading}>
              {items.map((game) => <Game_Result key={game.id} game={game} />)}
            </div>
          )}

          {hasMore && !error && (
            <button type='button' className='Search_Button Search_More' onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? t('loadingMore') : t('loadMore')}
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

export default Search;
