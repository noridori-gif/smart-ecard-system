type ButtonProps = {
  text: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export default function Button({
  text,
  onClick,
  type = "button",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-blue-600 px-6 py-3 text-white transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
    >
      {text}
    </button>
  );
}