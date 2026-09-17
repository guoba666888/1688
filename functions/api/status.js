// GET /api/status?deviceId=xxx
// 查询设备的会员状态

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId');

  // CORS 头
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!deviceId) {
    return new Response(JSON.stringify({ activated: false, type: null, activatedAt: null, expiresAt: null, daysLeft: 0 }), { headers });
  }

  try {
    const redisUrl = env.UPSTASH_REDIS_REST_URL;
    const redisToken = env.UPSTASH_REDIS_REST_TOKEN;

    // 查询设备绑定的激活码
    const deviceRes = await fetch(`${redisUrl}/get/device:${deviceId}?_token=${redisToken}`);
    const deviceData = await deviceRes.json();
    const code = deviceData.result;

    if (!code) {
      return new Response(JSON.stringify({ activated: false, type: null, activatedAt: null, expiresAt: null, daysLeft: 0 }), { headers });
    }

    // 查询激活码详情
    const codeRes = await fetch(`${redisUrl}/hgetall/code:${code}?_token=${redisToken}`);
    const codeData = await codeRes.json();

    if (!codeData.result || codeData.result.length === 0) {
      return new Response(JSON.stringify({ activated: false, type: null, activatedAt: null, expiresAt: null, daysLeft: 0 }), { headers });
    }

    // hgetall 返回 [field1, value1, field2, value2, ...]
    const fields = {};
    for (let i = 0; i < codeData.result.length; i += 2) {
      fields[codeData.result[i]] = codeData.result[i + 1];
    }

    const expiresAt = parseInt(fields.expiresAt || '0');
    const now = Date.now();
    const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

    const activated = fields.used === 'true' && expiresAt > now;

    return new Response(JSON.stringify({
      activated,
      type: fields.type || null,
      activatedAt: fields.activatedAt ? parseInt(fields.activatedAt) : null,
      expiresAt: expiresAt || null,
      daysLeft,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ activated: false, type: null, activatedAt: null, expiresAt: null, daysLeft: 0, error: e.message }), { headers });
  }
}

// 处理 OPTIONS 预检请求
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
