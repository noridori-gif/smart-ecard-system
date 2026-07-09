type ButtonProps = {
  text: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

export default function Button({
  text,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
    >
      {text}
    </button>
  );
}