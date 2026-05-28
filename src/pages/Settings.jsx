import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrips, deleteTrip } from '../services/storage';
import { getPreferences, savePreferences, getApiKeys, saveApiKeys } from '../services/storage';

export default function Settings({ prefs, onUpdate }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ budget: 3000, style: '综合', identity: 'adult', diet: '' });
  const [keys, setKeys] = useState({ deepseek: '', qweather: '', unsplash: '' });
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setForm(prefs || { budget: 3000, style: '综合', identity: 'adult', diet: '' });
    setKeys(getApiKeys());
    getTrips().then(setHistory);
  }, [prefs]);

  const handleSave = () => {
    savePreferences(form);
    saveApiKeys(keys);
    onUpdate?.(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{background:'#FBF7F0',minHeight:'100vh',overflow:'hidden',position:'relative'}}>
      <div className="blob w-48 h-48 animate-blob" style={{background:'rgba(91,140,90,0.04)',bottom:'-2rem',left:'-2rem',position:'absolute',animationDelay:'-6s'}} />

      <div style={{position:'relative',zIndex:1,padding:'1.5rem 1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1.5rem'}}>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontStyle:'italic',fontWeight:700,color:'#2D2A26'}}>我的</h1>
        </div>

        {/* Identity */}
        <div className="card grain-card" style={{marginBottom:'1rem'}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.1rem',fontStyle:'italic',marginBottom:'1rem'}}>身份与偏好</h3>
          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.5rem'}}>身份（影响门票价格）</label>
          <select value={form.identity} onChange={e=>setForm({...form,identity:e.target.value})} className="input-field" style={{marginBottom:'0.75rem'}}>
            <option value="adult">成人（全价）</option>
            <option value="student">大学生（本科及以下半价）</option>
            <option value="senior">60-65岁（半价）</option>
            <option value="military">军人/残疾人（免票）</option>
            <option value="child">儿童 1.2-1.5m（半价）</option>
          </select>
          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.5rem'}}>饮食偏好</label>
          <input className="input-field" placeholder="如：不吃辣、素食、不吃内脏" value={form.diet} onChange={e=>setForm({...form,diet:e.target.value})} style={{marginBottom:'0.75rem'}} />
          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.5rem'}}>默认预算</label>
          <input className="input-field" type="number" value={form.budget} onChange={e=>setForm({...form,budget:Number(e.target.value)})} style={{marginBottom:'0.75rem'}} />
          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.5rem'}}>旅行风格</label>
          <input className="input-field" value={form.style} onChange={e=>setForm({...form,style:e.target.value})} />
        </div>

        {/* API Keys */}
        <div className="card grain-card" style={{marginBottom:'1rem'}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.1rem',fontStyle:'italic',marginBottom:'0.25rem'}}>API 配置</h3>
          <p style={{fontSize:'0.7rem',color:'#8B7E74',marginBottom:'0.75rem'}}>密钥仅保存在浏览器本地</p>
          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#C75B39',display:'block',marginBottom:'0.25rem',fontWeight:600}}>DeepSeek *</label>
          <input className="input-field" type="password" placeholder="sk-..." value={keys.deepseek} onChange={e=>setKeys({...keys,deepseek:e.target.value})} style={{marginBottom:'0.25rem',fontFamily:'JetBrains Mono,monospace',fontSize:'0.8rem'}} />
          <p style={{fontSize:'0.65rem',color:'#8B7E74',marginBottom:'0.75rem'}}>platform.deepseek.com · 送10元</p>
          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.25rem',fontWeight:600}}>和风天气（可选）</label>
          <input className="input-field" type="password" value={keys.qweather} onChange={e=>setKeys({...keys,qweather:e.target.value})} style={{marginBottom:'0.25rem',fontFamily:'JetBrains Mono,monospace',fontSize:'0.8rem'}} />
          <p style={{fontSize:'0.65rem',color:'#8B7E74',marginBottom:'0.75rem'}}>dev.qweather.com · 免费</p>
          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.25rem',fontWeight:600}}>Unsplash（可选）</label>
          <input className="input-field" type="password" value={keys.unsplash} onChange={e=>setKeys({...keys,unsplash:e.target.value})} style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.8rem'}} />
          <p style={{fontSize:'0.65rem',color:'#8B7E74',marginTop:'0.25rem'}}>unsplash.com/developers · 免费50次/天</p>
        </div>

        <button className={`btn-primary ${saved?'!bg-sage':''}`} onClick={handleSave} style={{marginBottom:'1.5rem'}}>{saved?'✓ 已保存':'保存设置'}</button>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.1rem',fontStyle:'italic',marginBottom:'0.75rem'}}>历史行程</h3>
            {history.map(t => (
              <div key={t.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem',background:'#FFFBF5',borderRadius:'12px',marginBottom:'0.4rem',border:'1px solid rgba(199,91,57,0.04)'}}>
                <div onClick={()=>navigate(`/plan/${t.id}`)} style={{flex:1,cursor:'pointer'}}>
                  <div style={{fontSize:'0.9rem',fontWeight:500}}>{t.destination}</div>
                  <div style={{fontSize:'0.7rem',color:'#8B7E74'}}>{t.days}天 · {new Date(t.createdAt).toLocaleDateString('zh-CN')}</div>
                </div>
                <button onClick={async()=>{await deleteTrip(t.id);getTrips().then(setHistory);}} style={{border:'none',background:'none',color:'#d1d5db',cursor:'pointer',fontSize:'1rem'}}>×</button>
              </div>
            ))}
          </div>
        )}

        <p style={{textAlign:'center',fontSize:'0.7rem',color:'rgba(139,126,116,0.5)',marginTop:'1.5rem'}}>TripPal v1.0 · 所有数据仅存储在你的设备中</p>
      </div>
    </div>
  );
}
