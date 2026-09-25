import { LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';

export default function GlobalSearch({ token, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setResults([]); setLoading(false); return undefined; }
    const currentRequest = ++requestId.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api.globalSearch(token, value)
        .then((response) => { if (currentRequest === requestId.current) setResults(response.results || []); })
        .catch(() => { if (currentRequest === requestId.current) setResults([]); })
        .finally(() => { if (currentRequest === requestId.current) setLoading(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, token]);

  function choose(result) {
    onSelect(result, query.trim());
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  return <div className="global-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label className="global-search-input"><Search size={17} /><input value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Search products, leads, quotations…" aria-label="Search the entire CRM" />{loading ? <LoaderCircle className="global-search-spinner" size={16} /> : query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setResults([]); }}><X size={15} /></button>}</label>
    {open && query.trim().length >= 2 && <div className="global-search-results">
      {results.length ? results.map((result) => <button type="button" key={`${result.module}-${result.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(result)}><span className="global-search-module">{result.module}</span><span className="global-search-copy"><strong>{result.title}</strong><small>{result.subtitle || `Open in ${result.module}`}</small></span></button>) : !loading && <div className="global-search-empty">No matching records found.</div>}
    </div>}
  </div>;
}
