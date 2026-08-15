import type { FinanceActivityLogEntry } from "@/services/financeActivityLogService";

type Data = Record<string, unknown> | null;
const str = (data: Data, key: string) => (data && typeof data[key] === "string" ? (data[key] as string) : undefined);
const num = (data: Data, key: string) => (data && typeof data[key] === "number" ? (data[key] as number) : undefined);

export type ActivityDescription = { text: string; badge?: string };

export function describeActivityEntry(entry: FinanceActivityLogEntry, formatTzs: (value: number) => string): ActivityDescription {
  const { action, previous_data: prev, new_data: next, metadata: meta, actor_name: actor } = entry;
  const contributor = entry.contributor_name ?? str(prev, "full_name") ?? str(next, "full_name");
  const forContributor = contributor ? ` for ${contributor}` : "";

  switch (action) {
    case "pledge_created": {
      const amount = num(next, "pledged_amount");
      return { text: `${actor} added ${contributor ?? "a new contributor"} (pledged ${amount !== undefined ? formatTzs(amount) : "an amount"})` };
    }
    case "pledge_updated": {
      const fields = ["full_name", "phone", "email", "pledged_amount", "notes"].filter(
        (key) => prev && next && JSON.stringify(prev[key]) !== JSON.stringify(next[key])
      );
      return { text: `${actor} updated ${contributor ?? "a contributor"}'s pledge${fields.length ? ` (${fields.join(", ")})` : ""}` };
    }
    case "pledge_cancelled": {
      const reason = str(next, "cancellation_reason");
      return { text: `${actor} cancelled ${contributor ?? "a contributor"}'s pledge${reason ? ` — reason: ${reason}` : ""}` };
    }
    case "pledge_restored":
      return { text: `${actor} restored ${contributor ?? "a contributor"}'s cancelled pledge` };
    case "pledge_deleted_permanently":
    case "pledge_deleted_permanently_with_payments": {
      const count = num(prev, "deleted_payment_count");
      const total = num(prev, "deleted_payment_total");
      const withPayments = action === "pledge_deleted_permanently_with_payments" && count;
      return {
        text: `${actor} permanently deleted ${contributor ?? "a contributor"}${withPayments ? `, along with ${count} payment record${count === 1 ? "" : "s"} totaling ${formatTzs(total ?? 0)}` : ""}`,
        badge: "Admin action",
      };
    }
    case "payment_recorded": {
      const amount = num(next, "amount");
      const method = str(next, "payment_method");
      return { text: `${actor} recorded a payment of ${amount !== undefined ? formatTzs(amount) : "an amount"}${method ? ` via ${method.replaceAll("_", " ")}` : ""}${forContributor}` };
    }
    case "payment_voided": {
      const amount = num(next, "amount") ?? num(prev, "amount");
      const reason = str(next, "void_reason");
      return { text: `${actor} voided a payment of ${amount !== undefined ? formatTzs(amount) : "an amount"}${forContributor}${reason ? ` — reason: ${reason}` : ""}` };
    }
    case "payment_corrected": {
      const prevAmount = num(prev, "amount");
      const nextAmount = num(next, "amount");
      const changed = prevAmount !== undefined && nextAmount !== undefined && prevAmount !== nextAmount;
      return { text: `${actor} corrected a payment${forContributor}${changed ? ` from ${formatTzs(prevAmount)} to ${formatTzs(nextAmount)}` : ""}` };
    }
    case "expense_recorded": {
      const amount = num(next, "amount");
      const category = str(next, "category");
      return { text: `${actor} recorded an expense of ${amount !== undefined ? formatTzs(amount) : "an amount"}${category ? ` for ${category}` : ""}` };
    }
    case "expense_corrected": {
      const prevAmount = num(prev, "amount");
      const nextAmount = num(next, "amount");
      const reason = str(meta, "correction_reason");
      const changed = prevAmount !== undefined && nextAmount !== undefined && prevAmount !== nextAmount;
      return { text: `${actor} corrected an expense${changed ? ` from ${formatTzs(prevAmount)} to ${formatTzs(nextAmount)}` : ""}${reason ? ` — reason: ${reason}` : ""}` };
    }
    case "expense_voided": {
      const amount = num(prev, "amount");
      const category = str(prev, "category");
      const reason = str(next, "void_reason");
      return { text: `${actor} voided an expense of ${amount !== undefined ? formatTzs(amount) : "an amount"}${category ? ` (${category})` : ""}${reason ? ` — reason: ${reason}` : ""}` };
    }
    case "pledge_import_completed": {
      const imported = num(meta, "imported_rows");
      const skipped = num(meta, "skipped_rows");
      return { text: `${actor} imported ${imported ?? 0} contributor${imported === 1 ? "" : "s"} from Excel${skipped ? ` (${skipped} skipped)` : ""}` };
    }
    case "bulk_contributions_cleanup": {
      const cleanupAction = str(meta, "cleanup_action");
      const deleted = num(meta, "deleted_pledges") ?? 0;
      const cancelled = num(meta, "cancelled_pledges") ?? 0;
      const reason = str(meta, "reason");
      const isCancelOnly = cleanupAction === "cancel_all";
      const verb = isCancelOnly ? "cancelled" : "deleted";
      const count = isCancelOnly ? cancelled : deleted;
      return {
        text: `${actor} ${verb} ${count} contribution${count === 1 ? "" : "s"} in bulk${reason ? ` — reason: ${reason}` : ""}`,
        badge: isCancelOnly ? undefined : "Admin action",
      };
    }
    case "organiser_link_created": {
      const label = str(next, "label");
      return { text: `${actor} created a committee access link${label ? ` "${label}"` : ""}` };
    }
    case "organiser_link_revoked": {
      const label = str(next, "label");
      return { text: `${actor} revoked the committee access link${label ? ` "${label}"` : ""}` };
    }
    default:
      return { text: `${actor} performed ${action.replaceAll("_", " ")}` };
  }
}
