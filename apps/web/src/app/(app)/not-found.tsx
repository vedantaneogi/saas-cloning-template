export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <h2 className="text-xl font-semibold" style={{ color: '#1B0A3C' }}>Page not found</h2>
      <p className="text-gray-500 text-sm">The page you're looking for doesn't exist.</p>
    </div>
  );
}
