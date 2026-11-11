/* Transferências interempresas: armazenamento independente do financeiro_workspace. */
let transferClient = null, transferUser = null, transferRows = [], transferLoaded = false;
let transferFilter = { period: 'month', buyer: '', receiver: '' };
const transferCompanies = ['Tex Pub', 'Empório Medeiros'];
const transferDate = d => d ? d.split('-').reverse().join('/') : '—';
const transferOption = (name, value) => `<option value="${escape(name)}" ${name === value ? 'selected' : ''}>${escape(name)}</option>`;
function clearTransfers() { transferClient = null; transferUser = null; transferRows = []; transferLoaded = false; }
async function loadTransfers(client, userId) {
  clearTransfers(); transferClient = client; transferUser = userId;
  const { data, error } = await client.from('transferencias_estoque').select('id,data,descricao,valor,comprador,receptor').eq('user_id',userId).order('data',{ascending:false});
  if (error) { transferLoaded = false; window.transferError = error.message; }
  else { transferRows = data || []; transferLoaded = true; window.transferError = ''; }
  if (typeof page !== 'undefined' && page === 'transferencias') render();
}
function transferView() {
  const list = transferRows.filter(t =>
    (transferFilter.period === 'all' || t.data.slice(0,7) === monthValue()) &&
    (!transferFilter.buyer || t.comprador === transferFilter.buyer) &&
    (!transferFilter.receiver || t.receptor === transferFilter.receiver));
  const pub = list.filter(t => t.comprador === 'Tex Pub').reduce((n,t)=>n+Math.round(Number(t.valor)*100),0);
  const emporio = list.filter(t => t.comprador === 'Empório Medeiros').reduce((n,t)=>n+Math.round(Number(t.valor)*100),0);
  const balance = pub - emporio;
  const result = balance > 0 ? `Empório Medeiros deve ${money(balance/100)} ao Tex Pub` : balance < 0 ? `Tex Pub deve ${money(-balance/100)} ao Empório Medeiros` : 'Saldo zerado — empresas quitadas entre si';
  return `<div class="notice">Controle gerencial independente. Nenhum valor desta página entra no caixa, DRE, faturamento ou fluxo diário. O acerto financeiro é feito manualmente.</div>
  ${!transferLoaded ? `<div class="panel red">${window.transferError ? 'Não foi possível carregar as transferências: '+escape(window.transferError)+' — Execute o SQL fornecido no Supabase e atualize a página.' : 'Carregando transferências...'}</div>` : ''}
  <div class="panel"><div class="toolbar"><div><label>Período</label><select id="transferperiod"><option value="month" ${transferFilter.period==='month'?'selected':''}>Mês selecionado no topo</option><option value="all" ${transferFilter.period==='all'?'selected':''}>Todo o histórico</option></select></div><div><label>Comprador</label><select id="transferbuyer"><option value="">Todos</option>${transferCompanies.map(c=>transferOption(c,transferFilter.buyer)).join('')}</select></div><div><label>Receptor</label><select id="transferreceiver"><option value="">Todos</option>${transferCompanies.map(c=>transferOption(c,transferFilter.receiver)).join('')}</select></div><button class="btn primary" id="newtransfer" ${!transferLoaded?'disabled':''}>+ Nova transferência</button></div><p class="small muted">O resumo considera os filtros acima. Para ver a compensação completa, selecione ambas as empresas.</p></div>
  <div class="grid"><div class="tile"><span class="k">Tex Pub forneceu</span><strong>${money(pub/100)}</strong></div><div class="tile"><span class="k">Empório forneceu</span><strong>${money(emporio/100)}</strong></div><div class="tile"><span class="k">Diferença líquida</span><strong>${money(Math.abs(balance)/100)}</strong></div><div class="tile"><span class="k">Movimentações</span><strong>${list.length}</strong></div></div>
  <div class="panel"><h2>Saldo entre as empresas</h2><div style="font-size:clamp(18px,2.5vw,28px);font-weight:800" class="${balance===0?'green':''}">${escape(result)}</div><p class="small muted">Saldo informativo: não representa um pagamento efetuado.</p></div>
  <div class="panel"><h2>Histórico de transferências</h2><div class="tablewrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Comprador</th><th>Receptor</th><th class="right">Valor</th><th>Ações</th></tr></thead><tbody>${list.map(t=>`<tr><td>${transferDate(t.data)}</td><td>${escape(t.descricao)}</td><td>${escape(t.comprador)}</td><td>${escape(t.receptor)}</td><td class="right">${money(t.valor)}</td><td><button class="btn" data-transferedit="${escape(t.id)}">Editar</button></td></tr>`).join('')}</tbody></table>${!list.length?'<div class="empty">Nenhuma transferência encontrada para os filtros.</div>':''}</div></div>`;
}
function bindTransfers() {
  if ($('#transferperiod')) $('#transferperiod').onchange = e => { transferFilter.period=e.target.value;render(); };
  if ($('#transferbuyer')) $('#transferbuyer').onchange = e => { transferFilter.buyer=e.target.value;render(); };
  if ($('#transferreceiver')) $('#transferreceiver').onchange = e => { transferFilter.receiver=e.target.value;render(); };
  if ($('#newtransfer')) $('#newtransfer').onclick=()=>transferForm();
  document.querySelectorAll('[data-transferedit]').forEach(b=>b.onclick=()=>transferForm(transferRows.find(t=>t.id===b.dataset.transferedit)));
}
function transferForm(t) {
  if (!transferLoaded || !transferClient || !transferUser) { alert('Aguarde a conexão com o banco de dados.'); return; }
  const d=t||{data:new Date().toLocaleDateString('en-CA'),descricao:'',valor:'',comprador:'Tex Pub',receptor:'Empório Medeiros'};
  $('#overlay').innerHTML=`<div class="modalbg"><div class="modal"><h2>${t?'Editar':'Nova'} transferência de estoque</h2><p class="small muted">Comprador = empresa que pagou ou comprou. Receptor = empresa que recebeu a mercadoria.</p><form id="transferentry"><div class="formgrid"><div><label>Data</label><input name="data" type="date" required value="${escape(d.data)}"></div><div><label>Valor (R$)</label><input name="valor" type="number" min="0.01" step="0.01" required value="${escape(d.valor)}"></div><div class="wide"><label>Descrição</label><input name="descricao" maxlength="500" required value="${escape(d.descricao)}"></div><div><label>Comprador</label><select name="comprador">${transferCompanies.map(c=>transferOption(c,d.comprador)).join('')}</select></div><div><label>Receptor</label><select name="receptor">${transferCompanies.map(c=>transferOption(c,d.receptor)).join('')}</select></div></div><div class="foot">${t?'<button class="btn danger" type="button" id="deletetransfer">Excluir</button>':''}<button class="btn" type="button" id="canceltransfer">Cancelar</button><button class="btn primary" type="submit" id="savetransfer">Salvar</button></div></form></div></div>`;
  $('#canceltransfer').onclick=close;
  if ($('#deletetransfer')) $('#deletetransfer').onclick=async()=>{
    if (!confirm('Excluir esta transferência?'))return;
    const btn=$('#deletetransfer');btn.disabled=true;
    const {data,error}=await transferClient.from('transferencias_estoque').delete().eq('id',t.id).eq('user_id',transferUser).select('id');
    if(error || !data?.length){alert('Não foi possível excluir: '+(error?.message||'Registro não encontrado'));btn.disabled=false;return;}
    transferRows=transferRows.filter(x=>x.id!==t.id);close();render();
  };
  $('#transferentry').onsubmit=async e=>{
    e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    f.valor=Math.round(Number(f.valor)*100)/100;f.descricao=f.descricao.trim();
    if(!Number.isFinite(f.valor)||f.valor<=0||!f.descricao||f.comprador===f.receptor){alert('Informe valor positivo, descrição e empresas diferentes.');return;}
    const btn=$('#savetransfer');btn.disabled=true;btn.textContent='Salvando...';
    let response;
    if(t) response=await transferClient.from('transferencias_estoque').update(f).eq('id',t.id).eq('user_id',transferUser).select('id,data,descricao,valor,comprador,receptor').single();
    else response=await transferClient.from('transferencias_estoque').insert({...f,user_id:transferUser}).select('id,data,descricao,valor,comprador,receptor').single();
    if(response.error){alert('Erro ao salvar transferência: '+response.error.message);btn.disabled=false;btn.textContent='Salvar';return;}
    if(t)transferRows=transferRows.map(x=>x.id===t.id?response.data:x);else transferRows.push(response.data);
    transferRows.sort((a,b)=>b.data.localeCompare(a.data));close();render();
  };
}
