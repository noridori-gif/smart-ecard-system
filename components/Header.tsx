export default function Header() {
  return (
    <header className="bg-white shadow-sm rounded-xl p-5 flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Dashboard
        </h2>

        <p className="text-gray-500 text-sm">
          Welcome back to Smart Event Pass
        </p>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-2xl">
          🔔
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold">
            N
          </div>

          <div>
            <p className="font-semibold">
              Noriega
            </p>

            <p className="text-xs text-gray-500">
              Administrator
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}