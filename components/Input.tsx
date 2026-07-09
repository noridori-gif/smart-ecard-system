type InputProps = {
  label: string;
  type?: string;
  placeholder?: string;
};

export default function Input({
  label,
  type = "text",
  placeholder,
}: InputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}