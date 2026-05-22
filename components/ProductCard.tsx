
'use client';
import Link from 'next/link';
import Image from 'next/image';
import {useState} from 'react';
import {imgSrc,inr,letter,savingsPercent} from '@/lib/format';
import {addToCart,openDrawer} from '@/lib/cart';
import {openAuth,useAuth} from '@/lib/useAuth';
import {toggleWishlist,useIsInWishlist} from '@/lib/wishlist';
import {pseudoRating,Stars} from '@/lib/rating';
import type {PublicProduct} from '@/lib/products';
interface Props{product:PublicProduct;badge?:'bestseller'|'new'|null;}
export function ProductCard({product:p,badge}:Props){
const save=savingsPercent(p.price,p.mrp);const rating=pseudoRating(p.sku);const{loggedIn}=useAuth();const saved=useIsInWishlist(p.sku);
// Tick counter forces the heart svg to remount on every click so the
// kk-heart-pop CSS keyframe always re-triggers (animations don't
// replay when the same element + same class stays mounted).
const [heartTick,setHeartTick]=useState(0);
function gated(action:()=>void){if(loggedIn){action();}else{openAuth({onSuccess:action});}}
return(<div className="product-card">{badge==='bestseller'&&<span className="product-badge">Best Seller</span>}{badge==='new'&&<span className="product-badge">New</span>}{save>=20&&(<span className="product-badge product-badge-discount" style={{top:badge?40:10}}>{save}% OFF</span>)}<button type="button" aria-label={saved?'Remove from wishlist':'Add to wishlist'} aria-pressed={saved} onClick={(e)=>{e.preventDefault();e.stopPropagation();toggleWishlist(p);setHeartTick(t=>t+1);}} className={`absolute top-2 right-2 z-[3] w-9 h-9 rounded-full grid place-items-center bg-white/95 border border-line shadow-sm transition hover:scale-105 ${saved?'text-brand':'text-muted hover:text-brand'}`}><svg key={heartTick} className={heartTick>0?'kk-heart-pop':''} viewBox="0 0 24 24" width="18" height="18" fill={saved?'currentColor':'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button><div className={`product-img ${p.imageUrl?'bg-white':''}`}>{p.imageUrl?(<Image src={imgSrc(p.imageUrl)} alt={p.name} fill sizes="(max-width: 768px) 50vw, 280px" className="object-contain" loading="lazy"/>):(<span className="product-img-letter">{letter(p.name)}</span>)}</div><div className="p-4 flex flex-col gap-1.5 flex-1"><div className="text-[10.5px] text-muted tracking-widest uppercase font-semibold">Kitchenary Kart</div><div className="text-sm font-bold text-ink line-clamp-2 leading-snug min-h-[2.7em]"><Link href={`/product/${encodeURIComponent(p.sku)}`} className="hover:text-brand">{p.name}</Link></div><div className="flex items-center gap-1.5"><Stars value={rating.stars}/><span className="text-[13px] text-ink font-medium whitespace-nowrap">{rating.stars.toFixed(1)} ({rating.count})</span></div>{(p.capacity||p.power)&&(<div className="text-[11.5px] text-muted flex flex-wrap gap-2.5 mt-1">{p.capacity&&(<span><strong className="text-ink font-semibold">Cap</strong> {p.capacity}</span>)}{p.power&&(<span><strong className="text-ink font-semibold">Power</strong> {p.power}</span>)}</div>)}<div className="flex flex-wrap md:flex-nowrap items-baseline gap-x-2 gap-y-1 md:gap-2 md:gap-y-0 mt-auto pt-2"><span className="font-head text-lg font-bold text-ink">{inr(p.price)}</span>{p.mrp&&p.mrp>p.price&&(<span className="text-[13px] text-muted line-through">{inr(p.mrp)}</span>)}{save>0&&(<span className="text-[11px] font-bold text-success tracking-wide">SAVE {save}%</span>)}</div></div><div className="kk-card-actions flex gap-2 px-4 pb-4"><button type="button" className="btn-small btn-small-outline !py-2" onClick={()=>gated(()=>addToCart(p))}>Add to Cart</button><button type="button" className="btn-small btn-small-primary !py-2" onClick={()=>gated(()=>{addToCart(p);openDrawer();})}>Buy Now</button></div></div>);}
