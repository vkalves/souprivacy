import {init,request} from './client.js';
import {validSlug,renderProfile} from './shared.js';
const root = document.getElementById('public-profile');
try {
  const slug = location.pathname.split('/').filter(Boolean)[0];
  if (!validSlug(slug)) throw new Error('Página não encontrada.');
  await init();
  const rows = await request('/rest/v1/link_profiles?slug=eq.' + encodeURIComponent(slug) + '&published=eq.true&select=name,bio,avatar_url,theme,links', {authenticated:false});
  if (!rows.length) throw new Error('Esta página não existe ou ainda não foi publicada.');
  renderProfile(root, rows[0]); document.body.dataset.theme = rows[0].theme;
  document.title = rows[0].name + ' • Souprivacy'; document.querySelector('meta[name="description"]').content = rows[0].bio || 'Todos os links em uma única página.';
} catch(e) {
  root.replaceChildren(); const h = document.createElement('h1'); h.textContent = 'Página indisponível';
  const p = document.createElement('p'); p.textContent = e.message;
  const a = document.createElement('a'); a.href='/painel'; a.className='public-link'; a.textContent='Crie sua página'; root.append(h,p,a);
}
