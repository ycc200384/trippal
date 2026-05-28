import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip } from '../services/storage';
import { saveSpending, getSpendingByTrip, deleteSpending } from '../services/storage';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

const CATEGORIES = [
  { key: 'transport', label: '交通', icon: '🚕', color: '#C75B39' },
  { key: 'hotel', label: '住宿', icon: '🏨', color: '#3B82F6' },
  { key: 'food', label: '餐饮', icon: '🍜', color: '#5B8C5A' },
  { key: 'ticket', label: '门票', icon: '🎫', color: '#D4A853' },
  { key: 'shopping', label: '购物', icon: '🛍', color: '#8B5CF6' },
  { key: 'other', label: '其他', icon: '📦', color: '#6B7280' },
];

const QUICK_AMOUNTS = [15, 30, 50, 100, 200, 500];

export default function Spending() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [trip, setTrip] = useState(null);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'food', note: '' });
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    (async () => {
      let tid = id ? Number(id) : null;
      if (!tid) {
        const trips = await (await import('../services/storage')).getTrips();
        if (trips.length > 0) tid = trips[0].id;
      }
      if (!tid) { setTrip(null); setLoading(false); return; }
      const t = await getTrip(tid);
      setTrip(t);
      if (t) setBudget(t.budget || 0);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (trip) loadRecords();
  }, [trip]);

  const loadRecords = async () => { const r = await getSpendingByTrip(id); setRecords(r); };

  const totalSpent = records.reduce((s, r) => s + r.amount, 0);
  const remaining = budget - totalSpent;
  const pct = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

  // Chart
  useEffect(() => {
    if (!chartRef.current || records.length === 0) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const byCat = {};
    records.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
    const labels = Object.keys(byCat).map(k => CATEGORIES.find(c => c.key === k)?.label || k);
    const data = Object.values(byCat);
    const colors = Object.keys(byCat).map(k => CATEGORIES.find(c => c.key === k)?.color || '#999');

    chartInstance.current = new Chart(chartRef.current, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#FFFBF5' }] },
      options: { plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { family: "'Noto Sans SC'", size: 12 }, color: '#2D2A26' } } }, responsive: true, maintainAspectRatio: false },
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [records]);

  const handleAdd = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    await saveSpending({ tripId: Number(id), amount: Number(form.amount), category: form.category, note: form.note });
    setForm({ amount: '', category: 'food', note: '' });
    setShowForm(false);
    loadRecords();
  };

  const handleDelete = async (rid) => { await deleteSpending(rid); loadRecords(); };

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',padding:'1.25rem'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1.25rem'}}>
        <button onClick={()=>navigate(-1)} style={{width:'2.5rem',height:'2.5rem',borderRadius:'50%',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D2A26" strokeWidth="1.5"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.5rem',fontStyle:'italic',fontWeight:700}}>花费账单</h1>
          <p style={{fontSize:'0.8rem',color:'#8B7E74'}}>{trip?.destination}</p>
        </div>
      </div>

      {/* Budget overview */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
        <div style={{background:'#FFFBF5',borderRadius:'16px',padding:'1rem',textAlign:'center',border:'1px solid rgba(199,91,57,0.08)'}}>
          <div className="kpi-num" style={{fontSize:'2rem'}}>¥{totalSpent.toLocaleString()}</div>
          <div style={{fontSize:'0.75rem',color:'#8B7E74',marginTop:'0.25rem'}}>已花费</div>
        </div>
        <div style={{background:'#FFFBF5',borderRadius:'16px',padding:'1rem',textAlign:'center',border:'1px solid rgba(91,140,90,0.15)'}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontWeight:700,color:remaining>=0?'#5B8C5A':'#C75B39'}}>¥{remaining.toLocaleString()}</div>
          <div style={{fontSize:'0.75rem',color:'#8B7E74',marginTop:'0.25rem'}}>剩余预算</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{marginBottom:'1.25rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem',color:'#8B7E74',marginBottom:'0.3rem'}}>
          <span>预算使用进度</span><span>{pct}%</span>
        </div>
        <div style={{height:'8px',borderRadius:'4px',background:'#e5e7eb',overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',borderRadius:'4px',background:pct>80?'#C75B39':pct>50?'#D4A853':'#5B8C5A',transition:'width 0.5s'}} />
        </div>
        <div style={{fontSize:'0.7rem',color:'#8B7E74',marginTop:'0.2rem'}}>总预算 ¥{budget.toLocaleString()}</div>
      </div>

      {/* Pie chart */}
      {records.length > 0 && (
        <div style={{background:'#FFFBF5',borderRadius:'16px',padding:'1rem',marginBottom:'1rem',border:'1px solid rgba(199,91,57,0.08)'}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontStyle:'italic',marginBottom:'0.5rem'}}>花费分类</h3>
          <div style={{height:'220px'}}><canvas ref={chartRef} /></div>
        </div>
      )}

      {/* Records */}
      <div style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontStyle:'italic'}}>记录</h3>
          <button onClick={()=>setShowForm(!showForm)} style={{width:'2.25rem',height:'2.25rem',borderRadius:'50%',background:'#C75B39',color:'#fff',border:'none',fontSize:'1.25rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{showForm?'−':'+'}</button>
        </div>

        {showForm && (
          <div style={{background:'#FFFBF5',borderRadius:'16px',padding:'1rem',marginBottom:'0.75rem',border:'1px solid rgba(199,91,57,0.15)'}}>
            <input className="input-field" type="number" placeholder="金额" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{marginBottom:'0.5rem'}} />
            <div style={{display:'flex',gap:'0.25rem',flexWrap:'wrap',marginBottom:'0.5rem'}}>
              {QUICK_AMOUNTS.map(a => <button key={a} onClick={()=>setForm({...form,amount:String(a)})} style={{padding:'0.3rem 0.75rem',borderRadius:'99px',border:'1px solid #e5e7eb',background:form.amount===String(a)?'#C75B39':'transparent',color:form.amount===String(a)?'#fff':'#6B7280',fontSize:'0.75rem',cursor:'pointer'}}>¥{a}</button>)}
            </div>
            <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginBottom:'0.5rem'}}>
              {CATEGORIES.map(c => <button key={c.key} onClick={()=>setForm({...form,category:c.key})} className={`chip ${form.category===c.key?'active':''}`}>{c.icon} {c.label}</button>)}
            </div>
            <input className="input-field" placeholder="备注（可选）" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} style={{marginBottom:'0.5rem'}} />
            <button className="btn-primary" onClick={handleAdd} style={{width:'100%'}}>✓ 记下这笔</button>
          </div>
        )}

        {records.map(r => {
          const cat = CATEGORIES.find(c => c.key === r.category);
          return (
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'#FFFBF5',borderRadius:'12px',marginBottom:'0.4rem',border:'1px solid rgba(199,91,57,0.04)'}}>
              <span style={{fontSize:'1.25rem'}}>{cat?.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:'0.85rem',fontWeight:500}}>{r.note || cat?.label}</div>
                <div style={{fontSize:'0.7rem',color:'#8B7E74'}}>{new Date(r.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <span style={{fontWeight:700,fontFamily:"'Playfair Display',serif",fontSize:'1.1rem'}}>¥{r.amount}</span>
              <button onClick={()=>handleDelete(r.id)} style={{border:'none',background:'none',color:'#d1d5db',cursor:'pointer',fontSize:'1rem',padding:'0.25rem'}}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
