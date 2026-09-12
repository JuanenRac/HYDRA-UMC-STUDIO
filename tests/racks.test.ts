// =============================================================================
// HYDRA-UMC-STUDIO - Rack STL and geometry regression tests
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {rackGeometry,rackParts,validRackDimension} from '../src/racks';
it('resolves legacy dimensions and rejects malformed sizes and colors',()=>{
  expect(rackGeometry({type:'Output'})).toEqual({width:160,depth:160,capacity:24,color:'#10b981'});
  for(const v of [NaN,Infinity,39,1001,1.5,'160',true,null]) expect(validRackDimension(v)).toBe(false);
  expect(rackGeometry({color:'red',capacity:Infinity}).capacity).toBe(24);
  expect(rackGeometry({color:'red'}).color).toBe('#0ea5e9');
});
it('assembles real STL guides without stretching slot pitch',()=>{
  for(const n of [1,6,24]) for(const width of [40,161,1000]){
    const rack={width,depth:201,capacity:n,color:'#abcd12',usableSlots:[false,true]};
    const saved=JSON.stringify(rack);
    const parts=rackParts(rack);
    expect(parts).toHaveLength(3+2*n);
    expect(parts[0].size).toEqual([width+20,20,221]);
    expect(parts.filter(p=>p.part==='wall')[0].size).toEqual([10,n*10+40,201]);
    const guides=parts.filter(p=>p.part==='guide');
    expect(guides).toHaveLength(n*2);
    expect(guides.slice(0,n).map(g=>g.position[1])).toEqual(Array.from({length:n},(_,i)=>37.5+i*10));
    expect(JSON.stringify(rack)).toBe(saved);
  }
});
it('ships nonempty finite binary STL components with documented reference dimensions',()=>{
  const reference={base:[180,180,20],wall:[10,160,10],guide:[4,160,3]};
  for(const [name,size] of Object.entries(reference)){
    const b=readFileSync(new URL('../public/models/racks/'+name+'.stl',import.meta.url));
    const n=b.readUInt32LE(80);
    expect(n).toBeGreaterThan(10); expect(b.length).toBe(84+n*50);
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<n;i++) for(let j=0;j<3;j++) for(let a=0;a<3;a++){
      const v=b.readFloatLE(84+i*50+12+j*12+a*4);
      expect(Number.isFinite(v)).toBe(true); lo[a]=Math.min(lo[a],v);hi[a]=Math.max(hi[a],v);
    }
    expect(lo).toEqual([0,0,0]); expect(hi).toEqual(size);
  }
});
it('has the rack UI text in all seven languages',()=>{
  for(const lang of ['en','es','fr','it','de','zh','ja']){
    const data=JSON.parse(readFileSync(new URL('../src/locales/'+lang+'.json',import.meta.url),'utf8'));
    for(const k of ['rack_width','rack_depth','rack_color','rack_geometry_note','rack_mesh_error','rack_preview'])
      expect(data.modules[k]?.length).toBeGreaterThan(3);
  }
});
