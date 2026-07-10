'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ProductCard} from './ProductCard';
import type {PublicProduct} from '@/lib/products';
interface Props{bestsellers:PublicProduct[];newArrivals:PublicProduct[];}
const HOME_LIMIT=10;
export function HomeTabs({bestsellers,newArrivals}:Props){
const[tab,setTab]=useState<'bestsellers'|'newarrivals'>('bestsellers');
const list=tab==='bestsellers'?bestsellers:newArrivals;
const badge=tab==='bestsellers'?'bestseller':'new';
const visible=list.slice(0,HOME_LIMIT);
const viewAll=tab==='bestsellers'?{text:'View all Best Seller',href:'/shop?collection=bestsellers'}:{text:'View all New Arrival',href:'/shop?collection=new-arrivals'};
return(<><div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] mb-7 flex justify-center gap-2"><TabBtn active={tab==='bestsellers'} onClick={()=>setTab('bestsellers')}>Best Seller</TabBtn><TabBtn active={tab==='newarrivals'} onClick={()=>setTab('newarrivals')}>New Arrival</TabBtn></div><style jsx>{`.kk-home-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:0.75rem;}@media (min-width:768px){.kk-home-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem;}}`}</style><div className="kk-home-grid max-w-site mx-auto px-[6mm] md:px-[1.5cm] grid">{visible.map((p)=>(<ProductCard key={p.sku} product={p} badge={badge as any}/>))}</div><div className="text-center mt-8"><Link href={viewAll.href} className="btn btn-primary">{viewAll.text}</Link></div></>);}
function TabBtn({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){
return(<button type="button" onClick={onClick} className={`px-6 py-2.5 font-head text-xs font-bold tracking-widest uppercase rounded-md border transition ${active?'bg-brand text-white border-brand':'bg-white text-ink border-line hover:border-brand hover:text-brand'}`}>{children}</button>);}
