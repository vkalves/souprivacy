import {init,request,signIn,signUp,signOut,currentUser,getConfig} from './client.js';
import {validateProfile,renderProfile,safeURL} from './shared.js';
const $ = id => document.getElementById(id);
let user, saved = null, signup = false, dirty = false, links = [];
const status = message => { $('status').textContent = message; };
const fields = ['slug','name','bio','avatar','theme','published'];
function draft() { return {slug:$('slug').value.trim(),name:$('name').value.trim(),bio:$('bio').value,avatar_url:$('avatar').value.trim(),theme:$('theme').value,published:$('published').checked,links:links.map(l=>({...l}))}; }
function changed() { dirty = true; renderProfile($('preview'),draft(),true); }
function fill(p) {
  $('slug').value = p.slug; $('name').value = p.name; $('bio').value = p.bio; $('avatar').value = p.avatar_url; $('theme').value = p.theme; $('published').checked = p.published;
  links = structuredClone(p.links); renderLinks(); dirty=false; renderProfile($('preview'),draft(),true);
}
function renderLinks() {
  $('link-editor').replaceChildren();
  links.forEach((l,i) => {
    const row = document.createElement('div'); row.className='link-row';
    for (const [field,title] of [['title','Título do botão'],['url','Endereço do link']]) {
      const label=document.createElement('label'); label.textContent=title;
      const input=document.createElement('input'); input.value=l[field]; input.required=true; input.maxLength=field==='title'?80:2048; input.type=field==='url'?'url':'text'; input.placeholder=field==='url'?'https://…':'Meu Instagram';
      input.addEventListener('input',()=>{l[field]=input.value;changed();}); label.append(input); row.append(label);
    }
    const tools=document.createElement('div'); tools.className='row-tools';
    const label=document.createElement('label');label.className='check';const check=document.createElement('input');check.type='checkbox';check.checked=l.enabled!==false;check.onchange=()=>{l.enabled=check.checked;changed();}; label.append(check,'Visível');tools.append(label);
    for(const [text,offset] of [['↑',-1],['↓',1]]) {
      const b=document.createElement('button');b.type='button';b.className='quiet';b.textContent=text;b.setAttribute('aria-label',offset<0?'Mover link para cima':'Mover link para baixo');b.disabled=i+offset<0||i+offset>=links.length;
      b.onclick=()=>{[links[i],links[i+offset]]=[links[i+offset],links[i]];renderLinks();changed();};tools.append(b);
    }
    const remove=document.createElement('button');remove.type='button';remove.className='quiet';remove.textContent='Remover';remove.onclick=()=>{links.splice(i,1);renderLinks();changed();};tools.append(remove);row.append(tools);$('link-editor').append(row);
  });
  $('add-link').disabled=links.length>=20;
}
function updateSaved() {
  $('publication').textContent=saved?.published?'Publicada':'Rascunho';
  $('copy').disabled=!saved?.published; $('open-page').hidden=!saved?.published; $('delete-page').hidden=!saved;
  if(saved) $('open-page').href=location.origin+'/'+saved.slug;
}
async function enterEditor() {
  user=await currentUser();
  if(!user){$('auth').hidden=false;return;}
  $('auth').hidden=true;$('logout').hidden=false;
  if(new URLSearchParams(location.search).has('recovery')){$('recovery').hidden=false;return;}
  const rows=await request('/rest/v1/link_profiles?user_id=eq.'+encodeURIComponent(user.id)+'&select=*');
  saved=rows[0]||null;fill(saved||{slug:'',name:'',bio:'',avatar_url:'',theme:'dark',published:false,links:[]});updateSaved();$('editor').hidden=false;
}
function authMode(value){signup=value;$('login-tab').setAttribute('aria-pressed',String(!value));$('signup-tab').setAttribute('aria-pressed',String(value));$('auth-submit').textContent=value?'Criar conta':'Entrar';$('password').autocomplete=value?'new-password':'current-password';$('recover').hidden=value;status('');}
$('login-tab').onclick=()=>authMode(false);$('signup-tab').onclick=()=>authMode(true);
$('auth-form').onsubmit=async e=>{
  e.preventDefault();$('auth-submit').disabled=true;status('Aguarde…');
  try {
    const email=$('email').value.trim(),password=$('password').value;
    if(signup && !(await signUp(email,password))){status('Conta criada. Confirme seu e-mail pelo link recebido e depois entre.');return;}
    if(!signup)await signIn(email,password);$('password').value='';await enterEditor();status('');
  }catch(e){status(e.message);}finally{$('auth-submit').disabled=false;}
};
$('recover').onclick=async()=>{
  const email=$('email').value.trim();if(!$('email').checkValidity()||!email){status('Preencha seu e-mail para receber o link de recuperação.');return;}
  $('recover').disabled=true;
  try{await request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+'/painel'),{method:'POST',body:{email},authenticated:false});status('Se houver uma conta com esse e-mail, você receberá o link para trocar a senha.');}catch(e){status(e.message);}finally{$('recover').disabled=false;}
};
$('recovery-form').onsubmit=async e=>{
  e.preventDefault();const button=e.submitter;button.disabled=true;
  try{await request('/auth/v1/user',{method:'PUT',body:{password:$('new-password').value}});$('new-password').value='';history.replaceState(null,'','/painel');$('recovery').hidden=true;await enterEditor();status('Senha atualizada.');}catch(e){status(e.message);}finally{button.disabled=false;}
};
$('logout').onclick=async()=>{if(dirty&&!confirm('Você tem alterações sem salvar. Deseja sair?'))return;try{await signOut();}catch{}location.assign('/painel');};
for(const field of fields)$(field).addEventListener('input',changed);
$('domain-prefix').textContent=location.host+'/';
$('add-link').onclick=()=>{if(links.length>=20)return;links.push({title:'',url:'',enabled:true});renderLinks();changed();$('link-editor').lastElementChild.querySelector('input').focus();};
$('profile-form').onsubmit=async e=>{
  e.preventDefault();$('save').disabled=true;status('Salvando…');
  try {
    const p=validateProfile(draft());
    const rows=await request('/rest/v1/link_profiles'+(saved?'?user_id=eq.'+encodeURIComponent(user.id):''),{method:saved?'PATCH':'POST',body:saved?p:{...p,user_id:user.id},headers:{Prefer:'return=representation'}});
    if(!rows?.length)throw new Error('Sua página não foi salva. Entre novamente e tente outra vez.');
    saved=rows[0];dirty=false;updateSaved();status(saved.published?'Página publicada! Você já pode copiar seu link.':'Rascunho salvo. Marque a opção de página pública quando estiver pronto.');
  }catch(e){status(e.message);}finally{$('save').disabled=false;}
};
$('photo').onchange=async()=>{
  const file=$('photo').files[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152){status('Envie JPG, PNG ou WebP de até 2 MB.');$('photo').value='';return;}
  $('photo').disabled=true;$('save').disabled=true;status('Enviando foto…');
  try {
    const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];
    const path=user.id+'/'+crypto.randomUUID()+'.'+extension;
    await request('/storage/v1/object/link-avatars/'+path,{method:'POST',body:file,headers:{'Content-Type':file.type}});
    $('avatar').value=getConfig().url+'/storage/v1/object/public/link-avatars/'+path;changed();status('Foto enviada. Salve a página para usar a nova foto.');
  }catch(e){status(e.message);}finally{$('photo').disabled=false;$('save').disabled=false;$('photo').value='';}
};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/'+saved.slug);status('Link copiado!');}catch{status('Copie este endereço: '+location.origin+'/'+saved.slug);}};
$('delete-page').onclick=async()=>{
  if(!confirm('Excluir sua página e seus links? Essa ação não pode ser desfeita.'))return;
  $('delete-page').disabled=true;
  try{await request('/rest/v1/link_profiles?user_id=eq.'+encodeURIComponent(user.id),{method:'DELETE'});saved=null;fill({slug:'',name:'',bio:'',avatar_url:'',theme:'dark',published:false,links:[]});updateSaved();status('Página excluída.');}catch(e){status(e.message);}finally{$('delete-page').disabled=false;}
};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
try{await init();await enterEditor();status('');}catch(e){$('auth').hidden=false;status(e.message);}
