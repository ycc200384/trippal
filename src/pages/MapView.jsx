import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip } from '../services/storage';
import { searchAround, getAmapScriptUrl } from '../services/api';

export default function MapView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load trip
  useEffect(() => {
    getTrip(id).then(t => { setTrip(t); setLoading(false); });
  }, [id]);

  // Load AMap script
  useEffect(() => {
    if (document.querySelector('script[src*="webapi.amap.com"]')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = getAmapScriptUrl();
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!scriptLoaded || !trip || !containerRef.current || !window.AMap) return;

    const map = new window.AMap.Map(containerRef.current, {
      zoom: 11,
      center: [116.397, 39.908], // default Beijing, will geocode
    });
    mapRef.current = map;

    // Geocode destination
    const geocoder = new window.AMap.Geocoder();
    geocoder.getLocation(trip.destination, (status, result) => {
      if (status === 'complete' && result.geocodes.length > 0) {
        const loc = result.geocodes[0].location;
        map.setCenter([loc.lng, loc.lat]);
        map.setZoom(12);

        // Add marker for destination
        new window.AMap.Marker({
          position: [loc.lng, loc.lat],
          title: trip.destination,
        }).setMap(map);

        // Search POIs around
        searchAround(loc.lng, loc.lat).then(pois => {
          pois.slice(0, 15).forEach(poi => {
            new window.AMap.Marker({
              position: [poi.location[0], poi.location[1]],
              title: poi.name,
              label: {
                content: `<span style="background:#0f172a;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">${poi.name.slice(0, 6)}</span>`,
                offset: [0, -30],
              },
            }).setMap(map);
          });
        }).catch(() => {});
      }
    });

    return () => { map.destroy(); };
  }, [scriptLoaded, trip]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="bg-white/90 backdrop-blur rounded-xl px-4 py-2 shadow-lg">
            <span className="font-bold text-sm">{trip?.destination}</span>
            <span className="text-xs text-ink-muted ml-2">周边探索</span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {!scriptLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-sm text-ink-muted">加载地图中...</span>
          </div>
        </div>
      )}
    </div>
  );
}
