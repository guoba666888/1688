// POST /api/activate
// 激活码验证与设备绑定（一码一设备，按激活时间倒计时）
// 请求体: { "code": "XXX", "deviceId": "XXX" }

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();
    const deviceId = (body.deviceId || '').trim();

    if (!code || !deviceId) {
      return new Response(JSON.stringify({ success: false, error: '激活码和设备ID不能为空' }), { headers, status: 400 });
    }

    const redisUrl = env.UPSTASH_REDIS_REST_URL;
    const redisToken = env.UPSTASH_REDIS_REST_TOKEN;

    // 查询激活码是否存在
    const codeRes = await fetch(`${redisUrl}/hgetall/code:${code}?_token=${redisToken}`);
    const codeData = await codeRes.json();

    if (!codeData.result || codeData.result.length === 0) {
      return new Response(JSON.stringify({ success: false, error: '激活码不存在或无效' }), { headers, status: 404 });
    }

    const fields = {};
    for (let i = 0; i < codeData.result.length; i += 2) {
      fields[codeData.result[i]] = codeData.result[i + 1];
    }

    // 检查是否已使用
    if (fields.used === 'true') {
      // 已使用，检查是否绑定的是同一设备
      if (fields.deviceId === deviceId) {
        // 同一设备重复激活，返回当前状态（不重复计时）
        const expiresAt = parseInt(fields.expiresAt || '0');
        const now = Date.now();
        const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
        if (expiresAt <= now) {
          return new Response(JSON.stringify({ success: false, error: '该激活码已过期' }), { headers, status: 403 });
        }
        return new Response(JSON.stringify({
          success: true,
          type: fields.type,
          days: daysLeft,
          activatedAt: parseInt(fields.activatedAt),
          expiresAt: expiresAt,
          message: '该设备已激活过此码',
        }), { headers });
      } else {
        return new Response(JSON.stringify({ success: false, error: '该激活码已被其他设备使用' }), { headers, status: 403 });
      }
    }

    // 检查该设备是否已经激活过其他码（支持叠加，先查当前状态）
    const deviceRes = await fetch(`${redisUrl}/get/device:${deviceId}?_token=${redisToken}`);
    const deviceData = await deviceRes.json();
    const existingCode = deviceData.result;

    let baseExpiresAt = Date.now();
    if (existingCode && existingCode !== code) {
      // 设备已有激活码，检查是否未过期，未过期则叠加
      const existRes = await fetch(`${redisUrl}/hgetall/code:${existingCode}?_token=${redisToken}`);
      const existData = await existRes.json();
      if (existData.result && existData.result.length > 0) {
        const existFields = {};
        for (let i = 0; i < existData.result.length; i += 2) {
          existFields[existData.result[i]] = existData.result[i + 1];
        }
        const existExpiresAt = parseInt(existFields.expiresAt || '0');
        if (existExpiresAt > Date.now()) {
          baseExpiresAt = existExpiresAt; // 从当前到期时间后叠加
        }
      }
    }

    // 计算新的到期时间（从激活时刻开始倒计时）
    const type = fields.type;
    const days = type === 'year' ? 365 : 30;
    const activatedAt = Date.now();
    const expiresAt = baseExpiresAt + days * 24 * 60 * 60 * 1000;

    // 更新激活码状态并绑定设备（用正确的POST数组形式）
    await fetch(`${redisUrl}/?_token=${redisToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['hmset', `code:${code}`, 'used', 'true', 'deviceId', deviceId, 'activatedAt', String(activatedAt), 'expiresAt', String(expiresAt)]),
    });

    // 更新设备映射
    await fetch(`${redisUrl}/?_token=${redisToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['set', `device:${deviceId}`, code]),
    });

    return new Response(JSON.stringify({
      success: true,
      type,
      days,
      activatedAt,
      expiresAt,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: '服务器错误: ' + e.message }), { headers, status: 500 });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
