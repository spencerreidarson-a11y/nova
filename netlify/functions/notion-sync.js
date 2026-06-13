exports.handler = async function (event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '' };

  try {
    // ── PARSE BODY ──────────────────────────────────────
    console.log('[notion-sync] raw body (first 120 chars):', String(event.body || '').slice(0, 120));
    console.log('[notion-sync] content-type header:', event.headers?.['content-type'] || '(none)');

    let apiKey;
    try {
      apiKey = JSON.parse(event.body || '{}').apiKey;
    } catch (parseErr) {
      console.log('[notion-sync] body parse error:', parseErr.message);
    }

    console.log('[notion-sync] apiKey present:', !!apiKey);
    console.log('[notion-sync] apiKey type:', typeof apiKey);
    console.log('[notion-sync] apiKey prefix (first 10):', apiKey ? String(apiKey).slice(0, 10) : '(none)');
    console.log('[notion-sync] starts with secret_:', apiKey ? String(apiKey).startsWith('secret_') : false);

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('secret_')) {
      console.log('[notion-sync] REJECTED at token validation — returning 400');
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'invalid_api_key' }) };
    }

    // ── NOTION SEARCH ───────────────────────────────────
    const notionHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };

    console.log('[notion-sync] calling Notion /v1/search …');
    let searchRes, searchData;
    try {
      searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 100 }),
      });
    } catch (fetchErr) {
      console.log('[notion-sync] fetch to Notion failed (network):', fetchErr.message);
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'notion_unreachable', detail: fetchErr.message }) };
    }

    console.log('[notion-sync] Notion /v1/search status:', searchRes.status);
    const rawSearchBody = await searchRes.text();
    console.log('[notion-sync] Notion /v1/search body (first 400 chars):', rawSearchBody.slice(0, 400));

    if (!searchRes.ok) {
      let errJson;
      try { errJson = JSON.parse(rawSearchBody); } catch (_) { errJson = { raw: rawSearchBody }; }
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'notion_search_failed', status: searchRes.status, detail: errJson }) };
    }

    try {
      searchData = JSON.parse(rawSearchBody);
    } catch (jsonErr) {
      console.log('[notion-sync] failed to parse Notion search response as JSON:', jsonErr.message);
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'notion_bad_json' }) };
    }

    console.log('[notion-sync] pages found:', (searchData.results || []).length);

    // ── FETCH PAGE CONTENT ──────────────────────────────
    const pages = await Promise.all((searchData.results || []).map(async (page) => {
      const titleProp = page.properties?.title || page.properties?.Name;
      const title = (titleProp?.title || titleProp?.rich_text || [])[0]?.plain_text || 'Untitled';
      let body = '';
      try {
        const blocksRes = await fetch(
          `https://api.notion.com/v1/blocks/${page.id}/children?page_size=100`,
          { headers: notionHeaders }
        );
        console.log('[notion-sync] blocks fetch for page', page.id.slice(0, 8), '— status:', blocksRes.status);
        if (blocksRes.ok) {
          const { results: blocks } = await blocksRes.json();
          body = blocks
            .map(b => (b[b.type]?.rich_text || []).map(r => r.plain_text).join(''))
            .filter(Boolean)
            .join('\n');
        }
      } catch (blockErr) {
        console.log('[notion-sync] blocks fetch error for page', page.id.slice(0, 8), ':', blockErr.message);
      }
      return { id: page.id, title, body, url: page.url, updatedAt: page.last_edited_time };
    }));

    console.log('[notion-sync] sync complete, returning', pages.length, 'pages');
    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages }),
    };

  } catch (outerErr) {
    console.log('[notion-sync] UNHANDLED ERROR:', outerErr.message, outerErr.stack);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'internal', detail: outerErr.message }) };
  }
};
