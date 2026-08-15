import { CLASS_LEVELS, DISTRICTS } from "@/lib/constants";

const base =
  "w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function ClassSelect({
  name = "currentClass",
  value,
  defaultValue,
  required = true,
  disabled = false,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue} value={value} required={required} disabled={disabled} className={base}>
      <option value="" disabled>
        Select class / level
      </option>
      {CLASS_LEVELS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export function DistrictSelect({
  name = "district",
  defaultValue,
  required = false,
  disabled = false,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue} required={required} disabled={disabled} className={base}>
      <option value="">Select district</option>
      {DISTRICTS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
