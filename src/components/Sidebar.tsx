const SectorWidget: React.FC<{ items: NewsItem[]; onSelectCategory: (category: string) => void }> = ({ items, onSelectCategory }) => {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    }
    return map;
  }, [items]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(CATEGORIES.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  const visibleCategories = CATEGORIES.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="widget-box">
      <h3 className="widget-title">
        <Layers size={16} /> Browse by Sector
      </h3>
      <ul className="trend-list">
        {visibleCategories.map((cat) => (
          <li key={cat}>
            <button type="button" className="trend-list-item" onClick={() => onSelectCategory(cat)}>
              <span className="trend-list-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                {cat}
                <small style={{ marginTop: 0 }}>{counts.get(cat) || 0}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {CATEGORIES.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            style={{ opacity: page === 1 ? 0.5 : 1, padding: '6px 10px', fontSize: '0.75rem' }}
          >
            Prev
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', fontWeight: 700 }}>
            {page}/{totalPages}
          </span>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            style={{ opacity: page === totalPages ? 0.5 : 1, padding: '6px 10px', fontSize: '0.75rem' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
