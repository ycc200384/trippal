import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, getTrips } from '../services/storage';
import { saveSpending, getSpendingByTrip, deleteSpending } from '../services/storage';

const CAT = [
  { key: 'transport', label: '交通', icon: '🚕' },
  { key: 'hotel', label: '住宿', icon: '🏨' },
  { key: 'food', label: '餐饮', icon: '🍜' },
  { key: 'ticket', label: '门票', icon: '🎫' },
  { key: 'shopping', label: '购物', icon: '🛍' },
  { key: 'other', label: '其他', icon: '📦' },
];

export default function Spending() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'food', note: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let tid = id ? Number(id) : null;
        if (!tid) {
          const ts = await getTrips();
          tid = ts.length > 0 ? ts[0].id : null;
        }
        if (!tid || cancelled) { setLoading(false); return; }
        const t = await getTrip(tid);
        if (cancelled) return;
        setTrip(t);
        const r = await getSpendingByTrip(tid);
        if (!cancelled) setRecords(r);
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const total = records.reduce((s, r) => s + (r.amount || 0), 0);
  const budget = trip?.budget || 0;

  const handleAdd = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;
    const tid = trip?.id;
    if (!tid) return;
    await saveSpending({ tripId: tid, amount: amt, category: form.category, note: form.note });
    setForm({ amount: '', category: 'food', note: '' });
    setShowForm(false);
    const r = await getSpendingByTrip(tid);
    setRecords(r);
  };

  if (loading) {
    return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#FBF7F0'}}><div style={{width:36,height:36,border:'2px solid rgba(199,91,57,0.2)',borderTopColor:'#C75B39',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} /></div>;
  }

  if (!trip) {
    return (
      <div style={{background:'#FBF7F0',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}>
        <img src="/panda.png" alt="" style={{width:80,height:80,borderRadius:'50%',marginBottom:'1rem'}} />
        <p style={{fontFamily:"'Playfair Display',serif",fontSize:'1.2rem',fontStyle:'italic',marginBottom:'0.5rem'}}>还没有行程</p>
        <button className="btn-primary" style={{width:'auto',padding:'0.75rem 2rem'}} onClick={()=>navigate('/discover')}>去规划</button>
      </div>
    );
  }

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',padding:'1rem'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem'}}>
        <button onClick={()=>navigate(-1)} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="1.5"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{flex:1}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.4rem',fontStyle:'italic',fontWeight:700}}>{trip.destination}</h1>
        </div>
      </div>

      {/* Big total */}
      <div style={{textAlign:'center',padding:'1.5rem',marginBottom:'1rem'}}>
        <div style={{fontSize:'0.75rem',color:'#8B7E74',marginBottom:'0.5rem'}}>总支出</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'3rem',fontWeight:700}}>¥{total.toLocaleString()}</div>
      </div>

      {/* Simple by-category summary */}
      {records.length > 0 && (() => {
        const byCat = {};
        records.forEach(r => { byCat[r.category] = (byCat[r.category]||0) + r.amount; });
        return (
          <div style={{background:'#FFFBF5',borderRadius:'12px',padding:'0.75rem',marginBottom:'1rem',display:'flex',flexWrap:'wrap',gap:'0.5rem'}}>
            {Object.entries(byCat).map(([k,v]) => {
              const c = CAT.find(x=>x.key===k);
              return <span key={k} style={{fontSize:'0.78rem',padding:'0.25rem 0.6rem',borderRadius:'99px',background:'rgba(199,91,57,0.06)',color:'#2D2A26'}}>{c?.icon} {c?.label} ¥{v}</span>;
            })}
          </div>
        );
      })()}

      {/* Add button */}
      <div style={{textAlign:'center',marginBottom:'1rem'}}>
        {!showForm ? (
          <button className="btn-primary" style={{width:'auto',padding:'0.5rem 1.5rem',fontSize:'0.85rem'}} onClick={()=>setShowForm(true)}>+ 记一笔</button>
        ) : (
          <div style={{background:'#FFFBF5',borderRadius:'16px',padding:'1rem',textAlign:'left'}}>
            <input className="input-field" type="number" placeholder="金额" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{marginBottom:'0.5rem',fontSize:'0.9rem'}} />
            <div style={{display:'flex',gap:'0.25rem',flexWrap:'wrap',marginBottom:'0.5rem'}}>
              {[15,30,50,100,200,500].map(a=><button key={a} onClick={()=>setForm({...form,amount:String(a)})} style={{padding:'0.25rem 0.6rem',borderRadius:'99px',border:'1px solid #e5e7eb',background:form.amount===String(a)?'#C75B39':'#fff',color:form.amount===String(a)?'#fff':'#6B7280',fontSize:'0.7rem',cursor:'pointer'}}>¥{a}</button>)}
            </div>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',marginBottom:'0.5rem'}}>
              {CAT.map(c=><button key={c.key} onClick={()=>setForm({...form,category:c.key})} style={{padding:'0.25rem 0.6rem',borderRadius:'99px',border:form.category===c.key?'2px solid #C75B39':'1px solid #e5e7eb',background:form.category===c.key?'rgba(199,91,57,0.06)':'#fff',fontSize:'0.7rem',cursor:'pointer'}}>{c.icon} {c.label}</button>)}
            </div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <input className="input-field" style={{flex:1,fontSize:'0.8rem',padding:'0.5rem'}} placeholder="备注（可选）" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
              <button className="btn-primary" style={{width:'auto',padding:'0.5rem 1rem',fontSize:'0.8rem'}} onClick={handleAdd}>记下</button>
            </div>
          </div>
        )}
      </div>

      {/* Records list */}
      {records.map(r => {
        const c = CAT.find(x=>x.key===r.category);
        return (
          <div key={r.id} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.6rem',background:'#FFFBF5',borderRadius:'10px',marginBottom:'0.3rem'}}>
            <span>{c?.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:'0.8rem'}}>{r.note || c?.label}</div>
              <div style={{fontSize:'0.65rem',color:'#8B7E74'}}>{new Date(r.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <span style={{fontWeight:700,fontSize:'0.9rem'}}>¥{r.amount}</span>
            <button onClick={()=>{deleteSpending(r.id);setRecords(prev=>prev.filter(x=>x.id!==r.id));}} style={{border:'none',background:'none',color:'#ccc',cursor:'pointer',padding:'0.2rem'}}>×</button>
          </div>
        );
      })}
    </div>
  );
}
