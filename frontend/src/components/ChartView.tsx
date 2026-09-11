import { useMemo, useState } from 'react';
import type { ChartData } from '../types';

const PALETTE = ['#6d5dfc','#1cc8a0','#f59e0b','#ec4899','#3b82f6','#10b981','#ef4444','#8b5cf6','#14b8a6','#f97316'];

/** Lightweight dependency-free SVG charts: bar, line, area, pie, donut. */
export function ChartView({ chart, data, height = 240 }:{ chart:ChartData['chart']; data:ChartData['data']; height?:number }) {
  const [hover,setHover] = useState<number|null>(null);
  const width = 640;
  const pad = { t:14, r:14, b:34, l:46 };
  const max = useMemo(()=>Math.max(1,...data.map(d=>d.value)),[data]);
  const total = useMemo(()=>data.reduce((s,d)=>s+d.value,0)||1,[data]);

  if(!data.length) return <div className="chart-empty">Sin datos para graficar todavía.</div>;

  if(chart.chart_type==='pie'||chart.chart_type==='donut'){
    const cx=width/3, cy=height/2, r=Math.min(cx,cy)-16, inner=chart.chart_type==='donut'?r*0.58:0;
    const angles = data.reduce<{a0:number;a1:number}[]>((acc,d)=>{
      const a0 = acc.length ? acc[acc.length-1].a1 : -Math.PI/2;
      return [...acc, {a0, a1:a0+(d.value/total)*Math.PI*2}];
    },[]);
    const slices = data.map((d,i)=>{
      const {a0,a1} = angles[i];
      const large=(a1-a0)>Math.PI?1:0;
      const x0=cx+r*Math.cos(a0), y0=cy+r*Math.sin(a0), x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
      const xi1=cx+inner*Math.cos(a1), yi1=cy+inner*Math.sin(a1), xi0=cx+inner*Math.cos(a0), yi0=cy+inner*Math.sin(a0);
      const path = inner? `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} L${xi1} ${yi1} A${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z` : `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      return {path, color:PALETTE[i%PALETTE.length], d, i};
    });
    return <div className="chart-flex">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label={chart.name}>
        {slices.map(s=><path key={s.i} d={s.path} fill={s.color} opacity={hover===null||hover===s.i?1:0.35} onMouseEnter={()=>setHover(s.i)} onMouseLeave={()=>setHover(null)}/>)}
        {chart.chart_type==='donut'&&<text x={cx} y={cy+6} textAnchor="middle" className="chart-total">{total.toLocaleString('es-MX')}</text>}
      </svg>
      <ul className="chart-legend">{slices.map(s=><li key={s.i} onMouseEnter={()=>setHover(s.i)} onMouseLeave={()=>setHover(null)}><i style={{background:s.color}}/><span>{s.d.label}</span><b>{s.d.value.toLocaleString('es-MX')} · {Math.round(s.d.value/total*100)}%</b></li>)}</ul>
    </div>;
  }

  const innerW = width-pad.l-pad.r, innerH = height-pad.t-pad.b;
  const step = innerW/Math.max(data.length,1);
  const y = (v:number)=>pad.t+innerH-(v/max)*innerH;
  const points = data.map((d,i)=>`${pad.l+step*i+step/2},${y(d.value)}`).join(' ');
  const areaPath = `M${pad.l},${y(0)} L${points.replaceAll(',', ' ').split(' ').reduce((acc,v,i,arr)=>i%2?`${acc} L${arr[i-1]} ${v}`:acc,'').slice(1)} L${pad.l+innerW},${y(0)} Z`;

  return <div className="chart-block">
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label={chart.name}>
      {[0,0.25,0.5,0.75,1].map(t=><g key={t}>
        <line x1={pad.l} x2={width-pad.r} y1={y(max*t)} y2={y(max*t)} className="chart-grid"/>
        <text x={pad.l-8} y={y(max*t)+4} textAnchor="end" className="chart-tick">{compact(max*t)}</text>
      </g>)}
      {chart.chart_type==='bar'&&data.map((d,i)=><rect key={i} x={pad.l+step*i+step*0.15} y={y(d.value)} width={step*0.7} height={y(0)-y(d.value)} rx={5} fill={chart.color||PALETTE[i%PALETTE.length]} opacity={hover===null||hover===i?1:0.55} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}/>)}
      {(chart.chart_type==='line'||chart.chart_type==='area')&&<>
        {chart.chart_type==='area'&&<path d={areaPath} fill={chart.color} opacity={0.14}/>}
        <polyline points={points} fill="none" stroke={chart.color} strokeWidth={2.5} strokeLinejoin="round"/>
        {data.map((d,i)=><circle key={i} cx={pad.l+step*i+step/2} cy={y(d.value)} r={hover===i?5.5:3.5} fill={chart.color} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}/>)}
      </>}
      {data.map((d,i)=><text key={i} x={pad.l+step*i+step/2} y={height-12} textAnchor="middle" className="chart-tick">{String(d.label).slice(0,9)}</text>)}
      {hover!==null&&<text x={pad.l+step*hover+step/2} y={Math.max(y(data[hover].value)-10,16)} textAnchor="middle" className="chart-value">{data[hover].value.toLocaleString('es-MX')}</text>}
    </svg>
  </div>;
}

function compact(n:number){ return n>=1000?`${(n/1000).toFixed(1)}k`:String(Math.round(n*100)/100); }
