"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Coś poszło nie tak</h2>
        <p className="text-sm text-gray-500 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  );
}
