import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeatherByCoord, adjustForWeather } from '../services/api';

export default function Today({ trips, prefs }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null); // { lat, lon, city }
  const [weather, setWeather] = useState(null);
  const [weatherAdvice, setWeatherAdvice] = useState('');
  const [activeTrip, setActiveTrip] = useState(null);

  // Geolocation with IP fallback
  useEffect(() => {
    let resolved = false;
    const handleGeo = (city) => { if (!resolved) { resolved = true; setLocation({ city }); } };

    // 1. Try browser geolocation (5s timeout)
    if (navigator.geolocation) {
      const timeout = setTimeout(() => {
        // Timed out — try IP
        fetch('https://ipapi.co/json/').then(r => r.json()).then(d => handleGeo(d.city || d.region || '未知')).catch(() => handleGeo('点击选择城市'));
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          clearTimeout(timeout);
          const { latitude, longitude } = pos.coords;
          // Get weather
          const w = await getWeatherByCoord(latitude, longitude);
          if (w) setWeather(w);
          // IP reverse
          fetch('https://ipapi.co/json/').then(r => r.json()).then(d => handleGeo(d.city || d.region || '当前位置')).catch(() => handleGeo('当前位置'));
        },
        () => {
          clearTimeout(timeout);
          fetch('https://ipapi.co/json/').then(r => r.json()).then(d => handleGeo(d.city || d.region || '未知')).catch(() => handleGeo('点击选择城市'));
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      // No geolocation API — IP only
      fetch('https://ipapi.co/json/').then(r => r.json()).then(d => handleGeo(d.city || d.region || '未知')).catch(() => handleGeo('点击选择城市'));
    }
  }, []);

  // Active trip - parse content
  useEffect(() => {
    if (trips.length > 0) {
      const latest = trips[0];
      setActiveTrip(latest);
      if (weather && latest?.content) {
        adjustForWeather(latest.content.slice(0, 500), `${weather.text} ${weather.temp}°C`).then(setWeatherAdvice).catch(() => {});
      }
    }
  }, [trips, weather]);

  // Try to extract today's itinerary from either JSON or markdown
  let todayPlan = null;
  let todayJson = null;
  if (activeTrip) {
    // Try JSON first
    try {
      const m = activeTrip.content.match(/\{[\s\S]*\}/);
      if (m) {
        const d = JSON.parse(m[0]);
        if (d.days?.[0]) { todayJson = d; todayPlan = d.days[0]; }
      }
    } catch {}
    // Fallback: markdown
    if (!todayPlan) {
      const md = activeTrip.content;
      const match = md.match(/(?:第[1一]天|Day\s*1|第一天)[\s\S]{0,800}/i);
      todayPlan = match ? match[0].replace(/\n/g,'<br/>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>') : md.slice(0,600).replace(/\n/g,'<br/>')+'...';
    }
  }

  return (
    <div style={{position:'relative',background:'#FBF7F0',minHeight:'100vh',overflow:'hidden'}}>
      {/* Weather blobs */}
      <div className="blob w-48 h-48 animate-blob" style={{background:weather&&weather.text.includes('雨')?'rgba(148,163,184,0.08)':'rgba(212,168,83,0.1)',top:'-4rem',right:'-2rem',position:'absolute',animationDelay:'0s'}} />
      <div className="blob w-64 h-64 animate-blob" style={{background:weather&&weather.text.includes('晴')?'rgba(212,168,83,0.06)':'rgba(200,200,200,0.04)',top:'30%',left:'-3rem',position:'absolute',animationDelay:'-4s'}} />

      <div style={{position:'relative',zIndex:1,padding:'1.5rem 1.25rem'}}>
        {/* Top bar: location + weather */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem'}}>
          <div className="animate-fade-up">
            <p style={{fontSize:'0.7rem',letterSpacing:'0.2em',textTransform:'uppercase',color:'#C75B39',fontWeight:500,marginBottom:'0.25rem'}}>{location?.city || '获取位置中...'}</p>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontStyle:'italic',fontWeight:700,color:'#2D2A26'}}>今日</h1>
          </div>
          {weather && (
            <div className="animate-fade-up stagger-1" style={{textAlign:'right'}}>
              <div style={{fontSize:'2rem',fontWeight:200,lineHeight:1,color:'#2D2A26'}}>{weather.temp}°</div>
              <div style={{fontSize:'0.8rem',color:'#8B7E74',marginTop:'0.2rem'}}>{weather.text}</div>
              {weather.feelsLike && <div style={{fontSize:'0.7rem',color:'#8B7E74'}}>体感 {weather.feelsLike}°</div>}
            </div>
          )}
        </div>

        {/* No trip state */}
        {!activeTrip && (
          <div className="animate-fade-up stagger-2" style={{textAlign:'center',padding:'3rem 1rem'}}>
            <img src="/panda.png" alt="" style={{width:'80px',height:'80px',borderRadius:'50%',marginBottom:'1rem'}} />
            <p style={{fontFamily:"'Playfair Display',serif",fontSize:'1.25rem',fontStyle:'italic',marginBottom:'0.5rem'}}>还没有行程哦</p>
            <p style={{fontSize:'0.85rem',color:'#8B7E74',marginBottom:'1.5rem'}}>告诉我想去哪里，帮你安排</p>
            <button className="btn-primary" style={{width:'auto',paddingLeft:'2rem',paddingRight:'2rem'}} onClick={()=>navigate('/discover')}>✨ 规划一次旅行</button>
          </div>
        )}

        {/* Today's plan */}
        {todayPlan && (
          <>
            {/* Weather advice */}
            {weatherAdvice && (
              <div className="animate-fade-up stagger-2" style={{background:'#FFFBF5',borderRadius:'12px',padding:'0.75rem 1rem',marginBottom:'1rem',border:'1px solid rgba(199,91,57,0.1)',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <span style={{fontSize:'1.25rem'}}>💡</span>
                <span style={{fontSize:'0.8rem',color:'#2D2A26',fontWeight:500}}>{weatherAdvice}</span>
              </div>
            )}

            {/* Trip link */}
            <div className="animate-fade-up stagger-2" style={{background:'#FFFBF5',borderRadius:'16px',padding:'1rem',marginBottom:'0.75rem',border:'1px solid rgba(199,91,57,0.08)',cursor:'pointer'}} onClick={()=>navigate(`/plan/${activeTrip.id}`)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:'1.1rem',fontWeight:700,fontStyle:'italic'}}>{activeTrip.destination} · {todayJson ? `第${todayPlan.day}天 · ${todayPlan.theme}` : '查看行程'}</span>
                <span style={{fontSize:'0.7rem',color:'#C75B39',fontWeight:500}}>完整行程 →</span>
              </div>
              {todayJson ? (
                <div style={{display:'flex',flexDirection:'column',gap:'0.35rem'}}>
                  <p style={{fontSize:'0.8rem',color:'#C75B39',fontWeight:500,margin:0}}>"{todayPlan.quote}"</p>
                  {todayPlan.slots?.slice(0,4).map((s,i) => (
                    <div key={i} style={{fontSize:'0.78rem',color:'#2D2A26',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                      <span>{s.icon||'📍'}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.65rem',color:'#8B7E74',minWidth:'4.5rem'}}>{s.time?.split('-')[0]}</span>
                      <span>{s.place}</span>
                      <span style={{fontSize:'0.7rem',color:'#8B7E74',marginLeft:'auto'}}>{s.duration}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:'0.8rem',color:'#8B7E74',lineHeight:1.8}} dangerouslySetInnerHTML={{__html:typeof todayPlan==='string'?todayPlan.slice(0,400):''}} />
              )}
            </div>

            {/* Quick actions */}
            <div className="animate-fade-up stagger-3" style={{display:'flex',gap:'0.5rem'}}>
              <button className="chip" onClick={()=>navigate(`/plan/${activeTrip.id}`)}>📋 全部行程</button>
              <button className="chip" onClick={()=>navigate(`/spending/${activeTrip.id}`)}>💰 记一笔</button>
              <button className="chip" onClick={()=>navigate('/discover')}>✨ 新旅程</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper
function getApiKey() {
  try { return JSON.parse(localStorage.getItem('trippal_keys')||'{}').amap || ''; }
  catch { return ''; }
}

function parseTodaySection(content) {
  if (!content) return null;
  // Try to find "第1天" section
  const match = content.match(/(?:第[1一]天|Day\s*1|第一天)[\s\S]{0,800}/i);
  if (match) return match[0].replace(/\n/g, '<br/>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Fallback: first 500 chars
  return content.slice(0, 500).replace(/\n/g, '<br/>') + '...';
}
