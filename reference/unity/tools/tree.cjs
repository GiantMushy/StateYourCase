// node tree.js dump.json [subpath] [--full]
const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const sub=process.argv[3]||'';const full=process.argv.includes('--full');
function find(n,parts){if(!parts.length)return n;const c=(n.children||[]).find(x=>x.name===parts[0]);return c?find(c,parts.slice(1)):null;}
const root=sub?find(d,sub.split('/')):d;
const r=n=>n?n.map(v=>Math.round(v)).join(','):'';
function comp(c){const t=c.t;const o={...c};delete o.t;
 if(t==='Image')return `Img(${c.sprite||'-'} ${c.color}${c.type!=='Simple'?' '+c.type:''}${c.preserve?' keep':''}${c.border&&c.type==='Sliced'?' b'+c.border.join('/')+' ppu'+c.ppu+'/'+c.spritePPU:''}${c.disabled?' OFF':''})`;
 if(t.startsWith('TextMeshPro'))return `TMP(${JSON.stringify(c.text).slice(0,80)} ${c.font} ${c.size}${c.auto?' auto'+c.auto:''} ${c.color} ${c.align} ${c.style}${c.outline?' outl'+JSON.stringify(c.outline):''}${c.underlay?' ul'+JSON.stringify(c.underlay):''}${c.cs?' cs'+c.cs:''}${c.ls?' ls'+c.ls:''}${c.margin?' m'+c.margin:''}${c.disabled?' OFF':''})`;
 if(t==='LocalizeStringEvent')return `L10n(${c.key})`;
 return t+(Object.keys(o).length?JSON.stringify(o):'');}
function walk(n,dep){const inact=n.active?'':' [INACTIVE]';
 console.log('  '.repeat(dep)+`${n.name}${inact} rect(${r(n.rect)}) a${JSON.stringify(n.aMin)}-${JSON.stringify(n.aMax)} pv${JSON.stringify(n.pivot)} pos${JSON.stringify(n.pos)} sz${JSON.stringify(n.size)}${n.scale?' sc'+JSON.stringify(n.scale):''}${n.rotZ?' rot'+n.rotZ:''}`);
 for(const c of n.c)console.log('  '.repeat(dep)+'  · '+comp(c));
 for(const ch of n.children||[])walk(ch,dep+1);}
walk(root,0);
