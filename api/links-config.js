module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^https:\/\//.test(url) || key.startsWith('sb_secret_')) {
    return res.status(503).json({ error: 'O criador de páginas ainda não foi configurado.' });
  }
  // Only publishable or legacy anon keys may be exposed to browsers.
  if (!key.startsWith('sb_publishable_')) {
    try {
      const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      if (claims.role !== 'anon') throw new Error('Invalid public key');
    } catch { return res.status(503).json({ error: 'Configure uma chave pública do Supabase.' }); }
  }
  return res.status(200).json({ url: url.replace(/\/$/, ''), key });
};
