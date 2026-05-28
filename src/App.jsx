import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Today from './pages/Today';
import Discover from './pages/Discover';
import Itinerary from './pages/Itinerary';
import Spending from './pages/Spending';
import Settings from './pages/Settings';
import BottomNav from './components/BottomNav';
import { getTrips, getPreferences } from './services/storage';

export default function App() {
  const [trips, setTrips] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    getTrips().then(setTrips);
    getPreferences().then(setPrefs);
  }, [refresh]);

  // Gentle resume — reload trip data but don't re-render everything
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        getTrips().then(setTrips);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div style={{minHeight:'100vh',paddingBottom:'5rem',backgroundColor:'#FBF7F0',color:'#2D2A26'}}>
      <Routes>
        <Route path="/" element={<Today trips={trips} prefs={prefs} onRefresh={() => setRefresh(r => r + 1)} />} />
        <Route path="/discover" element={<Discover trips={trips} onRefresh={() => setRefresh(r => r + 1)} />} />
        <Route path="/plan/:id" element={<Itinerary onRefresh={() => setRefresh(r => r + 1)} />} />
        <Route path="/spending/:id" element={<Spending />} />
        <Route path="/settings" element={<Settings prefs={prefs} onUpdate={setPrefs} />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
