import { QUESTION_POOL_BATCH2 } from './forum-bot-questions-batch2';

/** QUESTION_POOL is not exported; count via batch + known base size from regression. */
const BASE_POOL_SIZE = 113;

const VALID_SLUGS = new Set([
  'resmi-islemler',
  'ev-bulma',
  'is-bulma',
  'saglik',
  'egitim',
  'hukuk',
  'vergi',
  'almanca',
]);

describe('Forum bot question pool batch 2', () => {
  it('adds 92 unused questions with valid category slugs', () => {
    expect(QUESTION_POOL_BATCH2).toHaveLength(92);
    for (const q of QUESTION_POOL_BATCH2) {
      expect(VALID_SLUGS.has(q.categorySlug)).toBe(true);
      expect(q.title.trim().length).toBeGreaterThan(0);
      expect(q.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('has unique titles within batch 2', () => {
    const titles = QUESTION_POOL_BATCH2.map((q) => q.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('extends total pool to 205 questions after deploy', () => {
    expect(BASE_POOL_SIZE + QUESTION_POOL_BATCH2.length).toBe(205);
  });
});
