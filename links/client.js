let configuration;
let session;
let refreshing;
const STORAGE = 'souprivacy.links.session.v1';
export async function init() {
  const res = await fetch('/api/links-config');
  if (!res.ok) throw new Error('O criador de páginas ainda não foi configurado.');
  configuration = await res.json();
  try { session = JSON.parse(localStorage.getItem(STORAGE)); } catch { session = null; }
  // Implicit email confirmation and password recovery callbacks.
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('access_token') && hash.get('refresh_token')) {
    saveSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token'), expires_at: Date.now()/1000 + Number(hash.get('expires_in') || 3600) });
    const recovery = hash.get('type') === 'recovery'; history.replaceState(null, '', location.pathname + (recovery ? '?recovery=1' : ''));
  } else if (hash.get('error_description')) {
    const message = hash.get('error_description'); history.replaceState(null, '', location.pathname); throw new Error(message);
  }
}
function saveSession(value) {
  session = value;
  if (value) { if (!value.expires_at) value.expires_at = Date.now()/1000 + (value.expires_in || 3600); localStorage.setItem(STORAGE, JSON.stringify(value)); }
  else localStorage.removeItem(STORAGE);
}
export async function request(path, { method = 'GET', body, headers = {}, authenticated = true } = {}) {
  if (authenticated && session && session.expires_at < Date.now()/1000 + 60) {
    if (!refreshing) refreshing = request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: {refresh_token: session.refresh_token}, authenticated:false })
      .then(saveSession).catch(e => { saveSession(null); throw e; }).finally(() => { refreshing = null; });
    await refreshing;
  }
  const authorization = authenticated && session ? {Authorization: 'Bearer ' + session.access_token} : {};
  // Legacy anon JWTs also need a bearer header; new publishable keys do not.
  if (!authorization.Authorization && configuration.key.startsWith('eyJ')) authorization.Authorization = 'Bearer ' + configuration.key;
  const res = await fetch(configuration.url + path, { method, headers: { apikey: configuration.key, ...authorization, ...(body && !(body instanceof Blob) ? {'Content-Type':'application/json'} : {}), ...headers }, body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (data?.code === '23505') throw new Error('Esse endereço já está em uso. Escolha outro nome.');
    if (res.status === 401 || data?.error_code === 'invalid_credentials') throw new Error('Sua sessão expirou ou o e-mail e a senha estão incorretos. Entre novamente.');
    throw new Error(data?.msg || data?.message || data?.error_description || 'Não foi possível concluir. Tente novamente.');
  }
  return data;
}
export async function signIn(email,password) { saveSession(await request('/auth/v1/token?grant_type=password', {method:'POST',body:{email,password},authenticated:false})); }
export async function signUp(email,password) {
  const data = await request('/auth/v1/signup?redirect_to=' + encodeURIComponent(location.origin + '/painel'), {method:'POST',body:{email,password},authenticated:false});
  if (data.access_token) saveSession(data);
  return !!data.access_token;
}
export async function signOut() { try { await request('/auth/v1/logout',{method:'POST'}); } finally { saveSession(null); } }
export async function currentUser() { return session ? request('/auth/v1/user') : null; }
export function getConfig() { return configuration; }
