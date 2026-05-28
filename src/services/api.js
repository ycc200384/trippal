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
export async function generateItinerary({ destination, days, budget, style, dates, selectedSpots, identity, diet, locationHint }) {
  const keys = getKeys();
  if (!keys.deepseek) throw new Error('请配置 DeepSeek API Key');

  const spotList = selectedSpots.map(s => `- ${s.name}（${s.type}，门票¥${s.ticket}，建议${s.duration}小时）`).join('\n');
  const identityText = identity && identity !== 'adult' ? `\n用户身份：${identity}（部分景点有门票优惠）` : '';
  const dietText = diet ? `\n饮食偏好：${diet}` : '';

  const systemPrompt = `你是专业旅游规划师。必须严格按照JSON格式输出，不要输出任何其他内容。`;

  const userPrompt = `目的地：${destination} | 天数：${days}天 | 预算：¥${budget}/人 | 风格：${style}${identityText}${dietText}${locationHint||''}

用户选中的景点：
${spotList}

请规划一个${days}天旅行。重要规则：
1. 地理位置聚类：把距离近的景点分在同一天，不要跨城来回跑
2. 时间合理性：上午适合的景点（如爬山、户外）放上午，晚上适合的（如夜市、夜景、酒吧街）放晚上
3. 每个景点只出现一次，不要重复
4. 景点之间交通要顺路，最好能步行或短途地铁到达
5. 如果用户当前位置已知，以用户位置为每天出发点

输出以下JSON格式：

{
  "summary": "一句话总结这次旅行（10字以内）",
  "totalBudget": 总预算数字,
  "packing": ["物品1","物品2","物品3"...共5-8个],
  "emergency": {"police":"110","hospital":"最近的综合医院名称和电话"},
  "days": [
    {
      "day": 1,
      "theme": "今天的主题（6字以内）",
      "quote": "今天的金句（15字以内，有诗意）",
      "dailyBudget": 当天预算数字,
      "weatherNote": "天气提醒（如：晴天注意防晒）",
      "slots": [
        {
          "time": "08:00-10:30",
          "place": "景点或餐厅名称",
          "type": "景点/美食/活动/休息",
          "icon": "🌄/🍜/☕/🏛/⛰/🌙/🎫/🛍",
          "duration": "2.5h",
          "ticket": 数字（免费填0）,
          "myPrice": 数字（用户身份优惠后价格）,
          "transport": "到达方式（如：地铁4号线宽窄巷子站、步行10分钟）",
          "tip": "实用贴士（15字以内）",
          "food": "附近美食推荐（可为空字符串）"
        }
      ]
    }
  ]
}

要求：
1. 每天3-5个slots，按时间顺序排列
2. ticket和myPrice必须根据用户身份计算（学生/老人半价，军人免票）
3. transport必须具体（地铁几号线、哪个站下车、步行几分钟）
4. tip必须是实用小建议（不是废话）
5. food只填slot附近的真正值得去的店
6. packing要根据季节和目的地实际需求`;

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
  if (!keys.qweather) return null;
  try {
    const res = await fetch(`${QWEATHER_BASE}/weather/now?key=${keys.qweather}&location=${lon},${lat}`);
    const data = await res.json();
    if (data.code !== '200') return null;
    return { temp: data.now.temp, text: data.now.text, icon: data.now.icon, feelsLike: data.now.feelsLike };
  } catch { return null; }
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
