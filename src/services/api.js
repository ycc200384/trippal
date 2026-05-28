/**
 * API Service — DeepSeek AI + 和风天气 + Unsplash
 */
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const QWEATHER_BASE = 'https://devapi.qweather.com/v7';
const UNSPLASH_BASE = 'https://api.unsplash.com';

function getKeys() {
  try { return JSON.parse(localStorage.getItem('trippal_keys') || '{}'); }
  catch { return {}; }
}

function getPrefs() {
  try { return JSON.parse(localStorage.getItem('trippal_prefs') || '{}'); }
  catch { return { identity: 'adult', diet: '' }; }
}

// ═══════════ DeepSeek — get attraction list ═══════════
export async function getAttractions(destination) {
  const keys = getKeys();
  if (!keys.deepseek) throw new Error('请先在设置中配置 DeepSeek API Key');

  const systemPrompt = `你是中国旅游专家。请严格按照JSON格式输出，不要输出任何其他内容。`;
  const userPrompt = `搜索"${destination}"热门景点，返回10-15个。每个景点提供：
1. name: 景点名称
2. type: 类型（历史人文/自然风光/美食街区/博物馆/主题乐园/网红打卡）
3. duration: 建议游览时间（小时）
4. ticket: 全价门票价格（数字，免费填0）
5. desc: 一句话介绍（15字以内）
6. tags: 2-3个标签如"必去""拍照好""本地人推荐"

输出纯JSON数组格式：[{"name":"...","type":"...","duration":2.5,"ticket":50,"desc":"...","tags":["..."]},...]`;

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.deepseek}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 4096, temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error('API请求失败');
  const data = await res.json();
  const text = data.choices[0].message.content;
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}

// ═══════════ DeepSeek — generate itinerary from selected spots ═══════════
export async function generateItinerary({ destination, days, style, selectedSpots, identity, diet }) {
  const keys = getKeys();
  if (!keys.deepseek) throw new Error('请配置 DeepSeek API Key');

  const spotList = selectedSpots.map(s => `- ${s.name}（${s.type}，门票¥${s.ticket}，建议${s.duration}小时）`).join('\n');
  const identityText = identity && identity !== 'adult' ? `\n用户身份：${identity}（部分景点有门票优惠）` : '';
  const dietText = diet ? `\n饮食偏好：${diet}` : '';

  const systemPrompt = `你是专业旅游规划师。必须严格按照JSON格式输出，不要输出任何其他内容。`;

  const userPrompt = `目的地：${destination} | 天数：${days}天 | 风格：${style}${identityText}${dietText}

用户选中的景点：
${spotList}

请规划一个${days}天旅行。你必须像一个专业导游一样安排路线，核心原则：

1. **顺路第一**：每天景点必须地理位置相邻，步行或短途地铁可达，绝不允许上午在城东下午跑城西
2. **名气优先**：最著名、必去的景点排在每天上午（精力最好的时候），次要景点排下午
3. **时间合理**：户外/爬山→上午，博物馆/室内→下午，夜景→晚上
4. **动线流畅**：景点A到B到C是一条自然的线，不走回头路
5. 不要推荐任何餐厅、美食、小吃

输出以下JSON格式（food字段必须为空字符串，type只能是"景点""活动""休息")：

{
  "summary": "一句话总结（10字以内）",
  "packing": ["物品1","物品2"...共5-8个],
  "days": [
    {
      "day": 1,
      "theme": "今天主题（6字以内）",
      "quote": "金句（15字以内）",
      "weatherNote": "天气提醒",
      "slots": [
        {
          "time": "08:00-10:30",
          "place": "景点名称",
          "type": "景点",
          "icon": "🌄/🏛/⛰/🌙/🎫/🛍",
          "duration": "2.5h",
          "ticket": 数字,
          "myPrice": 数字,
          "transport": "地铁X号线XX站",
          "tip": "实用建议（15字）",
          "food": ""
        }
      ]
    }
  ]
}`;

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.deepseek}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: 8192, temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error('生成失败');
  const data = await res.json();
  return data.choices[0].message.content;
}

// ═══════════ DeepSeek — weather-based trip adjustment ═══════════
export async function adjustForWeather(currentPlan, weatherInfo) {
  const keys = getKeys();
  if (!keys.deepseek) return null;

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keys.deepseek}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是旅行助手。根据天气变化给出行程调整建议，简短（50字以内），实用。' },
        { role: 'user', content: `当前行程：${currentPlan.slice(0, 500)}\n天气：${weatherInfo}\n给出调整建议。` },
      ],
      max_tokens: 200, temperature: 0.5,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices[0].message.content;
}

// ═══════════ 和风天气 ═══════════
export async function getWeatherByCoord(lat, lon) {
  const keys = getKeys();

  // 1. Try 和风 if key available
  if (keys.qweather) {
    try {
      const res = await fetch(`${QWEATHER_BASE}/weather/now?key=${keys.qweather}&location=${lon},${lat}`);
      const data = await res.json();
      if (data.code === '200') {
        return { temp: data.now.temp, text: data.now.text, feelsLike: data.now.feelsLike };
      }
    } catch {}
  }

  // 2. Fallback: 高德天气（用 adcode）
  if (keys.amap) {
    try {
      // Get adcode from reverse geocode
      const geoRes = await fetch(`https://restapi.amap.com/v3/geocode/regeo?key=${keys.amap}&location=${lon},${lat}&extensions=base`);
      const geoData = await geoRes.json();
      const adcode = geoData?.regeocode?.addressComponent?.adcode;
      if (adcode) {
        const wRes = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=${keys.amap}&city=${adcode}&extensions=base`);
        const wData = await wRes.json();
        if (wData.status === '1' && wData.lives?.length > 0) {
          const live = wData.lives[0];
          return { temp: live.temperature, text: live.weather, feelsLike: live.temperature };
        }
      }
    } catch {}
  }

  return null;
}

export async function getDailyWeather(lat, lon, days = 7) {
  const keys = getKeys();
  if (!keys.qweather) return null;
  try {
    const res = await fetch(`${QWEATHER_BASE}/weather/${days}d?key=${keys.qweather}&location=${lon},${lat}`);
    const data = await res.json();
    if (data.code !== '200') return null;
    return data.daily.map(d => ({
      date: d.fxDate, tempMax: d.tempMax, tempMin: d.tempMin,
      text: d.textDay, icon: d.iconDay,
    }));
  } catch { return null; }
}

// ═══════════ Unsplash ═══════════
export async function getDestinationPhoto(query) {
  const keys = getKeys();
  if (!keys.unsplash) return null;
  try {
    const res = await fetch(`${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query + ' travel')}&per_page=1&orientation=landscape`, {
      headers: { 'Authorization': `Client-ID ${keys.unsplash}` },
    });
    const data = await res.json();
    return data.results?.[0]?.urls?.regular || null;
  } catch { return null; }
}
