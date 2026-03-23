export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">⚖️</div>
        <p className="text-sm text-gray-400">Ładowanie...</p>
      </div>
    </div>
  );
}
