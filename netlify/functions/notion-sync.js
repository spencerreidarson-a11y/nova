exports.handler = async function (event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '' };

  let apiKey;
  try { apiKey = JSON.parse(event.body || '{}').apiKey; } catch (_) {}
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('secret_')) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'invalid_api_key' }) };
  }

  const notionHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  let searchData;
  try {
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: notionHeaders,
      body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 100 }),
    });
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'notion_search_failed', detail: err }) };
    }
    searchData = await searchRes.json();
  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'notion_unreachable' }) };
  }

  const pages = await Promise.all((searchData.results || []).map(async (page) => {
    const titleProp = page.properties?.title || page.properties?.Name;
    const title = (titleProp?.title || titleProp?.rich_text || [])[0]?.plain_text || 'Untitled';
    let body = '';
    try {
      const blocksRes = await fetch(
        `https://api.notion.com/v1/blocks/${page.id}/children?page_size=100`,
        { headers: notionHeaders }
      );
      if (blocksRes.ok) {
        const { results: blocks } = await blocksRes.json();
        body = blocks
          .map(b => (b[b.type]?.rich_text || []).map(r => r.plain_text).join(''))
          .filter(Boolean)
          .join('\n');
      }
    } catch (_) {}
    return { id: page.id, title, body, url: page.url, updatedAt: page.last_edited_time };
  }));

  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages }),
  };
};
