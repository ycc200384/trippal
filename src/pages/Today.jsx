import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeatherByCoord } from '../services/api';

function getKeys() {
  try { return JSON.parse(localStorage.getItem('trippal_keys')||'{}'); } catch { return {}; }
}

function formatDate() {
  const d = new Date();
  const week = ['日','一','二','三','四','五','六'];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 星期${week[d.getDay()]}`;
}

function weatherEmoji(text) {
  if (!text) return '';
  const h = new Date().getHours();
  const night = h >= 19 || h < 6;
  if (text.includes('雨')) return '🌧';
  if (text.includes('雪')) return '🌨';
  if (text.includes('云')||text.includes('阴')) return night ? '☁️' : '⛅';
  if (text.includes('晴')) return night ? '🌙' : '☀️';
  if (text.includes('雾')||text.includes('霾')) return '🌫';
  if (text.includes('风')) return '💨';
  return night ? '🌙' : '🌤';
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 10) return '早上好';
  if (h < 14) return '中午好';
  if (h < 19) return '下午好';
  return '晚上好';
}

function cleanNum(n) {
  return (n||'').replace(/号$/, ''); // Remove trailing 号 to avoid 号号
}

export default function Today({ trips, prefs }) {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [weather, setWeather] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [photos, setPhotos] = useState({});
  const [destPhoto, setDestPhoto] = useState(null);
  const [checkedIn, setCheckedIn] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trippal_checked')||'{}'); } catch { return {}; }
  });

  const toggleChecked = (tripId, slotIdx) => {
    const key = `${tripId}_${slotIdx}`;
    const next = { ...checkedIn, [key]: !checkedIn[key] };
    setCheckedIn(next);
    localStorage.setItem('trippal_checked', JSON.stringify(next));
  };

  // ── Reverse geocode from lat/lon ──
  const reverseGeo = useCallback(async (lat, lon) => {
    const keys = getKeys();
    if (!keys.amap) return;
    try {
      const res = await fetch(`https://restapi.amap.com/v3/geocode/regeo?key=${keys.amap}&location=${lon},${lat}&extensions=all`);
      const d = await res.json();
      if (d.status==='1' && d.regeocode) {
        const a = d.regeocode.addressComponent;
        const parts = [];
        if (a.province && a.province!=='[]') parts.push(a.province);
        if (a.city && a.city!=='[]' && a.city!==a.province) parts.push(a.city);
        if (a.district && a.district!=='[]') parts.push(a.district);
        if (a.township && a.township!=='[]') parts.push(a.township);
        if (a.streetNumber?.street && a.streetNumber.street!=='[]') {
          const st = a.streetNumber.street;
          const num = cleanNum(a.streetNumber.number);
          parts.push(num ? `${st}${num}号` : st);
        }
        if (a.building?.name && a.building.name!=='[]') parts.push(a.building.name);
        else if (a.neighborhood?.name && a.neighborhood.name!=='[]') parts.push(a.neighborhood.name);
        setAddress(parts.join('') || d.regeocode.formatted_address?.slice(0,40) || '');
      }
    } catch {}
  }, []);

  // ── Weather fetch ──
  const fetchWeather = useCallback(async (lat, lon) => {
    const w = await getWeatherByCoord(lat, lon);
    if (w) setWeather(w);
  }, []);

  // ── Init: GPS + watch + weather timer ──
  useEffect(() => {
    const keys = getKeys();
    const resolveLoc = (lat, lon) => {
      setUserPos({ lat, lon });
      fetchWeather(lat, lon);
      reverseGeo(lat, lon);
    };

    const tryGPS = () => new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null), { enableHighAccuracy: true, timeout: 8000 }
      );
      setTimeout(() => resolve(null), 8000);
    });

    const tryAmapIP = async () => {
      if (!keys.amap) return null;
      try {
        const res = await fetch(`https://restapi.amap.com/v3/ip?key=${keys.amap}`);
        const d = await res.json();
        if (d.status==='1' && d.rectangle) {
          const [minLng,,maxLng] = d.rectangle.split(';')[0].split(',').map(Number);
          return { lat: Number(d.rectangle.split(';')[1].split(',')[1]), lon: (minLng+maxLng)/2 };
        }
      } catch {} return null;
    };

    const init = async () => {
      const gps = await tryGPS();
      if (gps) { resolveLoc(gps.lat, gps.lon); return; }
      const amap = await tryAmapIP();
      if (amap) { resolveLoc(amap.lat, amap.lon); return; }
      try {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        if (d.latitude) resolveLoc(d.latitude, d.longitude);
      } catch {}
    };

    init();

    // ── Real-time GPS watch ──
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          setUserPos({ lat: latitude, lon: longitude });
          reverseGeo(latitude, longitude);
        },
        () => {}, { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    }

    // ── Weather auto-refresh every 5 min ──
    const weatherTimer = setInterval(() => {
      if (userPos) fetchWeather(userPos.lat, userPos.lon);
    }, 300000);

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      clearInterval(weatherTimer);
    };
  }, []);

  // ── Parse trip ──
  useEffect(() => {
    if (trips.length > 0) {
      const latest = trips[0];
      setActiveTrip(latest);
      try {
        const m = latest.content.match(/\{[\s\S]*\}/);
        if (m) {
          const d = JSON.parse(m[0]);
          if (d.days?.[0]) {
            setTodayData(d);
            loadDestPhoto(latest.destination);
          }
        }
      } catch {}
    }
  }, [trips]);

  const loadDestPhoto = async (query) => {
    const keys = getKeys();
    if (!keys.unsplash) return;
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query+' travel city')}&per_page=1&orientation=landscape`, {
        headers: { 'Authorization': `Client-ID ${keys.unsplash}` }
      });
      const d = await res.json();
      if (d.results?.[0]?.urls?.regular) setDestPhoto(d.results[0].urls.regular);
    } catch {}
  };

  const loadPhotoForPlace = async (place) => {
    if (photos[place]) return;
    const keys = getKeys();
    if (!keys.unsplash) return;
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(place+' landmark')}&per_page=1&orientation=landscape`, {
        headers: { 'Authorization': `Client-ID ${keys.unsplash}` }
      });
      const d = await res.json();
      if (d.results?.[0]?.urls?.small) {
        setPhotos(prev => ({ ...prev, [place]: d.results[0].urls.small }));
      }
    } catch {}
  };

  const day = todayData?.days?.[0];
  const greeting = timeGreeting();

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',overflowY:'auto',WebkitOverflowScrolling:'touch',paddingBottom:'6rem'}}>
      {/* Hero photo */}
      {destPhoto && (
        <div style={{position:'relative',height:'220px',overflow:'hidden'}}>
          <img src={destPhoto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom, rgba(45,42,38,0.2) 0%, rgba(45,42,38,0.5) 100%)'}} />
          <div style={{position:'absolute',top:'1rem',left:'1rem',right:'1rem',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <p style={{fontSize:'0.9rem',color:'rgba(255,255,255,0.95)',fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,0.3)'}}>{address||'定位中...'}</p>
              <p style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.8)',marginTop:'2px',textShadow:'0 1px 4px rgba(0,0,0,0.3)'}}>{formatDate()}</p>
            </div>
            {weather && (
              <div style={{textAlign:'center',background:'rgba(0,0,0,0.25)',backdropFilter:'blur(8px)',borderRadius:'12px',padding:'0.5rem 0.8rem'}}>
                <div style={{fontSize:'1.8rem',lineHeight:1}}>{weatherEmoji(weather.text)}</div>
                <div style={{fontSize:'2rem',fontWeight:200,lineHeight:1,color:'#fff'}}>{weather.temp}°</div>
                <div style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.7)',marginTop:'2px'}}>{greeting}</div>
              </div>
            )}
          </div>
          {activeTrip && (
            <div style={{position:'absolute',bottom:'1rem',left:'1rem',right:'1rem'}}>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.8rem',fontStyle:'italic',fontWeight:700,color:'#fff',textShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>{activeTrip.destination}</h1>
              {todayData?.summary && <p style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.85)',marginTop:'2px'}}>{todayData.summary}</p>}
            </div>
          )}
        </div>
      )}

      {/* No photo header */}
      {!destPhoto && (
        <div style={{padding:'1.5rem 1.25rem 0.5rem'}}>
          <p style={{fontSize:'0.9rem',color:'#8B7E74',fontWeight:500}}>{formatDate()}</p>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{fontSize:'0.95rem',color:'#C75B39',fontWeight:600}}>{address||'定位中...'}</p>
            {weather && (
              <div style={{textAlign:'center'}}>
                <span style={{fontSize:'1.8rem',fontWeight:200}}>{weatherEmoji(weather.text)} {weather.temp}°</span>
                <div style={{fontSize:'0.65rem',color:'#8B7E74'}}>{greeting}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weather tip — rain only */}
      {weather && weather.text?.includes('雨') && (
        <div style={{margin:'0 1rem 0.75rem',padding:'0.6rem 0.9rem',background:'rgba(148,163,184,0.12)',borderRadius:'12px',fontSize:'0.75rem',color:'#2D2A26',display:'flex',alignItems:'center',gap:'0.4rem'}}>
          <span>🌧</span><span>今天有雨，记得带伞，优先室内景点</span>
        </div>
      )}

      {/* No trip today — show upcoming */}
      {!activeTrip && (
        <div style={{textAlign:'center',padding:'3rem 1rem'}}>
          <img src="/panda.png" alt="" style={{width:70,height:70,borderRadius:'50%',marginBottom:'1rem'}} />
          {(() => {
            // Find upcoming trips with dates
            const upcoming = trips.filter(t => t.startDate && new Date(t.startDate) > new Date()).sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
            if (upcoming.length > 0) {
              const next = upcoming[0];
              const diff = Math.ceil((new Date(next.startDate) - new Date()) / 86400000);
              return (<>
                <p style={{fontFamily:"'Playfair Display',serif",fontSize:'1.3rem',fontStyle:'italic',marginBottom:'0.3rem'}}>下一站 · {next.destination}</p>
                <p style={{fontSize:'0.85rem',color:'#C75B39',fontWeight:600,marginBottom:'0.25rem'}}>
                  {diff <= 0 ? '今天出发！' : `还有 ${diff} 天`}
                </p>
                <p style={{fontSize:'0.75rem',color:'#8B7E74',marginBottom:'1rem'}}>
                  📅 {new Date(next.startDate).toLocaleDateString('zh-CN')} · {next.days}天
                  {next.transit ? <span> · {next.transit.mode} ¥{next.transit.cost}</span> : <span style={{color:'#d1d5db'}}> · 待填交通</span>}
                </p>
                <div style={{display:'flex',gap:'0.5rem',justifyContent:'center'}}>
                  <button className="btn-primary" style={{width:'auto',padding:'0.6rem 1.2rem',fontSize:'0.85rem'}} onClick={()=>navigate(`/plan/${next.id}`)}>查看行程</button>
                  <button className="btn-primary" style={{width:'auto',padding:'0.6rem 1.2rem',fontSize:'0.85rem',background:'transparent',color:'#C75B39',border:'1px solid rgba(199,91,57,0.3)',boxShadow:'none'}} onClick={()=>navigate('/discover')}>新旅程</button>
                </div>
              </>);
            }
            return (<>
              <p style={{fontFamily:"'Playfair Display',serif",fontSize:'1.2rem',fontStyle:'italic',marginBottom:'0.5rem'}}>还没有旅程</p>
              <button className="btn-primary" style={{width:'auto',padding:'0.75rem 2rem'}} onClick={()=>navigate('/discover')}>✨ 规划一次旅行</button>
            </>);
          })()}
        </div>
      )}

      {/* Today's itinerary */}
      {activeTrip && day && (
        <div style={{padding:'0 1rem',marginTop:destPhoto?'-0.25rem':'0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'0.75rem',marginTop:destPhoto?'1rem':'0'}}>
            <div>
              <p style={{fontSize:'0.7rem',letterSpacing:'0.2em',textTransform:'uppercase',color:'#C75B39',fontWeight:500,fontFamily:"'Noto Sans SC',sans-serif",marginBottom:'0.25rem'}}>今天 · {day.theme}</p>
              {day.quote && <p style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontStyle:'italic',color:'#2D2A26'}}>"{day.quote}"</p>}
            </div>
            <div style={{display:'flex',gap:'0.4rem'}}>
              <button className="chip" style={{fontSize:'0.75rem'}} onClick={()=>navigate(`/plan/${activeTrip.id}`)}>全部 →</button>
            </div>
          </div>

          {day.slots?.map((s, i) => {
            const isOpen = expanded === i;
            const checked = activeTrip ? checkedIn[`${activeTrip.id}_${i}`] : false;
            return (
              <div key={i} style={{
                background:checked?'#F5F7F3':'#FFFBF5',borderRadius:'16px',overflow:'hidden',
                border:checked?'1px solid rgba(91,140,90,0.15)':'1px solid rgba(199,91,57,0.06)',
                boxShadow:isOpen?'0 4px 20px rgba(0,0,0,0.06)':'0 1px 3px rgba(0,0,0,0.02)',
                transition:'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                cursor:'pointer',opacity:checked?0.65:1,marginBottom:'0.75rem'
              }} onClick={() => {
                const next = isOpen ? null : i;
                setExpanded(next);
                if (next !== null) loadPhotoForPlace(s.place);
              }}>
                <div style={{padding:'0.9rem 1rem',display:'flex',alignItems:'center',gap:'0.6rem'}}>
                  <span style={{fontSize:'1.3rem'}}>{checked?'✅':(s.icon||'📍')}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'0.9rem',textDecoration:checked?'line-through':'none',color:checked?'#8B7E74':'#2D2A26'}}>
                      {s.place}{checked?' 已打卡':''}
                    </div>
                    <div style={{fontSize:'0.7rem',color:'#8B7E74',marginTop:'1px',display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                      <span>{s.time}</span><span>{s.duration}</span>
                      {s.ticket>0&&<span style={{color:s.myPrice<s.ticket?'#5B8C5A':'#8B7E74'}}>¥{s.myPrice}</span>}
                      {s.ticket===0&&<span style={{color:'#5B8C5A'}}>免费</span>}
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7E74" strokeWidth="1.5" style={{transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'transform 0.3s',flexShrink:0}}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>

                {isOpen && (
                  <div style={{borderTop:'1px solid rgba(199,91,57,0.08)',padding:'1rem'}}>
                    {photos[s.place] && (
                      <div style={{borderRadius:'12px',overflow:'hidden',marginBottom:'0.75rem',height:'160px'}}>
                        <img src={photos[s.place]} alt={s.place} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      </div>
                    )}
                    {s.tip && (
                      <div style={{background:'rgba(199,91,57,0.04)',borderRadius:'10px',padding:'0.75rem',marginBottom:'0.5rem'}}>
                        <p style={{fontSize:'0.8rem',color:'#C75B39',fontWeight:500,lineHeight:1.5}}>💡 {s.tip}</p>
                      </div>
                    )}
                    <button onClick={e=>{e.stopPropagation();toggleChecked(activeTrip.id,i);}}
                      style={{width:'100%',padding:'0.5rem',borderRadius:'10px',border:checked?'2px solid #5B8C5A':'1px solid rgba(139,126,116,0.2)',background:checked?'rgba(91,140,90,0.08)':'#FFFBF5',cursor:'pointer',fontSize:'0.8rem',fontWeight:500,marginBottom:'0.5rem',color:checked?'#5B8C5A':'#8B7E74',fontFamily:"'Noto Sans SC',sans-serif"}}>
                      {checked ? '✅ 已完成打卡' : '📍 点击打卡'}
                    </button>
                    {s.transport && (
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
                        <span style={{fontSize:'0.8rem'}}>🚇</span>
                        <span style={{fontSize:'0.78rem',color:'#8B7E74'}}>{s.transport}</span>
                      </div>
                    )}
                    <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'center'}}>
                      <span style={{fontSize:'0.7rem',padding:'4px 10px',borderRadius:'99px',background:'rgba(199,91,57,0.06)',color:'#C75B39',fontFamily:"'Noto Sans SC',sans-serif"}}>{s.type}</span>
                      <span style={{fontSize:'0.7rem',padding:'4px 10px',borderRadius:'99px',background:'rgba(139,126,116,0.06)',color:'#8B7E74',fontFamily:"'Noto Sans SC',sans-serif"}}>{s.duration}</span>
                      <a href={`http://maps.apple.com/?q=${encodeURIComponent(s.place)}`}
                         style={{fontSize:'0.7rem',padding:'4px 10px',borderRadius:'99px',background:'rgba(91,140,90,0.1)',color:'#5B8C5A',fontFamily:"'Noto Sans SC',sans-serif",textDecoration:'none',fontWeight:600,marginLeft:'auto'}}
                         onClick={e=>e.stopPropagation()}>
                        🧭 导航
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{display:'flex',gap:'0.5rem',marginTop:'1rem',flexWrap:'wrap'}}>
            <button className="chip" onClick={()=>navigate(`/plan/${activeTrip.id}`)}>📋 全部行程</button>
            <button className="chip" onClick={()=>navigate(`/spending/${activeTrip.id}`)}>💰 记一笔</button>
            <button className="chip" onClick={()=>navigate('/discover')}>✨ 新旅程</button>
          </div>
        </div>
      )}
    </div>
  );
}
