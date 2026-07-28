// Address type-ahead for the contact form, backed by the City of Ottawa's
// official Municipal Address Points layer (~402,000 address points).
//
//   https://maps.ottawa.ca/arcgis/rest/services/Municipal_Address/MapServer/0
//
// Why this source: it is free, needs no account or API key, and being Ottawa's
// own data it is inherently biased to the service area. The tradeoff is that it
// carries NO postal code — postal codes are Canada Post's, not the city's — so
// the customer still types that field themselves. Everything else (house number,
// street, city) is authoritative.
//
// Why proxy it instead of calling from the browser: the upstream takes a
// SQL-like `where` clause, so unsanitised input would be an injection vector
// into someone else's database. Requests are whitelisted and escaped here, the
// responses are cached at the edge to be a good citizen toward a free public
// service, and the front end stays decoupled from this particular provider.

const SERVICE =
  'https://maps.ottawa.ca/arcgis/rest/services/Municipal_Address/MapServer/0/query';
const UPSTREAM_TIMEOUT_MS = 4000;
const MAX_SUGGESTIONS = 8;

// Keep only characters that can legitimately appear in an Ottawa street address.
// Everything else (including the LIKE wildcards % and _) becomes a space, so a
// visitor cannot smuggle pattern syntax or clause fragments into the query.
function normalize(raw) {
  return String(raw || '')
    .split(',')[0] // drop a trailing ", Ottawa" / ", ON" if they paste one
    .toUpperCase()
    .replace(/[^A-Z0-9 '\-./]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// SQL string escaping: a literal apostrophe is doubled (O'CONNOR -> O''CONNOR).
function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

async function queryOttawa(where, orderBy) {
  const params = new URLSearchParams({
    where: where,
    outFields: 'FULLADDR,ADDRNUM',
    returnDistinctValues: 'true',
    returnGeometry: 'false',
    orderByFields: orderBy,
    resultRecordCount: String(MAX_SUGGESTIONS),
    f: 'json',
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(SERVICE + '?' + params.toString(), {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.error('Ottawa address service HTTP', res.status);
      return [];
    }
    const body = await res.json();
    // ArcGIS reports query errors in a 200 response body.
    if (body && body.error) {
      console.error('Ottawa address service error:', JSON.stringify(body.error));
      return [];
    }
    return (body && body.features) || [];
  } catch (err) {
    console.error('Ottawa address service failed:', err && err.name, err && err.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = normalize(req.query && req.query.q);
  if (q.length < 3) return res.status(200).json({ suggestions: [] });

  // Split a leading house number off the street name, which is how people type:
  // "2623 longf" -> number 2623, street "LONGF".
  const parts = q.match(/^(\d{1,6})\s*(.*)$/);
  let features = [];

  if (parts && parts[2]) {
    const num = parseInt(parts[1], 10);
    const street = sqlEscape(parts[2]);
    features = await queryOttawa(
      "ADDRNUM=" + num + " AND UPPER(FULLNAME) LIKE '" + street + "%'",
      'FULLADDR'
    );
    // No such house number on that street — show the street anyway so the
    // visitor sees real options instead of an empty box.
    if (!features.length) {
      features = await queryOttawa(
        "UPPER(FULLNAME) LIKE '" + street + "%'",
        'ADDRNUM'
      );
    }
  } else if (parts) {
    // Digits only.
    features = await queryOttawa('ADDRNUM=' + parseInt(parts[1], 10), 'FULLADDR');
  } else {
    features = await queryOttawa(
      "UPPER(FULLNAME) LIKE '" + sqlEscape(q) + "%'",
      'ADDRNUM'
    );
  }

  const seen = new Set();
  const suggestions = [];
  for (const f of features) {
    const full = f && f.attributes && f.attributes.FULLADDR;
    if (!full || seen.has(full)) continue;
    seen.add(full);
    suggestions.push({ address: titleCase(full), city: 'Ottawa' });
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  // Address data barely changes; cache hard so repeated prefixes never reach
  // Ottawa's servers twice.
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ suggestions: suggestions });
};
