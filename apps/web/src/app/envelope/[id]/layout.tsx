// Full-screen layout for envelope editor — no app navbar, no sidebar
export default function EnvelopeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  );
}
