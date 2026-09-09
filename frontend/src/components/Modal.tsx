import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><span className="kicker">NexoDB Studio</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button></header>
      {children}
    </section>
  </div>;
}
