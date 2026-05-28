import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateItinerary } from '../services/api';
import { saveTrip } from '../services/storage';

const STYLES = ['综合', '历史文化', '自然风光', '美食之旅', '休闲度假', '网红打卡', '亲子游'];
const BUDGETS = [1500, 3000, 5000, 8000, 12000, 20000];
const DAYS = [2, 3, 4, 5, 7, 10];

export default function Home({ trips, prefs }) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(prefs?.days || 3);
  const [budget, setBudget] = useState(prefs?.budget || 3000);
  const [style, setStyle] = useState(prefs?.style || '综合');
  const [dates, setDates] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!destination.trim()) { setError('请输入一个目的地'); return; }
    setError('');
    setLoading(true);
    try {
      const content = await generateItinerary({ destination, days, budget, style, dates });
      const trip = await saveTrip({ id: Date.now(), destination: destination.trim(), days, budget, style, dates, content });
      navigate(`/plan/${trip.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [destination, days, budget, style, dates, navigate]);

  // Quick suggestions
  const suggestions = ['成都', '云南', '西安', '厦门', '桂林', '张家界'];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Organic blobs ── */}
      <div className="blob w-72 h-72 bg-clay-glow -top-24 -right-16 animate-blob" style={{animationDelay:'0s'}} />
      <div className="blob w-48 h-48 bg-sage-glow top-1/3 -left-20 animate-blob" style={{animationDelay:'-4s'}} />
      <div className="blob w-36 h-36 bg-blush-light bottom-20 right-10 animate-blob" style={{animationDelay:'-8s', animationDuration:'15s'}} />

      <div className="relative z-10 px-5 pt-8 pb-4">
        {/* ── Hero ── */}
        <div className="mb-8 animate-fade-up">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-clay mb-3 font-medium">
            AI-powered travel planner
          </p>
          <h1 className="font-display text-5xl italic font-bold leading-[1.1] tracking-tight text-warm-ink">
            旅行<span className="text-clay">管家</span>
          </h1>
          <p className="font-body text-warm-muted mt-3 text-[15px] leading-relaxed max-w-xs">
            每一次出发，都值得被认真对待。<br/>
            AI 为您编织独一无二的旅途。
          </p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 p-4 bg-red-50/80 rounded-2xl text-sm text-red-600 animate-fade-in font-sans border border-red-100">
            {error}
          </div>
        )}

        {/* ── Main Card ── */}
        <div className="card grain-card mb-6 animate-fade-up stagger-1">
          {/* Destination */}
          <label className="font-sans text-[11px] tracking-[0.18em] uppercase text-warm-muted mb-3 block font-medium">
            你想去哪里？
          </label>
          <input
            className="input-field mb-3"
            placeholder="例如：成都 + 九寨沟"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            autoFocus
          />
          {/* Quick pick */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {suggestions.map(s => (
              <button key={s} onClick={() => setDestination(s)} className="font-sans text-xs px-3 py-1.5 rounded-full transition-all text-warm-muted hover:text-clay hover:bg-clay-glow">
                {s}
              </button>
            ))}
          </div>

          {/* Days */}
          <label className="font-sans text-[11px] tracking-[0.18em] uppercase text-warm-muted mb-2 block font-medium">天数</label>
          <div className="flex gap-2 mb-5">
            {DAYS.map(d => (
              <button key={d} className={`chip ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{d} 天</button>
            ))}
          </div>

          {/* Budget */}
          <label className="font-sans text-[11px] tracking-[0.18em] uppercase text-warm-muted mb-2 block font-medium">预算 / 人</label>
          <div className="flex flex-wrap gap-2 mb-5">
            {BUDGETS.map(b => (
              <button key={b} className={`chip ${budget === b ? 'active' : ''}`} onClick={() => setBudget(b)}>¥{b.toLocaleString()}</button>
            ))}
          </div>

          {/* Style */}
          <label className="font-sans text-[11px] tracking-[0.18em] uppercase text-warm-muted mb-2 block font-medium">旅行风格</label>
          <div className="flex flex-wrap gap-2 mb-5">
            {STYLES.map(s => (
              <button key={s} className={`chip ${style === s ? 'active' : ''}`} onClick={() => setStyle(s)}>{s}</button>
            ))}
          </div>

          {/* Date */}
          <label className="font-sans text-[11px] tracking-[0.18em] uppercase text-warm-muted mb-2 block font-medium">出发日期</label>
          <input className="input-field" type="date" value={dates} onChange={e => setDates(e.target.value)} />
        </div>

        {/* ── Generate ── */}
        <button className="btn-primary w-full flex items-center justify-center gap-2 animate-fade-up stagger-2" onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="font-sans">正在为你编织旅途...</span>
            </>
          ) : (
            <span className="font-sans">✨ 生成旅行计划</span>
          )}
        </button>

        {/* ── History ── */}
        {trips.length > 0 && (
          <div className="mt-8 animate-fade-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl italic text-warm-ink">往日足迹</h2>
              <span className="font-sans text-xs text-warm-muted">{trips.length} 段旅程</span>
            </div>
            <div className="space-y-3">
              {trips.slice(0, 5).map((trip, i) => (
                <button
                  key={trip.id}
                  className="card hotel-card w-full text-left"
                  onClick={() => navigate(`/plan/${trip.id}`)}
                  style={{ animationDelay: `${0.3 + i * 0.05}s` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display text-lg italic tracking-tight">{trip.destination}</h3>
                      <p className="font-sans text-[13px] text-warm-muted mt-1">
                        {trip.days} 天 · ¥{trip.budget?.toLocaleString()} · {trip.style}
                      </p>
                    </div>
                    <span className="font-sans text-[11px] text-warm-muted mt-1">
                      {new Date(trip.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer breathing space ── */}
        <div className="h-6" />
      </div>
    </div>
  );
}
