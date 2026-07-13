type InputProps = {
  label: string;
  type?: string;
  placeholder?: string;
  name: string;
  value: string;
  required?: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

export default function Input({
  label,
  type = "text",
  placeholder,
  name,
  value,
  required = false,
  onChange,
}: InputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 caret-blue-600 shadow-sm outline-none [color-scheme:light] placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}