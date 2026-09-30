export const RESERVED = new Set(['painel','links','api','supabase','tests','chamada','elianefen','elianeprevias','biancarossi','becasantos','admin','login','cadastro','www']);
export function validSlug(slug) { return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug) && !RESERVED.has(slug); }
export function safeURL(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
export function validateProfile(p) {
  if (!validSlug(p.slug)) throw new Error('Use um endereço de 3 a 32 letras minúsculas, números ou hífens. Esse nome também pode estar reservado.');
  if (!p.name.trim() || p.name.length > 80) throw new Error('Preencha seu nome (até 80 caracteres).');
  if (p.bio.length > 300) throw new Error('A descrição pode ter até 300 caracteres.');
  if (!['dark','light','rose','forest'].includes(p.theme)) throw new Error('Escolha um tema válido.');
  if (p.avatar_url && !safeURL(p.avatar_url)) throw new Error('Use uma foto com endereço http ou https.');
  if (p.links.length > 20) throw new Error('Você pode adicionar até 20 links.');
  for (const l of p.links) if (!l.title.trim() || l.title.length > 80 || l.url.length > 2048 || !safeURL(l.url)) throw new Error('Cada botão precisa de um título e de um link completo, começando com https:// ou http://.');
  return p;
}
export function renderProfile(root, p, preview = false) {
  root.replaceChildren(); root.dataset.theme = p.theme;
  const avatar = document.createElement('div'); avatar.className = 'avatar';
  if (safeURL(p.avatar_url)) {
    const img = document.createElement('img'); img.src = safeURL(p.avatar_url); img.alt = p.name; img.referrerPolicy = 'no-referrer';
    img.onerror = () => { avatar.textContent = (p.name || 'S').slice(0,1).toUpperCase(); }; avatar.append(img);
  } else avatar.textContent = (p.name || 'S').slice(0,1).toUpperCase();
  const name = document.createElement('h1'); name.textContent = p.name || 'Seu nome';
  const bio = document.createElement('p'); bio.className = 'bio'; bio.textContent = p.bio;
  root.append(avatar, name, bio);
  const list = document.createElement('div'); list.className = 'public-links';
  for (const item of p.links.filter(l => l.enabled !== false)) {
    const url = safeURL(item.url); if (!url) continue;
    const a = document.createElement('a'); a.className = 'public-link'; a.textContent = item.title;
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    if (preview) a.addEventListener('click', e => e.preventDefault());
    list.append(a);
  }
  const brand = document.createElement('a'); brand.className = 'brand-footer'; brand.textContent = 'Crie sua página • Souprivacy'; brand.href = '/painel';
  root.append(list, brand);
}
