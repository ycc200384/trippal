import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, getTrips, saveTrip } from '../services/storage';
import { saveSpending } from '../services/storage';
import { generateItinerary } from '../services/api';

const TRANSPORT = ['🚄 高铁','✈️ 飞机','🚌 大巴','🚗 自驾','🚢 船','🔄 其他'];

function parseItinerary(content) {
  if (!content) return null;
  try { const m = content.match(/\{[\s\S]*\}/); if (m) { const p = JSON.parse(m[0]); if (p.days) return p; } } catch {}
  return null;
}

function countdown(startDate) {
  if (!startDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const target = new Date(startDate); target.setHours(0,0,0,0);
  const diff = Math.ceil((target - now) / 86400000);
  if (diff < 0) return '进行中';
  if (diff === 0) return '今天出发';
  if (diff === 1) return '明天出发';
  return `还有${diff}天`;
}

export default function Itinerary({ onRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── Trip list mode (no id) ──
  if (!id) return <TripList navigate={navigate} />;

  // ── Single trip mode ──
  return <SingleTrip id={id} navigate={navigate} onRefresh={onRefresh} />;
}

// ═══════════ Trip List ═══════════
function TripList({ navigate }) {
  const [trips, setTrips] = useState([]);
  const [showTransit, setShowTransit] = useState(null);
  const [transitForm, setTransitForm] = useState({ mode: '🚄 高铁', cost: '', from: '' });

  useEffect(() => { getTrips().then(setTrips); }, []);

  const handleTransit = async (trip) => {
    const cost = Number(transitForm.cost);
    if (!cost || cost <= 0) return;
    await saveSpending({ tripId: trip.id, amount: cost, category: 'transport', note: `${transitForm.mode} ${transitForm.from}→${trip.destination}`, createdAt: Date.now() });
    const updated = { ...trip, transit: { mode: transitForm.mode, cost, from: transitForm.from } };
    await saveTrip(updated);
    setShowTransit(null); setTransitForm({ mode: '🚄 高铁', cost: '', from: '' });
    getTrips().then(setTrips);
  };

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'1.25rem',paddingBottom:'6rem'}}>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontStyle:'italic',fontWeight:700,marginBottom:'1.25rem'}}>我的旅程</h1>
      {trips.length === 0 ? (
        <div style={{textAlign:'center',padding:'3rem 1rem'}}>
          <img src="/panda.png" alt="" style={{width:80,height:80,borderRadius:'50%',marginBottom:'1rem'}} />
          <p style={{fontFamily:"'Playfair Display',serif",fontSize:'1.2rem',fontStyle:'italic',marginBottom:'0.5rem'}}>还没有旅程</p>
          <button className="btn-primary" style={{width:'auto',padding:'0.75rem 2rem'}} onClick={()=>navigate('/discover')}>✨ 规划一次旅行</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {trips.map((t, i) => {
            const cd = countdown(t.startDate);
            return (
              <div key={t.id} style={{position:'relative'}}>
                {i > 0 && (
                  <div style={{textAlign:'center',padding:'0.3rem 0',fontSize:'0.7rem',color:'#8B7E74',fontFamily:"'JetBrains Mono',monospace"}}>
                    ↕ {t.startDate ? new Date(t.startDate).toLocaleDateString('zh-CN') : '待定'}
                  </div>
                )}
                <div style={{background:'#FFFBF5',borderRadius:'16px',overflow:'hidden',border:'1px solid rgba(199,91,57,0.08)'}}>
                  {/* Card header */}
                  <div style={{padding:'1rem',cursor:'pointer'}} onClick={()=>navigate(`/plan/${t.id}`)}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
                      <span style={{fontFamily:"'Playfair Display',serif",fontSize:'1.2rem',fontWeight:700,fontStyle:'italic'}}>{t.destination}</span>
                      <span style={{fontSize:'0.75rem',color:'#C75B39',fontWeight:500}}>{t.days}天</span>
                    </div>
                    {t.startDate && (
                      <div style={{fontSize:'0.75rem',color:'#8B7E74',marginBottom:'0.3rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <span>📅 {new Date(t.startDate).toLocaleDateString('zh-CN')}</span>
                        {cd && <span style={{padding:'2px 8px',borderRadius:'99px',background:cd==='进行中'?'rgba(91,140,90,0.1)':'rgba(199,91,57,0.06)',color:cd==='进行中'?'#5B8C5A':'#C75B39',fontSize:'0.65rem',fontWeight:600}}>{cd}</span>}
                      </div>
                    )}
                    {t.transit ? (
                      <div style={{fontSize:'0.75rem',color:'#2D2A26',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <span>{t.transit.mode}</span>
                        <span style={{color:'#8B7E74'}}>{t.transit.from}→{t.destination}</span>
                        <span style={{fontWeight:600,color:'#C75B39'}}>¥{t.transit.cost}</span>
                        <span style={{fontSize:'0.6rem',color:'#5B8C5A'}}>已记账</span>
                      </div>
                    ) : (
                      <button onClick={e=>{e.stopPropagation();setShowTransit(showTransit===t.id?null:t.id);}} style={{fontSize:'0.75rem',color:'#8B7E74',border:'1px dashed rgba(139,126,116,0.3)',padding:'4px 12px',borderRadius:'99px',background:'transparent',cursor:'pointer',fontFamily:"'Noto Sans SC',sans-serif"}}>
                        + 添加交通方式
                      </button>
                    )}
                  </div>

                  {/* Transit form */}
                  {showTransit === t.id && (
                    <div style={{borderTop:'1px solid rgba(199,91,57,0.08)',padding:'0.75rem 1rem'}}>
                      <input className="input-field" placeholder="从哪里出发？" value={transitForm.from} onChange={e=>setTransitForm({...transitForm,from:e.target.value})} style={{marginBottom:'0.5rem',fontSize:'0.8rem',padding:'0.5rem'}} />
                      <div style={{display:'flex',gap:'0.25rem',flexWrap:'wrap',marginBottom:'0.5rem'}}>
                        {TRANSPORT.map(m=><button key={m} onClick={()=>setTransitForm({...transitForm,mode:m})} style={{padding:'0.25rem 0.6rem',borderRadius:'99px',border:transitForm.mode===m?'2px solid #C75B39':'1px solid #e5e7eb',background:transitForm.mode===m?'rgba(199,91,57,0.06)':'#fff',fontSize:'0.7rem',cursor:'pointer'}}>{m}</button>)}
                      </div>
                      <div style={{display:'flex',gap:'0.5rem'}}>
                        <input className="input-field" type="number" placeholder="花了多少钱 ¥" value={transitForm.cost} onChange={e=>setTransitForm({...transitForm,cost:e.target.value})} style={{flex:1,fontSize:'0.8rem',padding:'0.5rem'}} />
                        <button className="btn-primary" style={{width:'auto',padding:'0.5rem 1rem',fontSize:'0.8rem'}} onClick={()=>handleTransit(t)}>记下</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <button className="btn-primary" onClick={()=>navigate('/discover')} style={{marginTop:'0.5rem'}}>+ 添加新行程</button>
        </div>
      )}
    </div>
  );
}

// ═══════════ Single Trip (existing code, simplified) ═══════════
function SingleTrip({ id, navigate, onRefresh }) {
  const [trip, setTrip] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dayIdx, setDayIdx] = useState(0);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    getTrip(id).then(t => { setTrip(t); setData(parseItinerary(t?.content)); setLoading(false); });
  }, [id]);

  const handleRegenerate = async () => {
    if (!trip?.spots?.length) return;
    setRegenerating(true);
    try {
      const content = await generateItinerary({ destination: trip.destination, days: trip.days, style: '综合', selectedSpots: trip.spots, identity: trip.identity||'adult', diet: '' });
      await saveTrip({ ...trip, content });
      setTrip({ ...trip, content });
      setData(parseItinerary(content));
      setDayIdx(0);
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setRegenerating(false); }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#FBF7F0'}}><div style={{width:40,height:40,border:'2px solid rgba(199,91,57,0.2)',borderTopColor:'#C75B39',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} /></div>;

  if (!trip) return <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:'1rem',background:'#FBF7F0'}}><p style={{color:'#8B7E74'}}>行程未找到</p><button className="btn-primary" style={{width:'auto'}} onClick={()=>navigate('/plan')}>返回</button></div>;

  const day = data?.days?.[dayIdx];

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',padding:'1.25rem',paddingBottom:'6rem',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem'}}>
        <button onClick={()=>navigate('/plan')} style={{width:'2.5rem',height:'2.5rem',borderRadius:'50%',background:'rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="1.5"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{flex:1}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.5rem',fontStyle:'italic',fontWeight:700}}>{trip.destination}</h1>
          <p style={{fontSize:'0.75rem',color:'#8B7E74'}}>{data?.summary} · {trip.days}天{trip.startDate?` · ${new Date(trip.startDate).toLocaleDateString('zh-CN')}`:''}</p>
        </div>
        <div style={{display:'flex',gap:'0.4rem'}}>
          {trip.spots?.length > 0 && <button className="chip" style={{fontSize:'0.7rem'}} onClick={handleRegenerate} disabled={regenerating}>{regenerating?'↻':'🔄'}</button>}
        </div>
      </div>

      {/* Packing */}
      {data?.packing && (
        <div style={{background:'#FFFBF5',borderRadius:'12px',padding:'0.7rem 1rem',marginBottom:'0.75rem',border:'1px solid rgba(199,91,57,0.06)',fontSize:'0.78rem'}}>
          <span style={{fontWeight:600}}>🎒 </span>
          {data.packing.map((p,i)=><span key={i} style={{color:'#8B7E74'}}>{p}{i<data.packing.length-1?' · ':''}</span>)}
        </div>
      )}

      {/* Day tabs */}
      {data?.days?.length > 1 && (
        <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.75rem',overflowX:'auto'}}>
          {data.days.map((d,i)=><button key={i} onClick={()=>setDayIdx(i)} style={{padding:'0.4rem 0.9rem',borderRadius:'99px',border:dayIdx===i?'2px solid #C75B39':'1px solid rgba(139,126,116,0.15)',background:dayIdx===i?'rgba(199,91,57,0.06)':'#FFFBF5',color:dayIdx===i?'#C75B39':'#8B7E74',fontSize:'0.75rem',fontWeight:dayIdx===i?600:400,cursor:'pointer',whiteSpace:'nowrap'}}>第{d.day}天</button>)}
        </div>
      )}

      {/* Day content */}
      {day && (
        <>
          <div style={{marginBottom:'0.75rem'}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.2rem',fontStyle:'italic',fontWeight:700}}>第{day.day}天 · {day.theme}</h2>
            {day.quote && <p style={{fontSize:'0.8rem',color:'#C75B39',marginTop:'0.15rem',fontWeight:500}}>"{day.quote}"</p>}
          </div>
          <div style={{position:'relative',paddingLeft:'1.5rem'}}>
            <div style={{position:'absolute',left:'0.55rem',top:'0.5rem',bottom:'0.5rem',width:'2px',background:'linear-gradient(to bottom,rgba(199,91,57,0.2),rgba(199,91,57,0.04))'}} />
            {day.slots?.map((s,i)=>(<div key={i} style={{position:'relative',marginBottom:i===day.slots.length-1?'0':'0.6rem'}}>
              <div style={{position:'absolute',left:'-1.5rem',top:'0.15rem',width:'0.8rem',height:'0.8rem',borderRadius:'50%',background:'#C75B39',boxShadow:'0 0 0 4px rgba(199,91,57,0.08)'}} />
              <div style={{fontSize:'0.65rem',color:'#8B7E74',fontFamily:'JetBrains Mono,monospace',marginBottom:'0.15rem'}}>{s.time}</div>
              <div style={{background:'#FFFBF5',borderRadius:'14px',padding:'0.7rem 0.9rem',border:'1px solid rgba(199,91,57,0.06)',borderLeft:'3px solid #C75B39'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.15rem'}}>
                  <span>{s.icon||'📍'}</span>
                  <span style={{fontWeight:700,fontSize:'0.85rem'}}>{s.place}</span>
                  <span style={{fontSize:'0.65rem',padding:'2px 6px',borderRadius:'99px',background:'rgba(199,91,57,0.06)',color:'#C75B39',fontFamily:"'Noto Sans SC',sans-serif",marginLeft:'auto'}}>{s.type}</span>
                </div>
                <div style={{display:'flex',gap:'0.5rem',fontSize:'0.7rem',color:'#8B7E74',flexWrap:'wrap'}}>
                  <span>⏱ {s.duration}</span>
                  {s.ticket>0?<span style={{color:s.myPrice<s.ticket?'#5B8C5A':'#8B7E74'}}>🎫 ¥{s.myPrice}</span>:<span style={{color:'#5B8C5A'}}>免费</span>}
                  {s.transport&&<span>🚇 {s.transport}</span>}
                </div>
                {s.tip&&<div style={{fontSize:'0.7rem',color:'#C75B39',background:'rgba(199,91,57,0.04)',padding:'0.3rem 0.6rem',borderRadius:'6px',marginTop:'0.4rem'}}>💡 {s.tip}</div>}
                <a href={`http://maps.apple.com/?q=${encodeURIComponent(s.place)}`} style={{display:'inline-block',fontSize:'0.65rem',padding:'3px 8px',borderRadius:'99px',background:'rgba(91,140,90,0.08)',color:'#5B8C5A',textDecoration:'none',fontWeight:600,marginTop:'0.4rem'}}>🧭 导航</a>
              </div>
            </div>))}
          </div>
        </>
      )}
    </div>
  );
}
