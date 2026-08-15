-- Relax the positive-amount check on event_expense_category_budgets so the
-- Budget Planner's new "Use default categories" seeding action (Financial
-- Suite -> Expenses -> Budget Planner) can insert the 8 standard categories
-- (same set as the public homepage cost estimator) at an unset $0 starting
-- budget for the organizer to fill in.
--
-- saveCategoryBudget() (the normal manual edit path) still rejects
-- amounts <= 0 client-side before it ever reaches this table, so a non-zero
-- budgeted_amount still means "an organizer deliberately set this" -- only
-- the new seedDefaultCategoryBudgets() bulk-insert path writes zero.
--
-- Forward-only. Deliberately not applied automatically.

alter table public.event_expense_category_budgets
  drop constraint event_expense_category_budgets_budgeted_amount_check;

alter table public.event_expense_category_budgets
  add constraint event_expense_category_budgets_budgeted_amount_check
  check (budgeted_amount >= 0);
