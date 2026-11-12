const names:Record<string,string>={tavily:'Tavily',exa:'Exa',perplexity:'Perplexity'};
export function ProviderBadge({id}:{id:string}){
 const known=Object.hasOwn(names,id);
 return <span className="sf-provider-badge"><span className="sf-provider-symbol" data-provider={id} aria-hidden="true">{known?id==='perplexity'?'✳':id==='exa'?'e':'T':'?'}</span>{known?names[id]:id==='UNKNOWN'?'取得元不明':id}</span>;
}
export function StatusBadge({status,unknown=false}:{status:string;unknown?:boolean}){
 const kind=status==='BUDGET_BLOCKED'?'hold':unknown||status==='PARTIAL'?'unknown':status==='SUCCEEDED'?'success':'failed';
 const text={hold:'検索停止',unknown:'利用量未確認',success:'完了',failed:status==='CANCELLED'?'中断':'失敗'}[kind];
 return <>{unknown&&status==='FAILED'&&<span className="sf-state-badge" data-state="failed"><span aria-hidden="true">⚠</span>失敗</span>}<span className="sf-state-badge" data-state={kind}><span aria-hidden="true">{{hold:'⊘',unknown:'!',success:'✓',failed:'⚠'}[kind]}</span>{text}</span></>;
}
