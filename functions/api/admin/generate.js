// POST /api/admin/generate
// 管理端批量生成激活码
// 请求体: { "password": "管理员密码", "type": "month"|"year", "count": 数量, "prefix": "可选前缀" }

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
    const password = body.password || '';
    const type = body.type || 'month';
    const count = Math.min(parseInt(body.count || '10'), 500);
    const prefix = body.prefix || (type === 'year' ? 'YEAR' : 'MONTH');

    // 验证管理员密码
    const adminPassword = env.ADMIN_PASSWORD || 'admin123';
    if (password !== adminPassword) {
      return new Response(JSON.stringify({ success: false, error: '管理员密码错误' }), { headers, status: 403 });
    }

    if (type !== 'month' && type !== 'year') {
      return new Response(JSON.stringify({ success: false, error: '类型只能是 month 或 year' }), { headers, status: 400 });
    }

    const redisUrl = env.UPSTASH_REDIS_REST_URL;
    const redisToken = env.UPSTASH_REDIS_REST_TOKEN;

    const generatedCodes = [];

    for (let i = 0; i < count; i++) {
      // 生成随机激活码: 前缀 + 6位随机大写字母数字
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${prefix}${randomPart}`;

      // 写入Redis
      await fetch(`${redisUrl}/hmset/code:${code}?_token=${redisToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          used: 'false',
          deviceId: '',
          activatedAt: '',
          expiresAt: '',
        }),
      });

      generatedCodes.push(code);
    }

    return new Response(JSON.stringify({
      success: true,
      count: generatedCodes.length,
      type: type,
      codes: generatedCodes,
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
