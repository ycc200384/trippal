import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip } from '../services/storage';
import { getWeather } from '../services/api';

export default function Plan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrip(id).then(t => {
      setTrip(t); setLoading(false);
      if (t) getWeather(t.destination).then(setWeather).catch(() => {});
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-2 border-clay/20 border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-5 text-center">
        <div className="font-display text-6xl italic text-warm-muted/30">404</div>
        <p className="font-body text-warm-muted">这段旅程已经不见了</p>
        <button className="btn-primary" onClick={() => navigate('/')}>回到首页</button>
      </div>
    );
  }

  const renderMarkdown = (md) => {
    if (!md) return '';
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 class="font-display text-lg italic mt-6 mb-2 text-warm-ink">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-display text-xl italic mt-8 mb-3 pb-2 text-clay" style="border-bottom:1px solid rgba(199,91,57,0.12)">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="font-display text-2xl italic mt-8 mb-4 text-clay-dark">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-warm-ink">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="font-body ml-4 text-warm-ink/80 leading-relaxed">$1</li>')
      .replace(/^(\d+)[、.]\s*(.+)$/gm, '<div class="flex gap-2 mt-1.5 font-body"><span class="day-badge flex-shrink-0" style="width:28px;height:28px;font-size:13px">$1</span><span class="text-warm-ink/80">$2</span></div>')
      .replace(/\n\n/g, '<br/>');
  };

  return (
    <div className="relative min-h-screen">
      {/* Decorative blob */}
      <div className="blob w-56 h-56 bg-clay-glow -top-20 right-0 animate-blob" style={{animationDelay:'-2s'}} />

      <div className="relative z-10 px-5 pt-6 pb-4">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-up">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/60 backdrop-blur flex items-center justify-center active:scale-90 transition-transform shadow-sm">
            <svg className="w-5 h-5 text-warm-ink" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl italic tracking-tight">{trip.destination}</h1>
            <p className="font-sans text-[13px] text-warm-muted mt-0.5">{trip.days}天 · ¥{trip.budget?.toLocaleString()} · {trip.style}</p>
          </div>
        </div>

        {/* Weather */}
        {weather && weather.length > 0 && (
          <div className="overflow-x-auto mb-6 animate-fade-up stagger-2 -mx-5 px-5">
            <div className="flex gap-4 pb-2">
              {weather.slice(0, 7).map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[56px]">
                  <span className="font-sans text-[10px] text-warm-muted tracking-wider">{d.date?.slice(5)}</span>
                  <img src={d.icon} alt={d.text} className="w-9 h-9 weather-glow" />
                  <span className="font-display text-sm font-bold text-warm-ink">{d.tempMax}°</span>
                  <span className="font-mono text-[10px] text-warm-muted">{d.tempMin}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="card grain-card animate-fade-up stagger-3 font-body text-[15px] leading-[1.8] text-warm-ink/85">
          <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(trip.content) }} />
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
