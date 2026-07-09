type CardProps = {
  title: string;
  value: string | number;
};

export default function Card({ title, value }: CardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-gray-500 text-sm">
        {title}
      </h2>

      <p className="text-4xl font-bold text-blue-700 mt-2">
        {value}
      </p>
    </div>
  );
}