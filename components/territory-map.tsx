"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { Crosshair, MapPin, AlertCircle, Navigation } from "lucide-react";
import type { Competitor, Market } from "@/lib/model";
import { scoreCompetitor } from "@/lib/analysis";
type LatLng={lat:number;lng:number};
interface MapInstance { fitBounds(bounds:unknown,padding?:number):void;setCenter(p:LatLng):void;setZoom(n:number):void;panTo(p:LatLng):void }
interface MarkerInstance extends HTMLElement { map:MapInstance|null;addListener(name:string,handler:()=>void):{remove():void} }
interface MapsAPI {Map:new(el:HTMLElement,options:object)=>MapInstance;LatLngBounds:new()=>{extend(p:LatLng):void};marker:{AdvancedMarkerElement:new(options:object)=>MarkerInstance};event:{clearInstanceListeners(instance:unknown):void};importLibrary(name:string):Promise<unknown>}
declare global {interface Window {google?:{maps:MapsAPI};__lieMapsReady?:()=>void;gm_authFailure?:()=>void}}
let loader:Promise<MapsAPI>|undefined;
function loadMaps(key:string) {
  loader ??= new Promise<MapsAPI>((resolve,reject)=>{
    if(window.google?.maps?.Map){resolve(window.google.maps);return;}
    const script=document.createElement("script");
    const timer=setTimeout(()=>reject(Error("Google Maps took too long to load.")),20000);
    window.__lieMapsReady=()=>{clearTimeout(timer);if(window.google?.maps)resolve(window.google.maps);else reject(Error("Google Maps is unavailable."));};
    window.gm_authFailure=()=>{clearTimeout(timer);reject(Error("Google rejected the browser map key. Check its API and website restrictions."));};
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=marker&callback=__lieMapsReady&v=weekly`;
    script.async=true;script.onerror=()=>{clearTimeout(timer);reject(Error("Google Maps couldn't load. Check your connection."));};document.head.appendChild(script);
  });
  return loader;
}
interface Props {market:Market;rows:Competitor[];selected:Set<string>;focused:string|null;onFocus:(id:string)=>void;onToggle:(id:string)=>void;mapsKey:string;mapId:string;selectedOnly:boolean}
export function TerritoryMap({market,rows,selected,focused,onFocus,onToggle,mapsKey,mapId,selectedOnly}:Props) {
  const element=useRef<HTMLDivElement>(null),mapRef=useRef<MapInstance|null>(null),apiRef=useRef<MapsAPI|null>(null);
  const [ready,setReady]=useState(false),[error,setError]=useState(""),[fit,setFit]=useState(0);
  const visible=useMemo(()=>rows.filter(p=>(!selectedOnly||selected.has(p.placeId))&&p.latitude!=null&&p.longitude!=null),[rows,selected,selectedOnly]);
  const current=visible.find(p=>p.placeId===focused);
  const onFocusRef=useRef(onFocus);onFocusRef.current=onFocus;
  useEffect(()=>{
    if(market.source==="sample"||!mapsKey||!element.current)return;
    let canceled=false;
    loadMaps(mapsKey).then(api=>{if(canceled||!element.current)return;apiRef.current=api;mapRef.current=new api.Map(element.current,{center:{lat:market.center.latitude,lng:market.center.longitude},zoom:14,mapId,disableDefaultUI:true,zoomControl:true,gestureHandling:"cooperative",clickableIcons:false});setReady(true);}).catch(e=>{if(!canceled)setError(e.message);});
    return()=>{canceled=true;setReady(false);mapRef.current=null;};
  },[market.source,market.center.latitude,market.center.longitude,mapsKey,mapId]);
  useEffect(()=>{
    const map=mapRef.current,api=apiRef.current;if(!map||!api||!ready)return;
    const markers=visible.map((p,i)=>{
      const marker=new api.marker.AdvancedMarkerElement({map,position:{lat:p.latitude,lng:p.longitude},title:p.name,zIndex:p.placeId===focused?100:selected.has(p.placeId)?50:1});
      const pin=document.createElement("div");pin.className=`map-pin ${selected.has(p.placeId)?"is-selected":""} ${focused===p.placeId?"is-focused":""}`;pin.textContent=String(i+1);marker.appendChild(pin);
      marker.addListener("click",()=>onFocusRef.current(p.placeId));return marker;
    });
    return()=>markers.forEach(m=>{api.event.clearInstanceListeners(m);m.map=null;});
  },[visible,selected,focused,ready]);
  useEffect(()=>{const map=mapRef.current,api=apiRef.current;if(!map||!api||!ready)return;if(visible.length){const bounds=new api.LatLngBounds();visible.forEach(p=>bounds.extend({lat:p.latitude!,lng:p.longitude!}));map.fitBounds(bounds,65);if(visible.length===1)map.setZoom(16);}else{map.setCenter({lat:market.center.latitude,lng:market.center.longitude});map.setZoom(13);}},[visible,fit,ready,market.center]);
  useEffect(()=>{if(current&&mapRef.current)mapRef.current.panTo({lat:current.latitude!,lng:current.longitude!});},[current]);
  const span=Math.max(.008,...visible.map(p=>Math.abs(p.latitude!-market.center.latitude)*1.4),...visible.map(p=>Math.abs(p.longitude!-market.center.longitude)*1.4));
  return <section className="territory-card"><div className="territory-header"><div><MapPin size={17}/><h3>Your territory</h3></div><button className="icon-button" title="Fit visible competitors" aria-label="Fit visible competitors" onClick={()=>setFit(x=>x+1)}><Crosshair size={17}/></button></div>
    <div className="territory-canvas">
      {market.source==="sample" ? <div className="sample-map" key={fit}><svg viewBox="0 0 600 440" role="img" aria-label="Schematic territory showing fictional sample competitors"><defs><pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="#dfe5d5" strokeWidth=".7"/></pattern></defs><rect width="600" height="440" fill="#eef1e7"/><rect width="600" height="440" fill="url(#grid)"/><circle cx="300" cy="220" r="170" fill="#e6ecdb" fillOpacity=".4" stroke="#bac9a8" strokeDasharray="5 7"/><circle cx="300" cy="220" r="94" fill="#dce7cd" fillOpacity=".45" stroke="#b2c69b" strokeDasharray="4 5"/><line x1="35" y1="220" x2="565" y2="220" stroke="#cad5bf"/><line x1="300" y1="30" x2="300" y2="410" stroke="#cad5bf"/><circle cx="300" cy="220" r="7" fill="#799866" stroke="#fff" strokeWidth="3"/><text x="312" y="227" fill="#718263" fontSize="12">Territory center</text></svg><span className="north"><Navigation size={15}/> N</span>{visible.map((p,i)=><button key={p.placeId} aria-label={`Show ${p.name}`} title={p.name} onClick={()=>onFocus(p.placeId)} className={`sample-pin map-pin ${selected.has(p.placeId)?"is-selected":""} ${focused===p.placeId?"is-focused":""}`} style={{left:`${50+(p.longitude!-market.center.longitude)/span*42}%`,top:`${50-(p.latitude!-market.center.latitude)/span*40}%`}}>{i+1}</button>)}<span className="schematic-label">SCHEMATIC · FICTIONAL LOCATIONS</span></div> : <><div className="google-map" ref={element}/>{(!mapsKey||error)&&<div className="map-setup"><AlertCircle size={25}/><strong>{error?"Map unavailable":"Connect the territory map"}</strong><p>{error||"Add a separate, referrer-restricted Google Maps browser key to enable the live map."}</p><small>Competitor data and all filters remain available.</small></div>}</>}
      {!visible.length&&<div className="map-empty">No visible competitors with coordinates.</div>}
      {current&&<div className="map-detail"><div><strong>{current.name}</strong><span>{current.distance?.toFixed(1)} km · {scoreCompetitor(current).strength}</span></div><button className="secondary-button" onClick={()=>onToggle(current.placeId)}>{selected.has(current.placeId)?"Deselect":"Select"}</button></div>}
    </div><div className="map-legend"><span><i/> Competitor</span><span><i className="selected-dot"/> Selected</span><span className="map-count">{visible.length} visible</span></div>
  </section>;
}
