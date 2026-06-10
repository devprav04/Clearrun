import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Clock, Wrench, TestTube, FileText } from 'lucide-react';
import api from '../api/axios';
import { Button } from '@/components/ui/button';

const TYPE_META = {
  amc_expiry:      { icon: FileText,      color: 'var(--red)',    label: 'AMC Expiry'   },
  calibration_due: { icon: TestTube,      color: 'var(--purple)', label: 'Calibration'  },
  maintenance_due: { icon: Wrench,        color: 'var(--blue)',   label: 'Maintenance'  },
  breakdown:       { icon: AlertTriangle, color: 'var(--orange)', label: 'Breakdown'    },
};

const URGENT_COLORS = { red: 'var(--red)', orange: 'var(--orange)', yellow: 'var(--yellow)', purple: 'var(--purple)', blue: 'var(--blue)' };

const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function MaintenanceCalendar() {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('reports/calendar/').then(r => setEvents(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const eventsByDate = {};
  events.forEach(ev => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });

  const selectedKey = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,'0')}-${String(selectedDay.getDate()).padStart(2,'0')}`
    : null;
  const selectedEvents = selectedKey ? (eventsByDate[selectedKey] || []) : [];

  const upcoming = events
    .filter(ev => { const diff = Math.ceil((new Date(ev.date) - today) / 86400000); return diff >= 0 && diff <= 30; })
    .slice(0, 8);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 16 }}>

        {/* ── Calendar grid ───────────────────────────────────── */}
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tx-1)' }}>
              <CalendarDays size={15} color="var(--tx-3)" />
              {MONTH_NAMES[month]} {year}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrent(new Date(year, month-1, 1))} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]">
                <ChevronLeft size={13} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))} className="border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrent(new Date(year, month+1, 1))} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]">
                <ChevronRight size={13} />
              </Button>
            </div>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tx-3)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Grid cells */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p className="t-body">Loading events…</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {cells.map((day, i) => {
                if (!day) return (
                  <div key={i} style={{ background: 'var(--bg-3)', minHeight: 72 }} />
                );
                const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
                const dayEvents = eventsByDate[key] || [];
                const isToday    = isSameDay(day, today);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <div key={i} onClick={() => setSelectedDay(isSelected ? null : day)} style={{
                    background: isSelected ? 'color-mix(in srgb,var(--blue) 8%,var(--bg-2))' : 'var(--bg-2)',
                    minHeight: 72, padding: 6, cursor: 'pointer', transition: 'background .1s',
                    outline: isSelected ? '2px solid var(--blue)' : 'none', outlineOffset: -2,
                  }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-3)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-2)'; }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: isToday ? 700 : 400, marginBottom: 4,
                      background: isToday ? 'var(--tx-1)' : 'transparent',
                      color: isToday ? 'var(--bg)' : 'var(--tx-2)',
                    }}>
                      {day.getDate()}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {dayEvents.slice(0, 3).map((ev, ei) => (
                        <div key={ei} title={ev.title} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: URGENT_COLORS[ev.color] || 'var(--blue)',
                        }} />
                      ))}
                      {dayEvents.length > 3 && <span style={{ fontSize: '0.6rem', color: 'var(--tx-3)' }}>+{dayEvents.length-3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected day events */}
          {selectedDay && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tx-1)', marginBottom: 10 }}>
                {selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {selectedEvents.length === 0
                ? <p className="t-body">No events on this day.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedEvents.map(ev => {
                      const meta = TYPE_META[ev.type] || TYPE_META.maintenance_due;
                      const Icon = meta.icon;
                      return (
                        <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                          <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: `color-mix(in srgb,${meta.color} 15%,transparent)`, border: `1px solid color-mix(in srgb,${meta.color} 30%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={12} color={meta.color} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>{ev.title}</p>
                            <p className="t-small">{ev.detail}</p>
                          </div>
                          {ev.urgent && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb,var(--red) 10%,transparent)', color: 'var(--red)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', flexShrink: 0 }}>
                              Urgent
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                <span className="t-small">{meta.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upcoming events panel ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={14} color="var(--orange)" />
            <span className="t-title">Upcoming (30 days)</span>
          </div>

          {loading ? (
            <p className="t-body">Loading…</p>
          ) : upcoming.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '32px 0', textAlign: 'center' }}>
              <CalendarDays size={32} color="var(--tx-3)" style={{ marginBottom: 8, opacity: .4 }} />
              <p className="t-body">No upcoming events</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
              {upcoming.map(ev => {
                const meta = TYPE_META[ev.type] || TYPE_META.maintenance_due;
                const Icon = meta.icon;
                const daysAway = Math.ceil((new Date(ev.date) - today) / 86400000);
                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: ev.urgent ? 'color-mix(in srgb,var(--red) 5%,transparent)' : 'var(--bg-3)',
                    border: `1px solid ${ev.urgent ? 'color-mix(in srgb,var(--red) 20%,transparent)' : 'var(--line)'}`,
                    borderRadius: 'var(--r-md)',
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: `color-mix(in srgb,${meta.color} 12%,transparent)`, border: `1px solid color-mix(in srgb,${meta.color} 25%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tx-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                      <p className="t-small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.detail}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: daysAway === 0 ? 'var(--red)' : daysAway <= 7 ? 'var(--orange)' : 'var(--tx-2)' }}>
                        {daysAway === 0 ? 'Today' : `${daysAway}d`}
                      </p>
                      <p className="t-small">{new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
