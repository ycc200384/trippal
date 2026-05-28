import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getTrips } from '../services/storage';

const TABS = [
  { path: '/', label: '今日', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/discover', label: '发现', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { path: '/plan', label: '行程', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', autoLatest: true },
  { path: '/spending', label: '账单', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', autoLatest: true },
  { path: '/settings', label: '我的', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [latestTripId, setLatestTripId] = useState(null);
  const path = location.pathname;

  useEffect(() => {
    getTrips().then(ts => { if (ts.length > 0) setLatestTripId(ts[0].id); });
  }, [path]);

  return (
    <nav className="bottom-nav" style={{gap:0}}>
      {TABS.map(tab => {
        const isActive = tab.path === '/' ? path === '/' : path.startsWith(tab.path);
        const handleClick = () => {
          if (tab.autoLatest && latestTripId) {
            navigate(`${tab.path}/${latestTripId}`);
          } else if (tab.autoLatest) {
            navigate('/discover');
          } else {
            navigate(tab.path);
          }
        };
        return (
          <button key={tab.path} className={`nav-item ${isActive ? 'active' : ''}`} onClick={handleClick} style={{flex:1}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
