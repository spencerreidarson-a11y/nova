module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('secret_')) {
    return res.status(400).json({ error: 'invalid_api_key' });
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  let searchData;
  try {
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 100 }),
    });
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      return res.status(502).json({ error: 'notion_search_failed', detail: err });
    }
    searchData = await searchRes.json();
  } catch (e) {
    return res.status(502).json({ error: 'notion_unreachable' });
  }

  const pages = await Promise.all((searchData.results || []).map(async (page) => {
    const titleProp = page.properties?.title || page.properties?.Name;
    const title = (titleProp?.title || titleProp?.rich_text || [])[0]?.plain_text || 'Untitled';
    const url = page.url;
    const updatedAt = page.last_edited_time;

    let body = '';
    try {
      const blocksRes = await fetch(
        `https://api.notion.com/v1/blocks/${page.id}/children?page_size=100`,
        { headers }
      );
      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        body = (blocksData.results || [])
          .map(b => (b[b.type]?.rich_text || []).map(r => r.plain_text).join(''))
          .filter(Boolean)
          .join('\n');
      }
    } catch (_) {}

    return { id: page.id, title, body, url, updatedAt };
  }));

  return res.status(200).json({ pages });
};
