// Maps the /api/schedules `sort` query param to a Mongoose sort direction.
// Defaults to ascending (soonest-first) so every existing caller that
// doesn't pass `sort` keeps its original behavior.
export const resolveScheduleSortOrder = (sort) => {
  return typeof sort === "string" && sort.toLowerCase() === "desc" ? -1 : 1;
};
