import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrips, deleteTrip } from '../services/storage';
import { getPreferences, savePreferences, getApiKeys, saveApiKeys } from '../services/storage';

export default function Settings({ prefs, onUpdate }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identity: 'adult', style: '综合' });
  const [keys, setKeys] = useState({ deepseek: '', amap: '', qweather: '', unsplash: '' });
  const [saved, setSaved] = useState(false);
  const [visible, setVisible] = useState({});
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setForm(prefs || { identity: 'adult', style: '综合' });
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
    <div style={{background:'#FBF7F0',minHeight:'100vh',overflowY:'auto',WebkitOverflowScrolling:'touch',paddingBottom:'6rem'}}>
      <div style={{padding:'1.5rem 1.25rem'}}>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'2rem',fontStyle:'italic',fontWeight:700,marginBottom:'1.5rem'}}>我的</h1>

        {/* Identity + Style */}
        <div className="card grain-card" style={{marginBottom:'1rem'}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.1rem',fontStyle:'italic',marginBottom:'1rem'}}>偏好设置</h3>

          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.5rem'}}>身份（影响门票折扣）</label>
          <select value={form.identity} onChange={e=>setForm({...form,identity:e.target.value})} className="input-field" style={{marginBottom:'1rem'}}>
            <option value="adult">成人（全价）</option>
            <option value="student">大学生（半价）</option>
            <option value="senior">60-65岁（半价）</option>
            <option value="military">军人/残疾人（免票）</option>
            <option value="child">儿童（半价）</option>
          </select>

          <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'#8B7E74',display:'block',marginBottom:'0.5rem'}}>旅行风格</label>
          <input className="input-field" placeholder="综合 / 美食 / 自然 / 文化 / 休闲..." value={form.style} onChange={e=>setForm({...form,style:e.target.value})} />
        </div>

        {/* API Keys */}
        <div className="card grain-card" style={{marginBottom:'1rem'}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.1rem',fontStyle:'italic',marginBottom:'0.5rem'}}>API 密钥</h3>
          <p style={{fontSize:'0.7rem',color:'#8B7E74',marginBottom:'1rem'}}>仅存浏览器本地，不上传</p>

          {[
            { key: 'deepseek', label: 'DeepSeek', required: true, hint: 'platform.deepseek.com' },
            { key: 'amap', label: '高德地图', required: true, hint: 'console.amap.com' },
            { key: 'qweather', label: '和风天气', required: false, hint: 'dev.qweather.com' },
            { key: 'unsplash', label: 'Unsplash', required: false, hint: 'unsplash.com/developers' },
          ].map(({key, label, required, hint}) => (
            <div key={key} style={{marginBottom:'1rem'}}>
              <label style={{fontSize:'0.7rem',letterSpacing:'0.18em',textTransform:'uppercase',color:required?'#C75B39':'#8B7E74',display:'block',marginBottom:'0.3rem',fontWeight:600}}>
                {label} {required ? '*' : ''}
              </label>
              <div style={{display:'flex',gap:'0.4rem'}}>
                <input className="input-field" type={visible[key]?'text':'password'}
                  style={{flex:1,fontFamily:'JetBrains Mono,monospace',fontSize:'0.75rem',padding:'0.65rem'}}
                  value={keys[key]||''}
                  onChange={e=>setKeys({...keys,[key]:e.target.value})}
                  placeholder={hint} />
                <button onClick={()=>setVisible({...visible,[key]:!visible[key]})}
                  style={{width:'2.5rem',height:'2.5rem',borderRadius:'12px',border:'1px solid rgba(139,126,116,0.2)',background:'#FFFBF5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:visible[key]?'#C75B39':'#8B7E74'}}>
                  {visible[key] ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <p style={{fontSize:'0.6rem',color:'#8B7E74',marginTop:'0.2rem'}}>{hint}</p>
            </div>
          ))}
        </div>

        <button className={`btn-primary ${saved?'!bg-sage':''}`} onClick={handleSave} style={{marginBottom:'1.5rem'}}>
          {saved ? '✓ 已保存' : '保存设置'}
        </button>

        {history.length > 0 && (
          <div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.1rem',fontStyle:'italic',marginBottom:'0.75rem'}}>历史行程</h3>
            {history.map(t => (
              <div key={t.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem',background:'#FFFBF5',borderRadius:'12px',marginBottom:'0.4rem'}}>
                <div onClick={()=>navigate(`/plan/${t.id}`)} style={{flex:1,cursor:'pointer'}}>
                  <div style={{fontSize:'0.85rem',fontWeight:500}}>{t.destination}</div>
                  <div style={{fontSize:'0.7rem',color:'#8B7E74'}}>{t.days}天 · {new Date(t.createdAt).toLocaleDateString('zh-CN')}</div>
                </div>
                <button onClick={async()=>{await deleteTrip(t.id);getTrips().then(setHistory)}} style={{border:'none',background:'none',color:'#d1d5db',cursor:'pointer',fontSize:'1.2rem'}}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
