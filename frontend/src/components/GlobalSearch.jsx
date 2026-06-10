import { useState, useRef, useEffect } from 'react';
import { Search, FlaskConical, Truck, ClipboardList, Package, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInstruments, useVendors, useTickets, useParts } from '../hooks/queries';

const TYPE_META = {
  instrument: { Icon: FlaskConical, color: 'var(--blue)',   label: 'Instrument' },
  vendor:     { Icon: Truck,        color: 'var(--green)',  label: 'Vendor'     },
  ticket:     { Icon: ClipboardList,color: 'var(--orange)', label: 'Ticket'     },
  part:       { Icon: Package,      color: 'var(--purple)', label: 'Part'       },
};

export default function GlobalSearch() {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef();
  const navigate = useNavigate();

  const { data: instruments = [] } = useInstruments();
  const { data: vendors     = [] } = useVendors();
  const { data: tickets     = [] } = useTickets();
  const { data: parts       = [] } = useParts();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const q = query.toLowerCase().trim();

  const results = q.length < 2 ? [] : [
    ...instruments
      .filter(i => i.name?.toLowerCase().includes(q) || i.serial_number?.toLowerCase().includes(q) || i.model?.toLowerCase().includes(q))
      .slice(0, 4)
      .map(i => ({ type: 'instrument', label: i.name, sub: `${i.serial_number} · ${i.location || ''}`, to: `/instruments/${i.id}` })),
    ...vendors
      .filter(v => v.name?.toLowerCase().includes(q) || v.contact_email?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(v => ({ type: 'vendor', label: v.name, sub: v.contact_email || v.phone, to: '/vendors' })),
    ...parts
      .filter(p => p.name?.toLowerCase().includes(q) || p.part_number?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(p => ({ type: 'part', label: p.name, sub: p.part_number, to: '/inventory' })),
    ...tickets
      .filter(t => t.description?.toLowerCase().includes(q) || t.instrument_name?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(t => ({ type: 'ticket', label: `Ticket #${t.id} — ${t.instrument_name || ''}`, sub: t.description, to: '/maintenance' })),
  ];

  const go = (to) => { navigate(to); setOpen(false); setQuery(''); };
  const close = () => { setOpen(false); setQuery(''); };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 32,
          padding: '0 10px', borderRadius: 'var(--r-md)',
          background: 'var(--bg-2)', border: '1px solid var(--line-2)',
          color: 'var(--tx-3)', cursor: 'pointer', transition: 'all .12s',
          fontSize: '0.8125rem', minWidth: 160,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--tx-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--tx-3)'; }}
      >
        <Search size={13} />
        <span style={{ flex: 1 }}>Search…</span>
        <kbd style={{ fontSize: '0.6rem', opacity: .55, fontFamily: 'monospace', padding: '1px 5px', border: '1px solid var(--line-2)', borderRadius: 3 }}>⌘K</kbd>
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)' }}
            onClick={close}
          />
          <div style={{
            position: 'fixed', top: '14vh', left: '50%', transform: 'translateX(-50%)',
            width: 'min(580px, calc(100vw - 32px))',
            background: 'var(--bg-2)', border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-xl)', boxShadow: '0 24px 60px rgba(0,0,0,.45)',
            zIndex: 200, overflow: 'hidden',
          }}>
            {/* Input row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
              <Search size={16} color="var(--tx-3)" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search instruments, vendors, parts, tickets…"
                autoFocus
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.9375rem', color: 'var(--tx-1)' }}
              />
              {query ? (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex', padding: 2 }}>
                  <X size={14} />
                </button>
              ) : (
                <kbd style={{ fontSize: '0.65rem', color: 'var(--tx-3)', fontFamily: 'monospace', padding: '2px 6px', border: '1px solid var(--line-2)', borderRadius: 3 }}>ESC</kbd>
              )}
            </div>

            {/* Results */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {q.length < 2 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <Search size={28} color="var(--tx-3)" style={{ margin: '0 auto 8px', opacity: .3, display: 'block' }} />
                  <p style={{ fontSize: '0.8125rem', color: 'var(--tx-3)' }}>Type at least 2 characters</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--tx-3)', marginTop: 4, opacity: .6 }}>Searches instruments, vendors, parts & tickets</p>
                </div>
              ) : results.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--tx-3)' }}>No results for <strong style={{ color: 'var(--tx-1)' }}>"{query}"</strong></p>
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  {results.map((r, i) => {
                    const { Icon, color, label } = TYPE_META[r.type];
                    return (
                      <button
                        key={i}
                        onClick={() => go(r.to)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '8px 10px', borderRadius: 'var(--r-md)',
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        }}>
                          <Icon size={14} color={color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--tx-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</p>
                          {r.sub && <p style={{ fontSize: '0.7rem', color: 'var(--tx-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{r.sub}</p>}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: color, fontWeight: 600, background: `color-mix(in srgb, ${color} 10%, transparent)`, padding: '2px 7px', borderRadius: 9999, flexShrink: 0 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
