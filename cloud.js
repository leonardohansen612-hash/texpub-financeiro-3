(async function(){
const url=window.TEX_SUPABASE_URL,anon=window.TEX_SUPABASE_ANON_KEY;
 const url=window.TEXPUB_SUPABASE_URL,anon=window.TEXPUB_SUPABASE_ANON_KEY;
 if(!url||!anon||url.startsWith('COLE_')||anon.startsWith('COLE_')){error.textContent='Configure config.js com URL e chave pública do Supabase.';return;}
 if(!window.supabase){error.textContent='Não foi possível carregar a biblioteca do Supabase.';return;}
 const client=window.supabase.createClient(url,anon,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
 let user=null,saveQueue=Promise.resolve(),version=0;
 async function load(){
   const {data:{user:u},error:e}=await client.auth.getUser();
   if(e||!u){user=null;document.body.classList.add('locked');document.getElementById('authscreen').style.display='flex';return;}
   user=u;state.textContent='Carregando nuvem...';
   const result=await client.from('financeiro_workspace').select('payload').eq('user_id',user.id).maybeSingle();
   if(result.error){error.textContent='Erro ao consultar banco: '+result.error.message;document.body.classList.add('locked');return;}
   db=result.data?.payload||structuredClone(initial);
   document.body.classList.remove('locked');document.getElementById('authscreen').style.display='none';
   state.textContent=result.data?'● Nuvem conectada':'● Base vazia — importe seu backup';render();
 }
 window.cloudSave=function(){
   if(!user){alert('Faça login novamente.');return;}
   const snapshot=JSON.parse(JSON.stringify(db));const id=user.id;const current=++version;
   state.textContent='Salvando...';
   saveQueue=saveQueue.catch(()=>{}).then(async()=>{
     const {error:e}=await client.from('financeiro_workspace').upsert({user_id:id,payload:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'});
     if(e){state.textContent='⚠ Erro ao salvar';alert('Dados NÃO salvos no Supabase: '+e.message);throw e;}
     if(current===version)state.textContent='● Salvo na nuvem';
   });
 };
 document.getElementById('loginform').addEventListener('submit',async e=>{
   e.preventDefault();error.textContent='Entrando...';
   const {error:err}=await client.auth.signInWithPassword({email:document.getElementById('loginemail').value.trim(),password:document.getElementById('loginpassword').value});
   if(err){error.textContent='Não foi possível entrar: '+err.message;return;}
   error.textContent='';await load();
 });
 document.getElementById('logout').onclick=async()=>{await saveQueue.catch(()=>{});await client.auth.signOut();user=null;db=structuredClone(initial);document.body.classList.add('locked');document.getElementById('authscreen').style.display='flex';state.textContent='Desconectado';};
 await load();
})();
