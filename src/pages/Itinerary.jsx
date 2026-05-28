import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, saveTrip } from '../services/storage';
import { generateItinerary } from '../services/api';

function parseItinerary(content) {
  if (!content) return null;
  try {
    // Try parse as JSON
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.days && Array.isArray(parsed.days)) return parsed;
    }
  } catch {}
  return null;
}

const TYPE_COLORS = {
  '景点': { bg:'rgba(199,91,57,0.06)', bar:'#C75B39' },
  '美食': { bg:'rgba(91,140,90,0.06)', bar:'#5B8C5A' },
  '活动': { bg:'rgba(212,168,83,0.08)', bar:'#D4A853' },
  '休息': { bg:'rgba(139,126,116,0.05)', bar:'#8B7E74' },
};

const ICON_MAP = { '历史人文':'🏛','自然风光':'⛰','美食街区':'🍜','博物馆':'🏛','主题乐园':'🎢','网红打卡':'📸','城市公园':'🌿' };

export default function Itinerary({ onRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dayIdx, setDayIdx] = useState(0);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    getTrip(id).then(t => {
      setTrip(t);
      const parsed = parseItinerary(t?.content);
      setData(parsed);
      setLoading(false);
    });
  }, [id]);

  const handleRegenerate = async () => {
    if (!trip?.spots?.length) return;
    setRegenerating(true);
    try {
      const content = await generateItinerary({
        destination: trip.destination, days: trip.days, budget: trip.budget,
        style: '综合', dates: '', selectedSpots: trip.spots, identity: trip.identity || 'adult', diet: '',
      });
      await saveTrip({ ...trip, content });
      setTrip({ ...trip, content });
      setData(parseItinerary(content));
      setDayIdx(0);
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setRegenerating(false); }
  };

  if (loading) {
    return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#FBF7F0'}}><div style={{width:40,height:40,border:'2px solid rgba(199,91,57,0.2)',borderTopColor:'#C75B39',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} /></div>;
  }
  if (!trip) {
    return <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:'1rem',background:'#FBF7F0'}}><p style={{color:'#8B7E74'}}>行程未找到</p><button className="btn-primary" style={{width:'auto'}} onClick={()=>navigate('/discover')}>去发现</button></div>;
  }

  const day = data?.days?.[dayIdx];

  // Fallback: raw markdown if JSON parse failed
  if (!data) {
    return (
      <div style={{background:'#FBF7F0',minHeight:'100vh',padding:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem'}}>
          <button onClick={()=>navigate(-1)} style={{width:'2.5rem',height:'2.5rem',borderRadius:'50%',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="1.5"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.5rem',fontStyle:'italic',fontWeight:700}}>{trip.destination}</h1></div>
        </div>
        <div style={{background:'#FFFBF5',borderRadius:'16px',padding:'1.25rem',border:'1px solid rgba(199,91,57,0.08)'}}>
          <p style={{color:'#8B7E74',marginBottom:'0.75rem'}}>AI 输出的格式需要重新生成</p>
          <button className="btn-primary" onClick={handleRegenerate} disabled={regenerating}>{regenerating?'生成中...':'✨ 重新生成结构化攻略'}</button>
          <details style={{marginTop:'1rem'}}><summary style={{fontSize:'0.8rem',color:'#8B7E74',cursor:'pointer'}}>查看原始内容</summary><pre style={{fontSize:'0.7rem',whiteSpace:'pre-wrap',maxHeight:'300px',overflowY:'auto',marginTop:'0.5rem'}}>{trip.content}</pre></details>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',padding:'1.25rem'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem'}}>
        <button onClick={()=>navigate(-1)} style={{width:'2.5rem',height:'2.5rem',borderRadius:'50%',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',flexShrink:0}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="1.5"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{flex:1}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.5rem',fontStyle:'italic',fontWeight:700}}>{trip.destination}</h1>
          <p style={{fontSize:'0.75rem',color:'#8B7E74'}}>{data.summary} · {trip.days}天 · 预算¥{data.totalBudget?.toLocaleString()}</p>
        </div>
        <div style={{display:'flex',gap:'0.5rem',flexShrink:0}}>
          <button className="chip" style={{fontSize:'0.75rem'}} onClick={()=>navigate(`/spending/${trip.id}`)}>💰</button>
          {trip.spots?.length > 0 && <button className="chip" style={{fontSize:'0.75rem'}} onClick={handleRegenerate} disabled={regenerating}>{regenerating?'↻':'🔄'}</button>}
        </div>
      </div>

      {/* Packing list */}
      {data.packing && (
        <div style={{background:'#FFFBF5',borderRadius:'12px',padding:'0.75rem 1rem',marginBottom:'1rem',border:'1px solid rgba(199,91,57,0.08)',fontSize:'0.8rem'}}>
          <span style={{fontWeight:600}}>🎒 打包清单：</span>
          {data.packing.map((p,i)=><span key={i} style={{marginLeft:'0.5rem',color:'#8B7E74'}}>{p}{i<data.packing.length-1?' · ':''}</span>)}
        </div>
      )}

      {/* Day tabs */}
      {data.days.length > 1 && (
        <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.25rem'}}>
          {data.days.map((d, i) => (
            <button key={i} onClick={()=>setDayIdx(i)} style={{
              padding:'0.5rem 1rem',borderRadius:'99px',border:dayIdx===i?'2px solid #C75B39':'1px solid rgba(139,126,116,0.2)',
              background:dayIdx===i?'rgba(199,91,57,0.06)':'#FFFBF5',color:dayIdx===i?'#C75B39':'#8B7E74',
              fontSize:'0.8rem',fontWeight:dayIdx===i?600:400,cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Noto Sans SC',sans-serif",transition:'all 0.2s'
            }}>
              第{d.day}天{d.theme?` · ${d.theme}`:''}
            </button>
          ))}
        </div>
      )}

      {/* Day content */}
      {day && (
        <>
          {/* Day header */}
          <div style={{marginBottom:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.3rem',fontStyle:'italic',fontWeight:700,color:'#2D2A26'}}>第{day.day}天 · {day.theme}</h2>
              <span style={{fontSize:'0.75rem',color:'#8B7E74',fontFamily:"'Noto Sans SC',sans-serif"}}>预算 ¥{day.dailyBudget}</span>
            </div>
            <p style={{fontFamily:"'Noto Sans SC',sans-serif",fontSize:'0.85rem',color:'#C75B39',marginTop:'0.25rem',fontWeight:500}}>"{day.quote}"</p>
            {day.weatherNote && <p style={{fontSize:'0.75rem',color:'#8B7E74',marginTop:'0.25rem'}}>{day.weatherNote}</p>}
          </div>

          {/* Timeline slots */}
          <div style={{position:'relative',paddingLeft:'1.5rem'}}>
            {/* Vertical line */}
            <div style={{position:'absolute',left:'0.55rem',top:'0.5rem',bottom:'0.5rem',width:'2px',background:'linear-gradient(to bottom, rgba(199,91,57,0.2), rgba(199,91,57,0.06))'}} />

            {day.slots.map((slot, i) => {
              const tc = TYPE_COLORS[slot.type] || TYPE_COLORS['活动'];
              return (
                <div key={i} style={{position:'relative',marginBottom:i===day.slots.length-1?'0':'1rem'}}>
                  {/* Dot */}
                  <div style={{position:'absolute',left:'-1.5rem',top:'0.15rem',width:'0.8rem',height:'0.8rem',borderRadius:'50%',background:tc.bar,boxShadow:`0 0 0 4px ${tc.bar}15`}} />

                  {/* Time */}
                  <div style={{fontSize:'0.7rem',color:'#8B7E74',fontFamily:'JetBrains Mono,monospace',marginBottom:'0.3rem'}}>{slot.time}</div>

                  {/* Card */}
                  <div style={{background:'#FFFBF5',borderRadius:'16px',padding:'0.9rem 1rem',border:`1px solid ${tc.bar}18`,borderLeft:`3px solid ${tc.bar}`,boxShadow:'0 1px 4px rgba(0,0,0,0.02)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.3rem'}}>
                      <span style={{fontSize:'1.1rem'}}>{slot.icon||'📍'}</span>
                      <span style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,fontStyle:'italic'}}>{slot.place}</span>
                      <span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:'99px',background:tc.bg,color:tc.bar,fontFamily:"'Noto Sans SC',sans-serif",marginLeft:'auto'}}>{slot.type}</span>
                    </div>

                    <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',marginBottom:'0.3rem'}}>
                      <span style={{fontSize:'0.72rem',color:'#8B7E74'}}>⏱ {slot.duration}</span>
                      {slot.ticket > 0 && <span style={{fontSize:'0.72rem',color:slot.myPrice<slot.ticket?'#5B8C5A':'#8B7E74',fontWeight:slot.myPrice<slot.ticket?600:400}}>🎫 ¥{slot.myPrice}{slot.myPrice<slot.ticket?<span style={{textDecoration:'line-through',marginLeft:'4px',fontWeight:400}}>¥{slot.ticket}</span>:''}</span>}
                      {slot.ticket === 0 && <span style={{fontSize:'0.72rem',color:'#5B8C5A'}}>🎫 免费</span>}
                    </div>

                    {slot.transport && (
                      <div style={{fontSize:'0.72rem',color:'#8B7E74',marginBottom:'0.3rem',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                        <span>🚇</span><span>{slot.transport}</span>
                      </div>
                    )}

                    {slot.tip && (
                      <div style={{fontSize:'0.75rem',color:'#C75B39',background:'rgba(199,91,57,0.04)',padding:'0.4rem 0.75rem',borderRadius:'8px',marginBottom:'0.3rem'}}>
                        💡 {slot.tip}
                      </div>
                    )}

                    {slot.food && (
                      <div style={{fontSize:'0.72rem',color:'#5B8C5A',background:'rgba(91,140,90,0.04)',padding:'0.4rem 0.75rem',borderRadius:'8px'}}>
                        🍜 {slot.food}
                      </div>
                    )}
                  </div>

                  {/* Connector info between slots */}
                  {i < day.slots.length - 1 && day.slots[i+1]?.transport && (
                    <div style={{fontSize:'0.7rem',color:'#8B7E74',marginTop:'0.4rem',paddingLeft:'0.5rem',fontStyle:'italic'}}>
                      ↓ {day.slots[i+1].transport}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick links */}
          <div style={{display:'flex',gap:'0.5rem',marginTop:'1.25rem',flexWrap:'wrap'}}>
            {data.packing && <button className="chip" style={{fontSize:'0.75rem'}}>🎒 打包清单</button>}
            <button className="chip active" style={{fontSize:'0.75rem'}} onClick={()=>navigate(`/spending/${trip.id}`)}>💰 我要记账</button>
          </div>
        </>
      )}
    </div>
  );
}
