import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAttractions, generateItinerary, getDestinationPhoto } from '../services/api';
import { saveTrip, getPreferences, savePreferences } from '../services/storage';

function calcMyPrice(ticket, identity) {
  if (ticket === 0) return 0;
  if (identity === 'military') return 0;
  if (identity === 'student' || identity === 'senior' || identity === 'child') return Math.round(ticket * 0.5);
  return ticket;
}

export default function Discover({ trips, onRefresh }) {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(null);
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [dates, setDates] = useState('');
  const [budget, setBudget] = useState(3000);
  const [identity, setIdentity] = useState('adult');
  const [attractions, setAttractions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    getPreferences().then(p => { setPrefs(p); if (p?.identity) setIdentity(p.identity); });
    // Get rough location for route planning
    fetch('https://ipapi.co/json/').then(r=>r.json()).then(d=>{
      setUserLocation({lat:d.latitude,lon:d.longitude,city:d.city,region:d.region});
    }).catch(()=>{});
    // Geolocation if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos=>{
        setUserLocation({lat:pos.coords.latitude,lon:pos.coords.longitude});
      },()=>{},{timeout:3000});
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!destination.trim()) { setError('请输入目的地'); return; }
    setError(''); setLoading(true); setAttractions([]); setSelected(new Set());
    try {
      const spots = await getAttractions(destination.trim());
      // Dedup by name
      const seen = new Set();
      const deduped = spots.filter(s => { const k = s.name; if (seen.has(k)) return false; seen.add(k); return true; });
      setAttractions(deduped);
      getDestinationPhoto(destination.trim()).then(setPhoto).catch(() => {});
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [destination]);

  const toggleSpot = (name) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    setSelected(next);
  };

  const totalTicket = attractions.filter(a => selected.has(a.name)).reduce((s, a) => s + calcMyPrice(a.ticket, identity), 0);

  const handleGenerate = async () => {
    const picked = attractions.filter(a => selected.has(a.name));
    if (picked.length === 0) { setError('至少选一个景点'); return; }
    if (picked.length < 2 && days > 1) { setError('只有1个景点，天数最多1天'); return; }
    setError(''); setGenerating(true);
    try {
      savePreferences({ ...prefs, identity, budget });
      const diet = prefs?.diet || '';
      const content = await generateItinerary({
        destination: destination.trim(), days, budget, style: prefs?.style || '综合', dates: dates||'',
        selectedSpots: picked, identity, diet,
      });
      const trip = await saveTrip({
        id: Date.now(), destination: destination.trim(), days, budget, identity,
        content, spots: picked, startDate: dates||null,
      });
      onRefresh();
      navigate(`/plan/${trip.id}`);
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const discountPct = (ticket) => {
    if (ticket===0) return {pct:100,label:'免费',c:'#5B8C5A'};
    if (identity==='adult') return {pct:0,label:'全价',c:'#d1d5db'};
    if (identity==='military') return {pct:100,label:'免票',c:'#5B8C5A'};
    return {pct:50,label:'半价',c:'#5B8C5A'};
  };

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',position:'relative',overflowY:'auto',WebkitOverflowScrolling:'touch',paddingBottom:'6rem'}}>
      <div className="blob w-56 h-56" style={{background:'rgba(199,91,57,0.05)',top:'-5rem',right:'-3rem',position:'absolute'}} />

      <div style={{position:'relative',zIndex:1,padding:'1.5rem 1.25rem'}}>
        {/* Header */}
        <div style={{marginBottom:'1.25rem'}}>
          <p style={{fontSize:'0.7rem',letterSpacing:'0.2em',textTransform:'uppercase',color:'#C75B39',fontWeight:500,marginBottom:'0.25rem'}}>探索目的地</p>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontStyle:'italic',fontWeight:700}}>发现好去处</h1>
        </div>

        {/* Search bar */}
        <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem'}}>
          <input className="input-field" style={{flex:1}} placeholder="输入城市名，如：成都" value={destination} onChange={e=>setDestination(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch()} />
          <button className="btn-primary" style={{width:'auto',paddingLeft:'1.5rem',paddingRight:'1.5rem'}} onClick={handleSearch} disabled={loading}>
            {loading?<span style={{width:20,height:20,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/>:'搜索'}
          </button>
        </div>

        {/* Days + date selector */}
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap',marginBottom:'0.75rem'}}>
          <span style={{fontSize:'0.7rem',color:'#8B7E74'}}>玩几天</span>
          {[1,2,3,4,5,7].map(d=><button key={d} className={`chip ${days===d?'active':''}`} style={{fontSize:'0.7rem',padding:'0.3rem 0.7rem'}} onClick={()=>setDays(d)}>{d}天</button>)}
          <input type="number" min="1" max="30" placeholder="自定义" style={{width:'3.5rem',padding:'0.3rem',borderRadius:'99px',border:'1px solid #d1d5db',fontSize:'0.7rem',textAlign:'center',outline:'none',background:'#FFFBF5'}} onChange={e=>{const v=parseInt(e.target.value);if(v>0&&v<=30)setDays(v)}} />
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.75rem'}}>
          <span style={{fontSize:'0.7rem',color:'#8B7E74'}}>出发日期</span>
          <input type="date" value={dates} onChange={e=>setDates(e.target.value)} className="input-field" style={{flex:1,fontSize:'0.8rem',padding:'0.5rem',maxWidth:'10rem'}} />
        </div>

        {error && <div style={{padding:'0.75rem',borderRadius:'12px',background:'rgba(239,68,68,0.08)',color:'#dc2626',fontSize:'0.85rem',marginBottom:'0.75rem'}}>{error}</div>}

        {/* Photo + panda banner */}
        {photo && attractions.length > 0 && (
          <div style={{position:'relative',marginBottom:'1rem',borderRadius:'16px',overflow:'hidden',height:'120px'}}>
            <img src={photo} alt={destination} style={{width:'100%',height:'100%',objectFit:'cover'}} />
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.5),transparent 60%)'}} />
            <div style={{position:'absolute',bottom:'0.75rem',left:'1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <img src="/panda.png" alt="" style={{width:'36px',height:'36px',borderRadius:'50%'}} />
              <span style={{color:'#fff',fontWeight:500,fontSize:'0.9rem'}}>找到 {attractions.length} 个去处，选你想去的</span>
            </div>
          </div>
        )}

        {/* Attraction cards */}
        {attractions.length > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {attractions.map((a,i)=>{
              const p=calcMyPrice(a.ticket,identity);
              const d=discountPct(a.ticket);
              const sel=selected.has(a.name);
              return (
                <div key={i} onClick={()=>toggleSpot(a.name)} style={{
                  background:sel?'#FFF5F0':'#FFFBF5',borderRadius:'14px',padding:'0.7rem 0.9rem',
                  border:sel?'2px solid #C75B39':'1px solid rgba(199,91,57,0.06)',
                  boxShadow:sel?'0 2px 12px rgba(199,91,57,0.08)':'0 1px 2px rgba(0,0,0,0.02)',
                  cursor:'pointer',transition:'all 0.2s',display:'flex',alignItems:'center',gap:'0.75rem'
                }}>
                  <div style={{width:'22px',height:'22px',borderRadius:'6px',border:sel?'none':'2px solid #d1d5db',background:sel?'#C75B39':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.15s'}}>
                    {sel&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'2px'}}>
                      {i<3 && <span style={{fontSize:'0.6rem',padding:'1px 5px',borderRadius:'4px',background:'#C75B39',color:'#fff',fontWeight:700,fontFamily:"'Noto Sans SC',sans-serif",flexShrink:0}}>{i===0?'最推荐':i===1?'必去':'精选'}</span>}
                      <span style={{fontWeight:700,fontSize:'0.9rem'}}>{a.name}</span>
                      {a.tags?.slice(0,2).map((t,j)=><span key={j} style={{fontSize:'0.6rem',padding:'1px 7px',borderRadius:'99px',background:'rgba(199,91,57,0.07)',color:'#C75B39'}}>{t}</span>)}
                    </div>
                    <div style={{fontSize:'0.7rem',color:'#8B7E74'}}>{a.type} · {a.duration}h · {a.desc}</div>
                    {/* Ticket bar */}
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'4px'}}>
                      <span style={{fontSize:'0.7rem',color:'#8B7E74',minWidth:'3rem'}}>¥{a.ticket}</span>
                      <span style={{fontSize:'0.8rem',fontWeight:700,color:d.c,minWidth:'3rem'}}>→ ¥{p}</span>
                      <div style={{flex:1,height:'4px',borderRadius:'2px',background:'#e5e7eb',overflow:'hidden'}}><div style={{width:`${d.pct}%`,height:'100%',borderRadius:'2px',background:d.c}}/></div>
                      <span style={{fontSize:'0.6rem',color:d.c,fontWeight:600}}>{d.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom action bar */}
            <div style={{position:'sticky',bottom:'5rem',background:'#FFFBF5',borderRadius:'16px',padding:'0.9rem 1rem',boxShadow:'0 -1px 20px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
              <div>
                <span style={{fontWeight:700,fontSize:'0.95rem'}}>已选 {selected.size} 个</span>
                {totalTicket>0&&<span style={{fontSize:'0.75rem',color:'#5B8C5A',marginLeft:'0.5rem',fontWeight:600}}>门票 ¥{totalTicket}</span>}
              </div>
              <button className="btn-primary" style={{width:'auto',paddingLeft:'1.2rem',paddingRight:'1.2rem',fontSize:'0.9rem'}} onClick={handleGenerate} disabled={generating}>
                {generating?'生成中...':'✨ 生成行程'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
