'use client';
import {useState} from 'react';
export function FooterCol({title,children}:{title:string;children:React.ReactNode}){
const[open,setOpen]=useState(false);
return(<div className="border-b border-[#333] md:border-0 md:pb-0"><button type="button" onClick={()=>setOpen((v)=>!v)} aria-expanded={open} className="font-head text-[13px] font-bold tracking-widest uppercase text-white md:mb-4 flex items-center justify-between w-full py-3 md:py-0 md:cursor-default md:pointer-events-none"><span>{title}</span><svg className={`md:hidden w-4 h-4 transition-transform duration-200 text-[#A8A8A8] ${open?'rotate-180':''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button><ul className={`${open?'block':'hidden'} md:block space-y-2.5 text-[13.5px] pb-4 pt-1 md:pb-0 md:pt-0`}>{children}</ul></div>);}
