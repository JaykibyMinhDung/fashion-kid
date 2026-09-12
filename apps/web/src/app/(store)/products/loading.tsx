export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-4 w-32 rounded bg-surface-soft" />
      <div className="mt-4 h-11 max-w-xl rounded bg-surface-soft" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index}>
            <div className="aspect-square rounded-[1.75rem] bg-surface-soft" />
            <div className="mt-4 h-4 w-2/3 rounded bg-surface-soft" />
            <div className="mt-3 h-4 w-1/3 rounded bg-surface-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
