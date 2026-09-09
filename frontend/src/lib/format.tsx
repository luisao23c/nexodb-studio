import type { Field } from '../types';

export function formatValue(value:unknown, field:Field):{html:React.ReactNode;text:string}{
  if(value===null||value===undefined||value==='') return {html:<span className="fmt-empty">—</span>,text:''};
  const cfg = field.format_config??{};
  const raw = value as string|number;
  switch(field.format){
    case 'currency': return {html:<span className="fmt-money">{new Intl.NumberFormat('es-MX',{style:'currency',currency:(cfg.prefix as string)||'MXN'}).format(Number(raw))}</span>,text:String(raw)};
    case 'number': return {html:<span>{new Intl.NumberFormat('es-MX',{minimumFractionDigits:cfg.decimals??0,maximumFractionDigits:cfg.decimals??2}).format(Number(raw))}{cfg.suffix??''}</span>,text:String(raw)};
    case 'percent': return {html:<span className="fmt-percent">{Number(raw).toFixed(cfg.decimals??0)}%</span>,text:String(raw)};
    case 'date': return {html:<span>{new Date(String(raw)).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</span>,text:String(raw)};
    case 'datetime': return {html:<span>{new Date(String(raw)).toLocaleString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>,text:String(raw)};
    case 'time': return {html:<span>{String(raw).slice(0,8)}</span>,text:String(raw)};
    case 'uppercase': return {html:<span className="fmt-upper">{String(raw).toUpperCase()}</span>,text:String(raw)};
    case 'lowercase': return {html:<span className="fmt-lower">{String(raw).toLowerCase()}</span>,text:String(raw)};
    case 'capitalize': return {html:<span className="fmt-cap">{String(raw).charAt(0).toUpperCase()+String(raw).slice(1)}</span>,text:String(raw)};
    case 'badge': {const color=cfg.colors?.[String(raw)];return {html:<span className="fmt-badge" style={color?{background:color+'22',color}:undefined}>{String(raw)}</span>,text:String(raw)};}
    case 'email': return {html:<a className="fmt-link" href={`mailto:${raw}`}>{String(raw)}</a>,text:String(raw)};
    case 'phone': return {html:<a className="fmt-link" href={`tel:${raw}`}>{String(raw)}</a>,text:String(raw)};
    case 'link': return {html:<a className="fmt-link" href={String(raw)} target="_blank" rel="noreferrer">{String(raw).replace(/^https?:\/\//,'').slice(0,32)}</a>,text:String(raw)};
    case 'image': return {html:<img className="fmt-img" src={String(raw)} alt=""/>,text:String(raw)};
    case 'color': return {html:<span className="fmt-swatch"><i style={{background:String(raw)}}/>{String(raw)}</span>,text:String(raw)};
    case 'stars': {const n=Math.max(0,Math.min(5,Number(raw)));return {html:<span className="fmt-stars" title={`${n}/5`}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</span>,text:String(raw)};}
    case 'progress': {const n=Math.max(0,Math.min(100,Number(raw)));return {html:<span className="fmt-progress"><i><b style={{width:`${n}%`}}/></i>{n}%</span>,text:String(raw)};}
    case 'truncate': return {html:<span title={String(raw)}>{String(raw).slice(0,Number(cfg.decimals??24))}…</span>,text:String(raw)};
    case 'json': return {html:<code className="fmt-json">{JSON.stringify(raw).slice(0,40)}</code>,text:String(raw)};
    case 'relative_time': {const diff=Date.now()-new Date(String(raw)).getTime();const mins=Math.round(diff/60000);const txt=Math.abs(mins)<60?`${mins} min`:Math.abs(mins)<1440?`${Math.round(mins/60)} h`:`${Math.round(mins/1440)} d`;return {html:<span title={String(raw)}>hace {txt}</span>,text:String(raw)};}
    default:
      if(typeof raw==='boolean') return {html:raw?<span className="fmt-yes">Sí</span>:<span className="fmt-no">No</span>,text:raw?'Sí':'No'};
      return {html:<span>{String(raw)}</span>,text:String(raw)};
  }
}
