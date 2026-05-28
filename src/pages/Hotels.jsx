import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip } from '../services/storage';
import { searchPOI } from '../services/api';

export default function Hotels() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrip(id).then(async t => {
      setTrip(t);
      if (t) {
        try {
          const results = await searchPOI('酒店|宾馆|民宿', t.destination);
          setHotels(results.filter(h => h.type?.includes('住宿') || h.type?.includes('酒店')));
        } catch {
          // If POI search fails, extract hotels from AI content
          const content = t.content || '';
          const hotelMatches = content.match(/酒店[：:]\s*(.+?)(?=\n|$)/g) || [];
          const extracted = hotelMatches.map(h => ({
            name: h.replace(/酒店[：:]\s*/, ''),
            address: '',
            type: '酒店',
          }));
          setHotels(extracted);
        }
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-5 animate-slide-up">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active:bg-gray-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 className="font-display text-2xl tracking-tight">酒店推荐</h1>
          <p className="text-sm text-ink-muted">{trip?.destination}</p>
        </div>
      </div>

      <div className="space-y-3 animate-slide-up stagger-1">
        {hotels.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-ink-muted mb-3">暂无酒店数据</p>
            <p className="text-sm text-ink-muted">请先在高德地图 API 中配置 Key，或在攻略中查看 AI 推荐的酒店信息</p>
          </div>
        ) : (
          hotels.map((hotel, i) => (
            <div key={i} className="card flex gap-4 items-start">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🏨</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate">{hotel.name}</h3>
                {hotel.address && (
                  <p className="text-xs text-ink-muted mt-0.5 truncate">{hotel.address}</p>
                )}
                {hotel.tel && (
                  <p className="text-xs text-accent mt-0.5">📞 {hotel.tel}</p>
                )}
              </div>
              {hotel.distance && (
                <span className="text-xs text-ink-muted whitespace-nowrap">{hotel.distance}m</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Tips */}
      <div className="card mt-5 animate-slide-up stagger-2 bg-accent/5 border-accent/20">
        <h3 className="font-bold text-sm mb-2">💡 比价提示</h3>
        <p className="text-xs text-ink-muted leading-relaxed">
          由于国内 OTA 平台（携程/美团/飞猪）API 需要企业资质，暂不支持自动比价。
          建议确定意向酒店后，手动在 2-3 个平台比价确认。AI 生成的攻略中已包含推荐酒店的价格区间供参考。
        </p>
      </div>
    </div>
  );
}
