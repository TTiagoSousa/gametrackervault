import { buildSearchQuery } from './buildSearchQuery';

describe('buildSearchQuery', () => {
  it('pesquisa por texto sem ordem própria', () => {
    const { query, countQuery } = buildSearchQuery({ q: 'zelda' });
    expect(query).toContain('search "zelda";');
    expect(query).not.toContain('sort ');
    expect(query).toContain('limit 24; offset 0;');
    expect(countQuery).toBe('search "zelda";');
  });

  it('escapa aspas e barras do texto', () => {
    const { query } = buildSearchQuery({ q: 'say "hi" \\o/' });
    expect(query).toContain('search "say \\"hi\\" \\\\o/";');
  });

  it('junta os filtros com & e usa "qualquer de" nas listas', () => {
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

  it('converte o intervalo de anos para Unix time', () => {
    const { query } = buildSearchQuery({ yearFrom: 2020, yearTo: 2020 });
    expect(query).toContain(
      `first_release_date >= ${Date.UTC(2020, 0, 1) / 1000}`,
    );
    expect(query).toContain(
      `first_release_date < ${Date.UTC(2021, 0, 1) / 1000}`,
    );
  });

  it('sem texto ordena por popularidade sobre o catálogo inteiro', () => {
    const { query, countQuery } = buildSearchQuery({});
    expect(query).not.toContain('where ');
    expect(query).toContain('sort total_rating_count desc;');
    expect(countQuery).toBe('');
  });

  it('sem texto, "relevance" vale como popularidade', () => {
    const { query } = buildSearchQuery({ sort: 'relevance' });
    expect(query).toContain('sort total_rating_count desc;');
  });

  it('na melhor nota exige um mínimo de avaliações', () => {
    const { query } = buildSearchQuery({ sort: 'rating' });
    expect(query).toContain('where total_rating_count >= 25;');
    expect(query).toContain('sort total_rating desc;');
  });

  it('nos mais recentes deixa de fora os ainda não lançados', () => {
    const { query } = buildSearchQuery({ sort: 'newest' });
    expect(query).toMatch(/where first_release_date <= \d+;/);
    expect(query).toContain('sort first_release_date desc;');
  });

  it('calcula o offset a partir da página', () => {
    const { query } = buildSearchQuery({ q: 'mario', page: 3, pageSize: 10 });
    expect(query).toContain('limit 10; offset 20;');
  });
});
