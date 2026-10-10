import { buildSearchQuery } from './buildSearchQuery';

describe('buildSearchQuery', () => {
  it('searches by text without its own order', () => {
    const { query, countQuery } = buildSearchQuery({ q: 'zelda' });
    expect(query).toContain('search "zelda";');
    expect(query).not.toContain('sort ');
    expect(query).toContain('limit 24; offset 0;');
    expect(countQuery).toBe('search "zelda";');
  });

  it('escapes quotes and backslashes in the text', () => {
    const { query } = buildSearchQuery({ q: 'say "hi" \\o/' });
    expect(query).toContain('search "say \\"hi\\" \\\\o/";');
  });

  it('joins filters with & and uses "any of" for lists', () => {
    const { query } = buildSearchQuery({
      platforms: [6, 48],
      genres: [12],
      minRating: 80,
      sort: 'rating',
    });
    expect(query).toContain(
      'where platforms = (6,48) & genres = (12) & total_rating >= 80 & total_rating_count >= 25;',
    );
    expect(query).toContain('sort total_rating desc;');
  });

  it('converts the year range to Unix time', () => {
    const { query } = buildSearchQuery({ yearFrom: 2020, yearTo: 2020 });
    expect(query).toContain(
      `first_release_date >= ${Date.UTC(2020, 0, 1) / 1000}`,
    );
    expect(query).toContain(
      `first_release_date < ${Date.UTC(2021, 0, 1) / 1000}`,
    );
  });

  it('without text sorts by popularity over the whole catalogue', () => {
    const { query, countQuery } = buildSearchQuery({});
    expect(query).not.toContain('where ');
    expect(query).toContain('sort total_rating_count desc;');
    expect(countQuery).toBe('');
  });

  it('without text, "relevance" counts as popularity', () => {
    const { query } = buildSearchQuery({ sort: 'relevance' });
    expect(query).toContain('sort total_rating_count desc;');
  });

  it('top rated requires a minimum number of ratings', () => {
    const { query } = buildSearchQuery({ sort: 'rating' });
    expect(query).toContain('where total_rating_count >= 25;');
    expect(query).toContain('sort total_rating desc;');
  });

  it('newest leaves out unreleased games', () => {
    const { query } = buildSearchQuery({ sort: 'newest' });
    expect(query).toMatch(/where first_release_date <= \d+;/);
    expect(query).toContain('sort first_release_date desc;');
  });

  it('computes the offset from the page', () => {
    const { query } = buildSearchQuery({ q: 'mario', page: 3, pageSize: 10 });
    expect(query).toContain('limit 10; offset 20;');
  });
});
