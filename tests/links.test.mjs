import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const source=await readFile(new URL('../links/shared.js',import.meta.url),'utf8');
const {validSlug,safeURL,validateProfile}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('Unique-path candidates reject reserved routes, traversal and invalid names',()=>{
  for(const slug of ['painel','chamada','elianefen','elianeprevias','becasantos','biancarossi','api','links','../a','Abc','ab','-abc','abc-','a'.repeat(33)])assert.equal(validSlug(slug),false,slug);
  for(const slug of ['seunome','ana-123','a'.repeat(32)])assert.equal(validSlug(slug),true);
});
test('Unsafe schemes and credential-bearing URLs cannot become links',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,test','//example.com','https://a:b@example.com','not a URL'])assert.equal(safeURL(url),'');
  assert.equal(safeURL('https://example.com/path'),'https://example.com/path');
});
test('Profile validation blocks malformed content and over-limit link lists',()=>{
  const p={slug:'meu-nome',name:'Ana',bio:'Oi',avatar_url:'',theme:'dark',links:[{title:'Contato',url:'https://example.com',enabled:true}]};
  assert.equal(validateProfile(p),p);
  for(const change of [{slug:'painel'},{name:''},{bio:'a'.repeat(301)},{theme:'unknown'},{links:[{title:'Clique',url:'javascript:alert(1)'}]},{links:Array(21).fill(p.links[0])}])assert.throws(()=>validateProfile({...p,...change}));
});
test('Public config never exposes server-only keys',()=>{
  const require=createRequire(import.meta.url);const handler=require('../api/links-config.js');
  const before={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY};
  try {
    process.env.SUPABASE_URL='https://example.supabase.co';
    for(const key of ['sb_secret_danger', 'bad-key', 'x.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x','sb_publishable_test','x.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.x']){
      process.env.SUPABASE_PUBLISHABLE_KEY=key;
      const res={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};handler({},res);
      assert.equal(res.code,key.startsWith('sb_publishable_')||key.includes(Buffer.from(JSON.stringify({role:'anon'})).toString('base64url'))?200:503);
      if(res.code!==200)assert.equal(res.body.key,undefined);
    }
  }finally{for(const [name,value]of [['SUPABASE_URL',before.url],['SUPABASE_PUBLISHABLE_KEY',before.key]])if(value===undefined)delete process.env[name];else process.env[name]=value;}
});
