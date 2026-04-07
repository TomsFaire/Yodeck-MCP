/** Pagination envelope returned by Yodeck list endpoints */
export type Paginated<T = unknown> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
