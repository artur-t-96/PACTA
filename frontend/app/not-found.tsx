import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Nie znaleziono</h2>
        <p className="text-sm text-gray-500 mb-4">Ta strona nie istnieje.</p>
        <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          Wróć do dashboardu
        </Link>
      </div>
    </div>
  );
}
