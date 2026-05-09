// Netlify Function — 调用 AI Gateway 转发 Claude 请求
// 部署后访问路径：/.netlify/functions/chat

export default async (request, context) => {
  // 来源校验：只允许你自己的网站调用
  const origin = request.headers.get('origin') || '';
  const allowed = [
    'https://tyyz.org',
    'https://www.tyyz.org',
  ];
  // 开发预览环境也允许（Netlify 部署预览域名）
  const isPreview = /\.netlify\.app$/.test(new URL(origin || 'http://x').hostname);
  if (!allowed.includes(origin) && !isPreview) {
    return new Response('Forbidden', { status: 403 });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 转发到 Anthropic API（通过 AI Gateway，环境变量自动注入）
    const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI Gateway not configured. Enable it in Netlify dashboard.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const upstream = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: await request.text(),
    });

    // 原样转发响应（包括流式）
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = {
  path: '/api/chat',
};
