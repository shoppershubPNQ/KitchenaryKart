'use client';
import {useState} from 'react';
import {ProductCard} from './ProductCard';
import type {PublicProduct} from '@/lib/products';
const INITIAL=5;
/** Product card grid with "View all". Defaults are the PDP's Similar products;
 *  the spare <-> machine sections pass their own heading and noun. */
export function SimilarProducts({products,eyebrow='You might also like',title='Similar products',noun='similar product',id}:{products:PublicProduct[];eyebrow?:string;title?:string;noun?:string;id?:string}){
const[showAll,setShowAll]=useState(false);
if(products.length===0)return null;
const visible=showAll?products:products.slice(0,INITIAL);
const hidden=products.length-INITIAL;
const plural=(n:number)=>`${noun}${n===1?'':'s'}`;
return(<section id={id} className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-6 md:py-12"><div className="flex items-end justify-between gap-4 mb-4 md:mb-6"><div><div className="text-xs font-bold tracking-[2px] uppercase text-brand mb-2">{eyebrow}</div><h2 className="font-head text-[clamp(1.4rem,2vw,1.9rem)] text-ink">{title}</h2></div><div className="text-sm text-muted">{products.length} {plural(products.length)}</div></div>{/* columns live in globals.css so they apply on the FIRST paint — styled-jsx injects from JS and caused a full-width one-column flash */}<div className="kk-similar-grid grid">{visible.map((p)=>(<ProductCard key={p.sku} product={p}/>))}</div>{!showAll&&hidden>0&&(<div className="text-center mt-8"><button type="button" onClick={()=>setShowAll(true)} className="px-8 py-3 font-head text-xs font-bold tracking-wider uppercase text-ink bg-white border-2 border-ink rounded-md hover:bg-ink hover:text-white transition">View all {plural(2)} ({hidden} more)</button></div>)}{showAll&&hidden>0&&(<div className="text-center mt-8"><button type="button" onClick={()=>setShowAll(false)} className="px-8 py-3 font-head text-xs font-bold tracking-wider uppercase text-muted hover:text-ink transition">Show less</button></div>)}</section>);}
