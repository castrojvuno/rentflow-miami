import { useState, useEffect, useRef, useCallback } from "react";

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
function usePersist(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem("rf3_" + key); return s ? JSON.parse(s) : (typeof init === "function" ? init() : init); }
    catch { return typeof init === "function" ? init() : init; }
  });
  const set = useCallback(v => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem("rf3_" + key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [val, set];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const METHODS = ["Cash","Zelle","Cash App","Venmo","Money Order","Bank Transfer","Tarjeta","Cheque"];
const BUILDINGS = ["Edificio A","Edificio B","Edificio C"];
const BED_TYPES = ["Cama A","Cama B","Cama C","Cama D","Master","Privado","Baño Privado"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const EXPENSE_TYPES = ["Electricidad","Agua","Internet","Reparaciones","Extras","Compra de Muebles","Pintura","Cambio de Equipo","Gasolina Van","Money Order Fee","Comisión Ventas","Nómina","Otros"];
const INVENTORY_CATS = ["Camas","Colchones","Sábanas","Almohadas","Utensilios de Cocina","TVs","Cortinas de Baño","Ollas","Vajilla","Microondas","Refrigerador","Aire Acondicionado","Otros"];
const LATE_FEE_DAILY = 15;

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#080d18",surf:"#0f1623",card:"#161f30",border:"#1e2d42",
  accent:"#00c8f5",gold:"#f59e0b",green:"#10b981",red:"#ef4444",
  orange:"#f97316",purple:"#a78bfa",pink:"#f472b6",teal:"#14b8a6",
  text:"#e2e8f0",muted:"#5a7090",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${T.bg};color:${T.text};font-family:'DM Sans',sans-serif;font-size:14px}
::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
input,select,textarea{background:${T.bg};border:1px solid ${T.border};color:${T.text};border-radius:8px;padding:8px 12px;font-family:'DM Sans',sans-serif;font-size:13px;width:100%;outline:none;transition:border .15s}
input:focus,select:focus,textarea:focus{border-color:${T.accent}}
textarea{resize:vertical;min-height:66px}
select option{background:${T.card}}
button{cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:9px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:${T.muted};border-bottom:1px solid ${T.border};white-space:nowrap}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid ${T.border}20;vertical-align:middle}
tr:hover td{background:${T.border}15}
.mono{font-family:'JetBrains Mono',monospace}
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.bg{background:${T.green}20;color:${T.green}}.br{background:${T.red}20;color:${T.red}}
.bo{background:${T.orange}20;color:${T.orange}}.bb{background:${T.accent}20;color:${T.accent}}
.bgold{background:${T.gold}20;color:${T.gold}}.bpurple{background:${T.purple}20;color:${T.purple}}
.bpink{background:${T.pink}20;color:${T.pink}}.bteal{background:${T.teal}20;color:${T.teal}}
.bmuted{background:${T.border};color:${T.muted}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.anim{animation:fadeIn .18s ease}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = n => "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0});
const today = () => new Date().toISOString().split("T")[0];
const daysBetween = (a,b) => Math.floor((new Date(b)-new Date(a))/86400000);
const toBase64 = file => new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED = {
  tenants:[
    {id:1,name:"Carlos Mendez",phone:"305-555-0101",email:"carlos@email.com",idPhotos:[],roomPhotos:[],contract:"",emergencyContact:"Rosa 305-555-9901",building:"Edificio A",apt:"101",bed:"Cama A",rent:850,deposit:850,depositPaid:850,balance:0,checkIn:"2024-01-15",checkOut:"",status:"Activo",referredBy:"",parking:false,parkingAmt:0,transferHistory:[]},
    {id:2,name:"Maria Lopez",phone:"305-555-0202",email:"maria@email.com",idPhotos:[],roomPhotos:[],contract:"",emergencyContact:"Pedro 305-555-9902",building:"Edificio A",apt:"101",bed:"Cama B",rent:900,deposit:900,depositPaid:450,balance:450,checkIn:"2024-02-01",checkOut:"",status:"Moroso",referredBy:"Carlos Mendez",parking:false,parkingAmt:0,transferHistory:[]},
    {id:3,name:"Juan Rivera",phone:"305-555-0303",email:"juan@email.com",idPhotos:[],roomPhotos:[],contract:"",emergencyContact:"Luisa 305-555-9903",building:"Edificio B",apt:"205",bed:"Master",rent:1200,deposit:1200,depositPaid:1200,balance:0,checkIn:"2024-01-01",checkOut:"",status:"Activo",referredBy:"",parking:true,parkingAmt:50,transferHistory:[]},
    {id:4,name:"Ana Torres",phone:"305-555-0404",email:"ana@email.com",idPhotos:[],roomPhotos:[],contract:"",emergencyContact:"",building:"Edificio B",apt:"205",bed:"Privado",rent:950,deposit:950,depositPaid:0,balance:1900,checkIn:"2024-03-10",checkOut:"2024-07-10",status:"Moroso",referredBy:"Juan Rivera",parking:false,parkingAmt:0,transferHistory:[]},
  ],
  payments:[
    {id:1,date:"2024-06-01",tenantId:1,apt:"101",building:"Edificio A",rent:850,cleaning:80,parking:0,lateFee:0,method:"Zelle",total:930},
    {id:2,date:"2024-06-03",tenantId:3,apt:"205",building:"Edificio B",rent:1200,cleaning:80,parking:50,lateFee:0,method:"Cash App",total:1330},
    {id:3,date:"2024-06-05",tenantId:2,apt:"101",building:"Edificio A",rent:500,cleaning:0,parking:0,lateFee:0,method:"Cash",total:500},
    {id:4,date:"2024-05-01",tenantId:1,apt:"101",building:"Edificio A",rent:850,cleaning:80,parking:0,lateFee:0,method:"Zelle",total:930},
  ],
  expenses:[
    {id:1,date:"2024-06-02",type:"Electricidad",category:"Fijo",building:"Edificio A",apt:"101",supplier:"FPL",method:"Bank Transfer",amount:220,description:"Electricidad junio",isPending:false,dueDate:""},
    {id:2,date:"2024-06-03",type:"Internet",category:"Fijo",building:"Edificio B",apt:"205",supplier:"AT&T",method:"Bank Transfer",amount:85,description:"Internet junio",isPending:false,dueDate:""},
    {id:3,date:"2024-06-04",type:"Comisión Ventas",category:"Variable",building:"Edificio A",apt:"",supplier:"Vendedor",method:"Cash",amount:150,description:"Comisión inquilino",isPending:false,dueDate:""},
    {id:4,date:"2024-06-10",type:"Agua",category:"Fijo",building:"Edificio B",apt:"205",supplier:"Miami-Dade Water",method:"Pendiente",amount:120,description:"Agua junio",isPending:true,dueDate:"2024-06-20"},
    {id:5,date:"2024-05-05",type:"Electricidad",category:"Fijo",building:"Edificio A",apt:"101",supplier:"FPL",method:"Bank Transfer",amount:210,description:"Electricidad mayo",isPending:false,dueDate:""},
    {id:6,date:"2024-04-05",type:"Electricidad",category:"Fijo",building:"Edificio A",apt:"101",supplier:"FPL",method:"Bank Transfer",amount:195,description:"Electricidad abril",isPending:false,dueDate:""},
  ],
  properties:[
    {id:1,building:"Edificio A",apt:"101",type:"Compartido",bedrooms:2,beds:4,expectedRent:3500,parking:false,parkingTenant:"",parkingAmt:0,parkingSticker:"",parkingRemote:"",hallwayNotes:"",lastRepair:"2024-01-10",lastPaint:"2023-12-01",carpetCleaning:"2024-02-15",curtainReplacement:"2024-01-10",extras:"",photos:[]},
    {id:2,building:"Edificio B",apt:"205",type:"Mixto",bedrooms:2,beds:3,expectedRent:3400,parking:true,parkingTenant:"Juan Rivera",parkingAmt:50,parkingSticker:"EBP-102",parkingRemote:"R-44",hallwayNotes:"1 colchón temporal",lastRepair:"2024-03-01",lastPaint:"2024-01-15",carpetCleaning:"2024-03-10",curtainReplacement:"2024-02-01",extras:"Espejo nuevo",photos:[]},
    {id:3,building:"Edificio A",apt:"102",type:"Privado",bedrooms:1,beds:1,expectedRent:1100,parking:false,parkingTenant:"",parkingAmt:0,parkingSticker:"",parkingRemote:"",hallwayNotes:"",lastRepair:"2024-02-20",lastPaint:"2024-02-20",carpetCleaning:"2024-02-20",curtainReplacement:"2024-02-20",extras:"",photos:[]},
  ],
  pettyCash:[
    {id:1,date:"2024-06-01",type:"Ingreso",concept:"Aporte capital",amount:500},
    {id:2,date:"2024-06-02",type:"Egreso",concept:"Gasolina van",amount:60},
    {id:3,date:"2024-06-04",type:"Egreso",concept:"Money Order fee",amount:15},
  ],
  maintenance:[
    {id:1,apt:"205",building:"Edificio B",description:"Falla compresor A/C",status:"En Proceso",technician:"HVAC Miami",scheduledDate:"2024-06-15",materialCost:250,laborCost:180,notes:""},
    {id:2,apt:"101",building:"Edificio A",description:"Gotera baño compartido",status:"Pendiente",technician:"",scheduledDate:"",materialCost:0,laborCost:0,notes:""},
  ],
  inventory:[
    {id:1,category:"Camas",item:"Cama Individual",qty:8,location:"Almacén Central",condition:"Nuevo",apt:"",photos:[]},
    {id:2,category:"Colchones",item:"Colchón Doble",qty:6,location:"Almacén Central",condition:"Bueno",apt:"",photos:[]},
    {id:3,category:"Sábanas",item:"Juego de Sábanas",qty:14,location:"Almacén Central",condition:"Nuevo",apt:"",photos:[]},
    {id:4,category:"TVs",item:"TV 43\"",qty:2,location:"Asignado",condition:"Bueno",apt:"101",photos:[]},
    {id:5,category:"Utensilios de Cocina",item:"Olla Set",qty:3,location:"Edificio A - 101",condition:"Bueno",apt:"101",photos:[]},
    {id:6,category:"Aire Acondicionado",item:"A/C 12000 BTU",qty:2,location:"Asignado",condition:"Bueno",apt:"205",photos:[]},
  ],
  cleaningSchedule:[
    {id:1,apt:"101",building:"Edificio A",cleaner:"Ana",date:"2024-06-10",time:"09:00",status:"Completado",notes:"Sin novedades",type:"Rutina"},
    {id:2,apt:"205",building:"Edificio B",cleaner:"Ana",date:"2024-06-12",time:"10:00",status:"Pendiente",notes:"",type:"Rutina"},
    {id:3,apt:"102",building:"Edificio A",cleaner:"Ana",date:"2024-06-14",time:"09:00",status:"Pendiente",notes:"",type:"Profunda"},
  ],
  cleaningFees:[
    {id:1,tenantId:1,tenantName:"Carlos Mendez",apt:"101",building:"Edificio A",month:"2024-06",amount:80,paid:true,date:"2024-06-01"},
    {id:2,tenantId:2,tenantName:"Maria Lopez",apt:"101",building:"Edificio A",month:"2024-06",amount:80,paid:false,date:""},
    {id:3,tenantId:3,tenantName:"Juan Rivera",apt:"205",building:"Edificio B",month:"2024-06",amount:80,paid:true,date:"2024-06-03"},
  ],
  promises:[
    {id:1,tenantId:2,tenantName:"Maria Lopez",amount:450,promiseDate:"2024-06-18",status:"Pendiente",notes:""},
    {id:2,tenantId:4,tenantName:"Ana Torres",amount:950,promiseDate:"2024-06-15",status:"Vencida",notes:""},
  ],
  availability:[
    {id:1,building:"Edificio A",apt:"101",bed:"Cama A",type:"Compartido",gender:"Mixto",price:850,status:"Ocupado",releaseDate:"",reservation:0},
    {id:2,building:"Edificio A",apt:"101",bed:"Cama B",type:"Compartido",gender:"Mixto",price:900,status:"Ocupado",releaseDate:"",reservation:0},
    {id:3,building:"Edificio A",apt:"101",bed:"Cama C",type:"Compartido",gender:"Hombres",price:800,status:"Disponible",releaseDate:"",reservation:0},
    {id:4,building:"Edificio B",apt:"205",bed:"Master",type:"Master",gender:"Mixto",price:1200,status:"Ocupado",releaseDate:"",reservation:0},
    {id:5,building:"Edificio B",apt:"205",bed:"Privado",type:"Privado",gender:"Mujeres",price:950,status:"Próxima Salida",releaseDate:"2024-07-10",reservation:0},
    {id:6,building:"Edificio A",apt:"102",bed:"Privado",type:"Privado",gender:"Mixto",price:1100,status:"Disponible",releaseDate:"",reservation:0},
  ],
  tasks:[
    {id:1,title:"Llamar a Maria Lopez sobre saldo",description:"Recordar pago pendiente de $450",date:"2024-06-15",priority:"Alta",status:"Pendiente",origin:"WhatsApp",apt:"101",building:"Edificio A"},
    {id:2,title:"Revisar A/C Apt 205",description:"Seguimiento reparación compresor",date:"2024-06-16",priority:"Alta",status:"Pendiente",origin:"App",apt:"205",building:"Edificio B"},
    {id:3,title:"Comprar sábanas almacén",description:"Reponer 6 juegos",date:"2024-06-18",priority:"Media",status:"Completado",origin:"App",apt:"",building:""},
  ],
  deposits:[],
};

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Btn({children,onClick,v="primary",size="md",style:s={},disabled=false}){
  const sz={sm:{padding:"4px 11px",fontSize:12},md:{padding:"7px 15px",fontSize:13},lg:{padding:"10px 22px",fontSize:14}};
  const vs={primary:{background:T.accent,color:T.bg,border:"none"},ghost:{background:"transparent",color:T.accent,border:`1px solid ${T.accent}40`},danger:{background:T.red+"20",color:T.red,border:`1px solid ${T.red}40`},success:{background:T.green+"20",color:T.green,border:`1px solid ${T.green}40`},gold:{background:T.gold+"20",color:T.gold,border:`1px solid ${T.gold}40`},purple:{background:T.purple+"20",color:T.purple,border:`1px solid ${T.purple}40`},muted:{background:T.border,color:T.muted,border:"none"},orange:{background:T.orange+"20",color:T.orange,border:`1px solid ${T.orange}40`},teal:{background:T.teal+"20",color:T.teal,border:`1px solid ${T.teal}40`}};
  return <button onClick={onClick} disabled={disabled} style={{borderRadius:8,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5,letterSpacing:".01em",opacity:disabled?.5:1,...sz[size],...vs[v],...s}}>{children}</button>;
}
function Card({children,style:s={},onClick}){
  return <div onClick={onClick} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:18,cursor:onClick?"pointer":undefined,...s}}>{children}</div>;
}
function Modal({title,onClose,children,width=560}){
  return(
    <div style={{position:"fixed",inset:0,background:"#000b",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="anim" style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:16,width,maxWidth:"100%",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
          <span style={{fontWeight:700,fontSize:15}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:20,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}
function Field({label,children,col=1}){
  return(
    <div style={{gridColumn:`span ${col}`}}>
      <label style={{display:"block",fontSize:11,fontWeight:600,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</label>
      {children}
    </div>
  );
}
function StatCard({label,value,sub,color=T.accent,icon,onClick,trend}){
  return(
    <Card onClick={onClick} style={{display:"flex",flexDirection:"column",gap:6,position:"relative",overflow:"hidden",cursor:onClick?"pointer":"default",transition:"border .15s"}} >
      <div style={{fontSize:20,position:"absolute",top:14,right:14,opacity:.3}}>{icon}</div>
      <span style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:".07em",fontWeight:600}}>{label}</span>
      <span className="mono" style={{fontSize:24,fontWeight:700,color}}>{value}</span>
      {sub&&<span style={{fontSize:12,color:T.muted}}>{sub}</span>}
      {trend!==undefined&&trend!==null&&<span style={{fontSize:12,color:trend>=0?T.green:T.red}}>{trend>=0?"▲":"▼"} {Math.abs(trend)}% vs ant.</span>}
      {onClick&&<span style={{fontSize:10,color:T.accent,marginTop:2}}>Ver detalle →</span>}
    </Card>
  );
}
function Toast({msg,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:24,right:24,background:T.green,color:"#fff",borderRadius:10,padding:"12px 20px",fontWeight:600,fontSize:13,zIndex:9999,display:"flex",gap:10,alignItems:"center"}}>✓ {msg}<button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:16}}>✕</button></div>;
}
function SectionHeader({title,action}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <h2 style={{fontSize:19,fontWeight:700}}>{title}</h2>
      {action}
    </div>
  );
}
function MonthPicker({value,onChange}){
  const [y,m]=value.split("-").map(Number);
  const prev=()=>{const d=new Date(y,m-2);onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);};
  const next=()=>{const d=new Date(y,m);onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);};
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,background:T.card,borderRadius:10,padding:"6px 12px",border:`1px solid ${T.border}`}}>
      <button onClick={prev} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:16,padding:"0 4px"}}>‹</button>
      <span style={{fontWeight:600,fontSize:13,minWidth:110,textAlign:"center"}}>{MONTHS_ES[m-1]} {y}</span>
      <button onClick={next} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:16,padding:"0 4px"}}>›</button>
    </div>
  );
}

// ─── FILTER BAR (Building / Apt) ──────────────────────────────────────────────
function FilterBar({buildings,apts,value,onChange,showAll=true}){
  return(
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:12,color:T.muted,fontWeight:600}}>Filtrar:</span>
      {showAll&&<button onClick={()=>onChange({building:"",apt:""})} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${value.building===""?T.accent:T.border}`,background:value.building===""?T.accent+"20":T.card,color:value.building===""?T.accent:T.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>Todos</button>}
      {buildings.map(b=>(
        <button key={b} onClick={()=>onChange({building:b,apt:""})} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${value.building===b&&!value.apt?T.accent:T.border}`,background:value.building===b&&!value.apt?T.accent+"20":T.card,color:value.building===b&&!value.apt?T.accent:T.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{b}</button>
      ))}
      {apts.map(a=>(
        <button key={a} onClick={()=>onChange(prev=>({...prev,apt:prev.apt===a?"":a}))} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${value.apt===a?T.gold:T.border}`,background:value.apt===a?T.gold+"20":T.card,color:value.apt===a?T.gold:T.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>Apt {a}</button>
      ))}
    </div>
  );
}

// ─── PHOTO UPLOAD WIDGET ──────────────────────────────────────────────────────
function PhotoUpload({photos=[],onChange,label="Agregar fotos",maxSize=300}){
  const ref=useRef();
  const handleFiles=async(files)=>{
    const newPhotos=[];
    for(const f of Array.from(files)){
      if(!f.type.startsWith("image/"))continue;
      const b64=await toBase64(f);
      newPhotos.push({id:Date.now()+Math.random(),src:b64,name:f.name,date:today()});
    }
    onChange([...photos,...newPhotos]);
  };
  return(
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
        {photos.map(p=>(
          <div key={p.id} style={{position:"relative",width:maxSize===300?90:70,height:maxSize===300?90:70}}>
            <img src={p.src} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8,border:`1px solid ${T.border}`}}/>
            <button onClick={()=>onChange(photos.filter(x=>x.id!==p.id))} style={{position:"absolute",top:2,right:2,background:T.red,border:"none",borderRadius:"50%",width:18,height:18,color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
          </div>
        ))}
        <button onClick={()=>ref.current?.click()} style={{width:maxSize===300?90:70,height:maxSize===300?90:70,border:`2px dashed ${T.border}`,borderRadius:8,background:"transparent",color:T.muted,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
      <p style={{fontSize:11,color:T.muted}}>{label}</p>
    </div>
  );
}

// ─── PHOTO GALLERY MODAL ──────────────────────────────────────────────────────
function PhotoGallery({photos,title,onClose}){
  const [idx,setIdx]=useState(0);
  if(!photos||photos.length===0)return null;
  return(
    <Modal title={title} onClose={onClose} width={700}>
      <div style={{textAlign:"center"}}>
        <img src={photos[idx]?.src} alt="" style={{maxWidth:"100%",maxHeight:400,borderRadius:10,objectFit:"contain"}}/>
        <p style={{color:T.muted,fontSize:12,marginTop:8}}>{photos[idx]?.name} · {photos[idx]?.date}</p>
      </div>
      {photos.length>1&&(
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:14}}>
          {photos.map((p,i)=>(
            <img key={p.id} src={p.src} alt="" onClick={()=>setIdx(i)} style={{width:60,height:60,objectFit:"cover",borderRadius:6,cursor:"pointer",border:`2px solid ${i===idx?T.accent:T.border}`,opacity:i===idx?1:.6}}/>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({tenants,payments,expenses,pettyCash,maintenance,cleaningSchedule,promises,month,onNavigate,properties}){
  const [aptFilter,setAptFilter]=useState("");
  const [my,mm]=month.split("-").map(Number);
  const allApts=[...new Set(properties.map(p=>p.apt))];
  const allBuildings=[...new Set(properties.map(p=>p.building))];

  const tFiltered=aptFilter?tenants.filter(t=>t.apt===aptFilter):tenants;
  const pFiltered=aptFilter?payments.filter(p=>tFiltered.some(t=>t.id===p.tenantId)):payments;
  const eFiltered=aptFilter?expenses.filter(e=>e.apt===aptFilter&&!e.isPending):expenses.filter(e=>!e.isPending);

  const mPay=pFiltered.filter(p=>{const d=new Date(p.date);return d.getFullYear()===my&&d.getMonth()+1===mm;});
  const mExp=eFiltered.filter(e=>{const d=new Date(e.date);return d.getFullYear()===my&&d.getMonth()+1===mm;});

  const active=tFiltered.filter(t=>t.status!=="Inactivo");
  const totalExp=active.reduce((s,t)=>s+t.rent,0);
  const totalColl=mPay.reduce((s,p)=>s+p.total,0);
  const totalExpM=mExp.reduce((s,e)=>s+e.amount,0);
  const net=totalColl-totalExpM;
  const cash=pettyCash.reduce((s,p)=>p.type==="Ingreso"?s+p.amount:s-p.amount,0);
  const depRec=tFiltered.reduce((s,t)=>s+t.depositPaid,0);
  const depPend=tFiltered.reduce((s,t)=>s+(t.deposit-t.depositPaid),0);
  const morosos=tFiltered.filter(t=>t.balance>0);
  const pendExp=expenses.filter(e=>e.isPending).reduce((s,e)=>s+e.amount,0);
  const expiredProm=promises.filter(p=>p.status==="Vencida");
  const missingDocs=tFiltered.filter(t=>!t.idPhotos?.length||!t.contract||!t.emergencyContact);
  const upcomingOut=tFiltered.filter(t=>t.checkOut&&new Date(t.checkOut)>new Date());

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}} className="anim">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,background:`linear-gradient(135deg,${T.accent},${T.gold})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RentFlow Miami</h1>
          <p style={{color:T.muted,fontSize:12,marginTop:3}}>RoomControl Pro · Panel de Control</p>
        </div>
      </div>

      {/* Apt filter */}
      <Card style={{padding:"12px 16px"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:12,color:T.muted,fontWeight:600}}>Vista:</span>
          <button onClick={()=>setAptFilter("")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${!aptFilter?T.accent:T.border}`,background:!aptFilter?T.accent+"20":T.card,color:!aptFilter?T.accent:T.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>Global</button>
          {allApts.map(a=>(
            <button key={a} onClick={()=>setAptFilter(prev=>prev===a?"":a)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${aptFilter===a?T.gold:T.border}`,background:aptFilter===a?T.gold+"20":T.card,color:aptFilter===a?T.gold:T.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>Apt {a}</button>
          ))}
        </div>
        {aptFilter&&<p style={{fontSize:12,color:T.gold,marginTop:8}}>Mostrando datos del Apartamento {aptFilter}</p>}
      </Card>

      {/* Stats — clickable */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:13}}>
        <StatCard label="Renta Esperada" value={fmt(totalExp)} sub="Inquilinos activos" color={T.text} icon="📋"/>
        <StatCard label="Cobrado" value={fmt(totalColl)} sub={`${Math.round(totalColl/Math.max(totalExp,1)*100)}%`} color={T.green} icon="💰" onClick={()=>onNavigate("payments")}/>
        <StatCard label="Pendiente" value={fmt(totalExp-totalColl)} sub={`${morosos.length} morosos`} color={T.red} icon="⏳" onClick={()=>onNavigate("late")}/>
        <StatCard label="Gastos" value={fmt(totalExpM)} color={T.orange} icon="📤" onClick={()=>onNavigate("expenses")}/>
        <StatCard label="Balance Neto" value={fmt(net)} color={net>=0?T.green:T.red} icon="📊"/>
        <StatCard label="Caja Chica" value={fmt(cash)} color={T.gold} icon="💵" onClick={()=>onNavigate("pettycash")}/>
        <StatCard label="Depósitos" value={fmt(depRec)} sub={`${fmt(depPend)} pend.`} color={T.accent} icon="🔐" onClick={()=>onNavigate("deposits")}/>
        <StatCard label="Por Pagar" value={fmt(pendExp)} color={T.purple} icon="📬" onClick={()=>onNavigate("expenses")}/>
      </div>

      {/* Alerts */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <p style={{fontSize:13,fontWeight:700,marginBottom:12,color:T.red}}>🔴 Alertas Inquilinos</p>
          {morosos.length===0&&missingDocs.length===0?<p style={{color:T.green,fontSize:13}}>✓ Sin alertas</p>:null}
          {morosos.map(t=>(
            <div key={t.id} onClick={()=>onNavigate("late")} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,alignItems:"center",cursor:"pointer"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:T.muted}}>Apt {t.apt}</p></div>
              <span className="mono badge br">{fmt(t.balance)}</span>
            </div>
          ))}
          {expiredProm.map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,alignItems:"center"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>{p.tenantName}</p><p style={{fontSize:11,color:T.muted}}>Promesa vencida</p></div>
              <span className="badge br">VENCIDA</span>
            </div>
          ))}
          {missingDocs.slice(0,3).map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,alignItems:"center"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:T.muted}}>Docs faltantes</p></div>
              <span className="badge bo">DOCS</span>
            </div>
          ))}
          {upcomingOut.slice(0,2).map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",alignItems:"center"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:T.muted}}>Checkout: {t.checkOut}</p></div>
              <span className="badge bgold">SALIDA</span>
            </div>
          ))}
        </Card>
        <Card>
          <p style={{fontSize:13,fontWeight:700,marginBottom:12,color:T.orange}}>🟠 Alertas Infraestructura</p>
          {maintenance.filter(m=>m.status!=="Completado").length===0&&pendExp===0?<p style={{color:T.green,fontSize:13}}>✓ Sin alertas</p>:null}
          {maintenance.filter(m=>m.status==="Pendiente").map(m=>(
            <div key={m.id} onClick={()=>onNavigate("maintenance")} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,alignItems:"center",cursor:"pointer"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>Apt {m.apt}</p><p style={{fontSize:11,color:T.muted}}>{m.description.slice(0,40)}</p></div>
              <span className="badge br">URGENTE</span>
            </div>
          ))}
          {expenses.filter(e=>e.isPending).map(e=>(
            <div key={e.id} onClick={()=>onNavigate("expenses")} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",alignItems:"center",cursor:"pointer"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>{e.description}</p><p style={{fontSize:11,color:T.muted}}>Vence: {e.dueDate||"—"}</p></div>
              <span className="mono badge bo">{fmt(e.amount)}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Recent payments + cleaning */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <p style={{fontSize:13,fontWeight:700,marginBottom:12,color:T.gold}}>💳 Últimos Pagos</p>
          {mPay.slice(-5).reverse().map(p=>{const t=tenants.find(t=>t.id===p.tenantId);return(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,alignItems:"center"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>{t?.name||"N/A"}</p><p style={{fontSize:11,color:T.muted}}>{p.date}·{p.method}</p></div>
              <span className="mono badge bg">{fmt(p.total)}</span>
            </div>
          );})}
          {mPay.length===0&&<p style={{color:T.muted,fontSize:13}}>Sin pagos este mes</p>}
        </Card>
        <Card>
          <p style={{fontSize:13,fontWeight:700,marginBottom:12,color:T.purple}}>🧹 Limpieza Próxima</p>
          {cleaningSchedule.filter(c=>c.status==="Pendiente").slice(0,4).map(c=>(
            <div key={c.id} onClick={()=>onNavigate("cleaning")} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,alignItems:"center",cursor:"pointer"}}>
              <div><p style={{fontSize:12,fontWeight:600}}>{c.building} Apt {c.apt}</p><p style={{fontSize:11,color:T.muted}}>{c.date} {c.time} · {c.type}</p></div>
              <span className="badge bb">{c.cleaner}</span>
            </div>
          ))}
          {cleaningSchedule.filter(c=>c.status==="Pendiente").length===0&&<p style={{color:T.green,fontSize:13}}>✓ Sin pendientes</p>}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPENSES — with type, filters, history per apt
// ══════════════════════════════════════════════════════════════════════════════
function ExpensesModule({expenses,setExpenses}){
  const [modal,setModal]=useState(null);
  const [filter,setFilter]=useState({building:"",apt:"",type:"",tab:"all"});
  const [viewMode,setViewMode]=useState("table"); // table | summary
  const [rangeApt,setRangeApt]=useState("");
  const [rangeType,setRangeType]=useState("");
  const [rangeFrom,setRangeFrom]=useState("");
  const [rangeTo,setRangeTo]=useState("");
  const E={id:null,date:today(),type:"Electricidad",category:"Fijo",building:BUILDINGS[0],apt:"",supplier:"",method:METHODS[0],amount:"",description:"",isPending:false,dueDate:""};
  const [form,setForm]=useState(E);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const save=()=>{
    if(!form.description||!form.amount)return alert("Descripción y monto requeridos");
    if(form.id)setExpenses(p=>p.map(x=>x.id===form.id?{...form,amount:+form.amount}:x));
    else setExpenses(p=>[...p,{...form,id:Date.now(),amount:+form.amount}]);
    setModal(null);
  };

  const allApts=[...new Set(expenses.map(e=>e.apt).filter(Boolean))].sort();
  const allBuildings=[...new Set(expenses.map(e=>e.building).filter(Boolean))];

  const shown=expenses.filter(e=>{
    if(filter.tab==="pending"&&!e.isPending)return false;
    if(filter.tab==="paid"&&e.isPending)return false;
    if(filter.building&&e.building!==filter.building)return false;
    if(filter.apt&&e.apt!==filter.apt)return false;
    if(filter.type&&e.type!==filter.type)return false;
    return true;
  });

  // Summary by type
  const byType={};
  shown.filter(e=>!e.isPending).forEach(e=>{
    if(!byType[e.type])byType[e.type]={total:0,count:0,apts:{}};
    byType[e.type].total+=e.amount;
    byType[e.type].count++;
    if(e.apt){if(!byType[e.type].apts[e.apt])byType[e.type].apts[e.apt]=0;byType[e.type].apts[e.apt]+=e.amount;}
  });

  // Range query (apt + type + date range)
  const rangeResult=expenses.filter(e=>{
    if(rangeApt&&e.apt!==rangeApt)return false;
    if(rangeType&&e.type!==rangeType)return false;
    if(rangeFrom&&e.date<rangeFrom)return false;
    if(rangeTo&&e.date>rangeTo)return false;
    return!e.isPending;
  });
  const rangeTotal=rangeResult.reduce((s,e)=>s+e.amount,0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="📤 Gastos" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Registrar</Btn>}/>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:13}}>
        <StatCard label="Total Ejecutado" value={fmt(expenses.filter(e=>!e.isPending).reduce((s,e)=>s+e.amount,0))} color={T.orange} icon="📤"/>
        <StatCard label="Gastos Fijos" value={fmt(expenses.filter(e=>e.category==="Fijo"&&!e.isPending).reduce((s,e)=>s+e.amount,0))} color={T.red} icon="🏢"/>
        <StatCard label="Gastos Variables" value={fmt(expenses.filter(e=>e.category==="Variable").reduce((s,e)=>s+e.amount,0))} color={T.gold} icon="📈"/>
        <StatCard label="Por Pagar" value={fmt(expenses.filter(e=>e.isPending).reduce((s,e)=>s+e.amount,0))} color={T.purple} icon="📬"/>
      </div>

      {/* ── CONSULTA PERSONALIZADA ── */}
      <Card>
        <p style={{fontSize:13,fontWeight:700,marginBottom:12,color:T.teal}}>🔍 Consulta por Tipo / Apartamento / Período</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:12}}>
          <Field label="Tipo de Gasto"><select value={rangeType} onChange={e=>setRangeType(e.target.value)}><option value="">Todos</option>{EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
          <Field label="Apartamento"><select value={rangeApt} onChange={e=>setRangeApt(e.target.value)}><option value="">Todos</option>{allApts.map(a=><option key={a}>{a}</option>)}</select></Field>
          <Field label="Desde"><input type="date" value={rangeFrom} onChange={e=>setRangeFrom(e.target.value)}/></Field>
          <Field label="Hasta"><input type="date" value={rangeTo} onChange={e=>setRangeTo(e.target.value)}/></Field>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <span style={{fontSize:13,color:T.muted}}>{rangeResult.length} registros encontrados · </span>
            <span className="mono" style={{fontSize:16,fontWeight:700,color:T.orange}}>{fmt(rangeTotal)}</span>
            {rangeType&&<span style={{fontSize:12,color:T.muted,marginLeft:8}}>— {rangeType}{rangeApt?` · Apt ${rangeApt}`:""}</span>}
          </div>
          <Btn size="sm" v="muted" onClick={()=>{setRangeType("");setRangeApt("");setRangeFrom("");setRangeTo("");}}>Limpiar</Btn>
        </div>
        {rangeResult.length>0&&(rangeApt||rangeType)&&(
          <div style={{marginTop:12,maxHeight:160,overflowY:"auto"}}>
            <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Apt</th><th>Descripción</th><th>Monto</th></tr></thead>
            <tbody>{rangeResult.map(e=><tr key={e.id}><td style={{fontSize:12,color:T.muted}}>{e.date}</td><td><span className="badge bteal" style={{fontSize:10}}>{e.type}</span></td><td style={{fontSize:12}}>{e.apt||"—"}</td><td style={{fontSize:12}}>{e.description}</td><td className="mono" style={{color:T.orange}}>{fmt(e.amount)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── RESUMEN POR TIPO ── */}
      <Card>
        <p style={{fontSize:13,fontWeight:700,marginBottom:12,color:T.accent}}>📊 Resumen por Tipo de Gasto</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {Object.entries(byType).sort((a,b)=>b[1].total-a[1].total).map(([type,data])=>(
            <div key={type} style={{background:T.bg,borderRadius:10,padding:"10px 14px",cursor:"pointer"}} onClick={()=>setFilter(p=>({...p,type:p.type===type?"":type}))}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:600,color:filter.type===type?T.accent:T.text}}>{type}</span>
                <span className="mono" style={{fontSize:14,fontWeight:700,color:T.orange}}>{fmt(data.total)}</span>
              </div>
              <p style={{fontSize:11,color:T.muted}}>{data.count} registro(s)</p>
              {Object.entries(data.apts).map(([apt,amt])=>(
                <p key={apt} style={{fontSize:11,color:T.muted,marginTop:2}}>Apt {apt}: <span className="mono" style={{color:T.gold}}>{fmt(amt)}</span></p>
              ))}
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {[["all","Todos"],["paid","Pagados"],["pending","Por Pagar"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(p=>({...p,tab:k}))} style={{padding:"5px 12px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,background:filter.tab===k?T.accent:T.border,color:filter.tab===k?T.bg:T.muted,cursor:"pointer"}}>{l}</button>
        ))}
        <select value={filter.building} onChange={e=>setFilter(p=>({...p,building:e.target.value,apt:""}))} style={{width:"auto",padding:"5px 10px",fontSize:12}}>
          <option value="">Todos los edificios</option>{BUILDINGS.map(b=><option key={b}>{b}</option>)}
        </select>
        <select value={filter.apt} onChange={e=>setFilter(p=>({...p,apt:e.target.value}))} style={{width:"auto",padding:"5px 10px",fontSize:12}}>
          <option value="">Todos los apts</option>{allApts.map(a=><option key={a}>Apt {a}</option>)}
        </select>
        <select value={filter.type} onChange={e=>setFilter(p=>({...p,type:e.target.value}))} style={{width:"auto",padding:"5px 10px",fontSize:12}}>
          <option value="">Todos los tipos</option>{EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
      </div>

      <Card style={{padding:0,overflowX:"auto"}}>
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Categoría</th><th>Edificio/Apt</th><th>Proveedor</th><th>Monto</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {[...shown].reverse().map(e=>(
              <tr key={e.id}>
                <td style={{color:T.muted,fontSize:12}}>{e.date}</td>
                <td><span className="badge bteal">{e.type}</span></td>
                <td style={{fontWeight:600}}>{e.description}</td>
                <td><span className={`badge ${e.category==="Fijo"?"bb":"bgold"}`}>{e.category}</span></td>
                <td style={{fontSize:12}}>{e.building}{e.apt?` Apt ${e.apt}`:""}</td>
                <td style={{fontSize:12,color:T.muted}}>{e.supplier}</td>
                <td className="mono" style={{color:T.orange,fontWeight:700}}>{fmt(e.amount)}</td>
                <td>{e.isPending?<span className="badge bo">Pendiente</span>:<span className="badge bg">Pagado</span>}</td>
                <td>
                  <div style={{display:"flex",gap:4}}>
                    {e.isPending&&<Btn size="sm" v="success" onClick={()=>setExpenses(p=>p.map(x=>x.id===e.id?{...x,isPending:false,date:today()}:x))}>✓</Btn>}
                    <Btn size="sm" v="ghost" onClick={()=>{setForm(e);setModal("form")}}>✏</Btn>
                    <Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setExpenses(p=>p.filter(x=>x.id!==e.id))}}>🗑</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal==="form"&&(
        <Modal title={form.id?"Editar Gasto":"Nuevo Gasto"} onClose={()=>setModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Fecha"><input type="date" value={form.date} onChange={F("date")}/></Field>
            <Field label="Tipo de Gasto"><select value={form.type} onChange={F("type")}>{EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Categoría"><select value={form.category} onChange={F("category")}><option>Fijo</option><option>Variable</option></select></Field>
            <Field label="Edificio"><select value={form.building} onChange={F("building")}>{BUILDINGS.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Apartamento"><input value={form.apt} onChange={F("apt")} placeholder="ej: 101"/></Field>
            <Field label="Proveedor"><input value={form.supplier} onChange={F("supplier")}/></Field>
            <Field label="Descripción" col={2}><input value={form.description} onChange={F("description")}/></Field>
            <Field label="Método"><select value={form.method} onChange={F("method")}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></Field>
            <Field label="Monto"><input type="number" value={form.amount} onChange={F("amount")}/></Field>
            <Field label="¿Pendiente por Pagar?" col={2}><select value={form.isPending?"Sí":"No"} onChange={e=>setForm(p=>({...p,isPending:e.target.value==="Sí"}))}><option>No</option><option>Sí</option></select></Field>
            {form.isPending&&<Field label="Fecha Vencimiento" col={2}><input type="date" value={form.dueDate} onChange={F("dueDate")}/></Field>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TENANTS — with photos, building/apt filter
// ══════════════════════════════════════════════════════════════════════════════
function TenantsModule({tenants,setTenants,availability,setAvailability,setCleaningOrders,onToast}){
  const [filter,setFilter]=useState({building:"",apt:""});
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const [gallery,setGallery]=useState(null);
  const [checkoutTarget,setCheckoutTarget]=useState(null);
  const E={id:null,name:"",phone:"",email:"",idPhotos:[],roomPhotos:[],contract:"",emergencyContact:"",building:BUILDINGS[0],apt:"",bed:BED_TYPES[0],rent:"",deposit:"",depositPaid:0,balance:0,checkIn:today(),checkOut:"",status:"Activo",referredBy:"",parking:false,parkingAmt:0,transferHistory:[]};
  const [form,setForm]=useState(E);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const allBuildings=[...new Set(tenants.map(t=>t.building))];
  const allApts=[...new Set(tenants.filter(t=>!filter.building||t.building===filter.building).map(t=>t.apt))].sort();

  const filtered=tenants.filter(t=>{
    if(filter.building&&t.building!==filter.building)return false;
    if(filter.apt&&t.apt!==filter.apt)return false;
    if(search&&!t.name.toLowerCase().includes(search.toLowerCase())&&!t.apt.includes(search))return false;
    return true;
  });

  const save=()=>{
    if(!form.name||!form.apt)return alert("Nombre y apt requeridos");
    if(form.id)setTenants(p=>p.map(t=>t.id===form.id?{...form}:t));
    else setTenants(p=>[...p,{...form,id:Date.now(),rent:+form.rent,deposit:+form.deposit,balance:+form.balance||+form.rent}]);
    setModal(null);
  };

  const doCheckout=(t)=>{
    setTenants(p=>p.map(x=>x.id===t.id?{...x,status:"Inactivo",checkOut:today()}:x));
    setAvailability(p=>p.map(a=>a.building===t.building&&a.apt===t.apt&&a.bed===t.bed?{...a,status:"Disponible"}:a));
    setCleaningOrders(p=>[...p,{id:Date.now(),apt:t.apt,building:t.building,cleaner:"Ana",date:today(),time:"09:00",status:"Pendiente",notes:`Check-out ${t.name}`,type:"Salida"}]);
    onToast(`Check-out completado: ${t.name}`);
    setCheckoutTarget(null);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="👥 Inquilinos" action={
        <div style={{display:"flex",gap:8}}><input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:200}}/><Btn onClick={()=>{setForm(E);setModal("form")}}>+ Nuevo</Btn></div>
      }/>
      <FilterBar buildings={allBuildings} apts={allApts} value={filter} onChange={setFilter}/>

      <Card style={{padding:0,overflowX:"auto"}}>
        <table>
          <thead><tr><th>Inquilino</th><th>Docs</th><th>Ubicación</th><th>Renta</th><th>Depósito</th><th>Saldo</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(t=>(
              <tr key={t.id}>
                <td>
                  <p style={{fontWeight:600}}>{t.name}</p>
                  <p style={{fontSize:11,color:T.muted}}>{t.phone}</p>
                </td>
                <td>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    <button onClick={()=>t.idPhotos?.length?setGallery({photos:t.idPhotos,title:`ID — ${t.name}`}):null} className={`badge ${t.idPhotos?.length?"bg":"br"}`} style={{cursor:t.idPhotos?.length?"pointer":"default",background:"transparent",border:"none",padding:0}}>
                      <span className={`badge ${t.idPhotos?.length?"bg":"br"}`} style={{fontSize:10}}>ID{t.idPhotos?.length?` (${t.idPhotos.length})`:""}</span>
                    </button>
                    <button onClick={()=>t.roomPhotos?.length?setGallery({photos:t.roomPhotos,title:`Cuarto — ${t.name}`}):null} className="badge" style={{background:"transparent",border:"none",padding:0,cursor:t.roomPhotos?.length?"pointer":"default"}}>
                      <span className={`badge ${t.roomPhotos?.length?"bpurple":"br"}`} style={{fontSize:10}}>📷{t.roomPhotos?.length?` (${t.roomPhotos.length})`:""}</span>
                    </button>
                    <span className={`badge ${t.contract?"bg":"br"}`} style={{fontSize:10}}>Cont</span>
                    <span className={`badge ${t.emergencyContact?"bg":"br"}`} style={{fontSize:10}}>Emerg</span>
                  </div>
                </td>
                <td><p style={{fontSize:12}}>{t.building}</p><p style={{fontSize:11,color:T.muted}}>Apt {t.apt}·{t.bed}</p></td>
                <td className="mono">{fmt(t.rent)}</td>
                <td><p className="mono" style={{color:T.green,fontSize:12}}>{fmt(t.depositPaid)}</p>{t.deposit-t.depositPaid>0&&<p className="mono" style={{fontSize:11,color:T.red}}>−{fmt(t.deposit-t.depositPaid)}</p>}</td>
                <td className="mono" style={{color:t.balance>0?T.red:T.green}}>{fmt(t.balance)}</td>
                <td><span className={`badge ${t.status==="Activo"?"bg":t.status==="Moroso"?"br":"bmuted"}`}>● {t.status}</span></td>
                <td>
                  <div style={{display:"flex",gap:5}}>
                    <Btn size="sm" v="ghost" onClick={()=>{setForm({...t,idPhotos:t.idPhotos||[],roomPhotos:t.roomPhotos||[]});setModal("form")}}>✏</Btn>
                    {t.status!=="Inactivo"&&<Btn size="sm" v="orange" onClick={()=>setCheckoutTarget(t)}>🚪</Btn>}
                    <Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setTenants(p=>p.filter(x=>x.id!==t.id))}}>🗑</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal==="form"&&(
        <Modal title={form.id?"Editar Inquilino":"Nuevo Inquilino"} onClose={()=>setModal(null)} width={680}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Nombre" col={2}><input value={form.name} onChange={F("name")}/></Field>
            <Field label="Teléfono"><input value={form.phone} onChange={F("phone")}/></Field>
            <Field label="Email"><input value={form.email} onChange={F("email")}/></Field>
            <Field label="Contacto Emergencia" col={2}><input value={form.emergencyContact} onChange={F("emergencyContact")}/></Field>
            <Field label="Contrato Digital (nombre/ref)" col={2}><input value={form.contract} onChange={F("contract")}/></Field>
            <Field label="Edificio"><select value={form.building} onChange={F("building")}>{BUILDINGS.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Apartamento"><input value={form.apt} onChange={F("apt")}/></Field>
            <Field label="Cama/Espacio"><select value={form.bed} onChange={F("bed")}>{BED_TYPES.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Estado"><select value={form.status} onChange={F("status")}>{["Activo","Moroso","Inactivo"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Renta"><input type="number" value={form.rent} onChange={F("rent")}/></Field>
            <Field label="Depósito Total"><input type="number" value={form.deposit} onChange={F("deposit")}/></Field>
            <Field label="Depósito Pagado"><input type="number" value={form.depositPaid} onChange={F("depositPaid")}/></Field>
            <Field label="Saldo Pendiente"><input type="number" value={form.balance} onChange={F("balance")}/></Field>
            <Field label="Check-In"><input type="date" value={form.checkIn} onChange={F("checkIn")}/></Field>
            <Field label="Check-Out"><input type="date" value={form.checkOut} onChange={F("checkOut")}/></Field>
            <Field label="Referido por" col={2}><input value={form.referredBy} onChange={F("referredBy")}/></Field>
            <Field label="📷 Fotos ID del Inquilino" col={2}>
              <PhotoUpload photos={form.idPhotos||[]} onChange={v=>setForm(p=>({...p,idPhotos:v}))} label="Subir fotos del documento de identidad"/>
            </Field>
            <Field label="📸 Fotos del Cuarto (salida)" col={2}>
              <PhotoUpload photos={form.roomPhotos||[]} onChange={v=>setForm(p=>({...p,roomPhotos:v}))} label="Fotos del cuarto al momento de la salida"/>
            </Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div>
        </Modal>
      )}

      {checkoutTarget&&(
        <Modal title={`🚪 Check-Out — ${checkoutTarget.name}`} onClose={()=>setCheckoutTarget(null)} width={460}>
          <p style={{color:T.muted,fontSize:13,marginBottom:16}}>Esto marcará al inquilino como Inactivo, liberará el espacio y creará una orden de limpieza de salida para Ana.</p>
          <Field label="📸 Agregar fotos del cuarto (estado de salida)">
            <PhotoUpload photos={checkoutTarget.roomPhotos||[]} onChange={v=>setCheckoutTarget(p=>({...p,roomPhotos:v}))} label="Sube fotos del cuarto antes de confirmar la salida"/>
          </Field>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}>
            <Btn v="muted" onClick={()=>setCheckoutTarget(null)}>Cancelar</Btn>
            <Btn v="danger" onClick={()=>{
              setTenants(p=>p.map(t=>t.id===checkoutTarget.id?{...t,roomPhotos:checkoutTarget.roomPhotos||[],status:"Inactivo",checkOut:today()}:t));
              setAvailability(p=>p.map(a=>a.building===checkoutTarget.building&&a.apt===checkoutTarget.apt&&a.bed===checkoutTarget.bed?{...a,status:"Disponible"}:a));
              setCleaningOrders(p=>[...p,{id:Date.now(),apt:checkoutTarget.apt,building:checkoutTarget.building,cleaner:"Ana",date:today(),time:"09:00",status:"Pendiente",notes:`Check-out ${checkoutTarget.name}`,type:"Salida"}]);
              onToast(`Check-out: ${checkoutTarget.name}`);
              setCheckoutTarget(null);
            }}>✓ Confirmar Check-Out</Btn>
          </div>
        </Modal>
      )}

      {gallery&&<PhotoGallery photos={gallery.photos} title={gallery.title} onClose={()=>setGallery(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLEANING — Ana's schedule + fee payments
// ══════════════════════════════════════════════════════════════════════════════
function CleaningModule({cleaningSchedule,setCleaningSchedule,cleaningFees,setCleaningFees,tenants,properties}){
  const [tab,setTab]=useState("schedule");
  const [modal,setModal]=useState(null);
  const [weekStart,setWeekStart]=useState(()=>{
    const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().split("T")[0];
  });
  const E={id:null,apt:"",building:BUILDINGS[0],cleaner:"Ana",date:today(),time:"09:00",status:"Pendiente",notes:"",type:"Rutina"};
  const [form,setForm]=useState(E);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const save=()=>{
    if(!form.apt)return alert("Apartamento requerido");
    if(form.id)setCleaningSchedule(p=>p.map(x=>x.id===form.id?{...form}:x));
    else setCleaningSchedule(p=>[...p,{...form,id:Date.now()}]);
    setModal(null);
  };

  // Week calendar
  const weekDays=Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart); d.setDate(d.getDate()+i);
    return d.toISOString().split("T")[0];
  });
  const dayNames=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

  const whatsappText=()=>{
    const lines=["🧹 *Calendario de Limpieza Semanal*",""];
    weekDays.forEach(day=>{
      const items=cleaningSchedule.filter(c=>c.date===day);
      if(items.length){
        const d=new Date(day+"T12:00:00");
        lines.push(`*${dayNames[d.getDay()]} ${day}*`);
        items.forEach(c=>lines.push(`  • Apt ${c.apt} (${c.building}) — ${c.time} — ${c.type}`));
        lines.push("");
      }
    });
    return lines.join("\n");
  };

  const allApts=[...new Set(properties.map(p=>p.apt))];

  // Fee stats
  const feePaid=cleaningFees.filter(f=>f.paid).reduce((s,f)=>s+f.amount,0);
  const feePending=cleaningFees.filter(f=>!f.paid).reduce((s,f)=>s+f.amount,0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="🧹 Limpieza" action={
        <div style={{display:"flex",gap:8}}>
          <Btn v="purple" onClick={()=>{setForm(E);setModal("form")}}>+ Programar</Btn>
          <Btn v="gold" onClick={()=>{navigator.clipboard?.writeText(whatsappText());alert("Calendario copiado — pega en WhatsApp de Ana")}}>📲 Enviar a Ana</Btn>
        </div>
      }/>

      {/* Tabs */}
      <div style={{display:"flex",gap:6}}>
        {[["schedule","📅 Control de Ana"],["fees","💵 Pagos de Limpieza"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 16px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,background:tab===k?T.purple:T.border,color:tab===k?"#fff":T.muted,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {tab==="schedule"&&(
        <>
          {/* Weekly calendar */}
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <p style={{fontWeight:700,fontSize:14}}>📅 Calendario Semanal</p>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d.toISOString().split("T")[0]);}} style={{background:"none",border:`1px solid ${T.border}`,color:T.muted,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>‹ Anterior</button>
                <span style={{fontSize:12,color:T.muted}}>{weekStart}</span>
                <button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d.toISOString().split("T")[0]);}} style={{background:"none",border:`1px solid ${T.border}`,color:T.muted,borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Siguiente ›</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
              {weekDays.map((day,i)=>{
                const items=cleaningSchedule.filter(c=>c.date===day);
                const d=new Date(day+"T12:00:00");
                return(
                  <div key={day} style={{background:T.bg,borderRadius:10,padding:"8px 6px",minHeight:90,border:`1px solid ${T.border}`}}>
                    <p style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:4}}>{dayNames[d.getDay()]}</p>
                    <p style={{fontSize:10,color:T.muted,marginBottom:6}}>{day.slice(5)}</p>
                    {items.map(c=>(
                      <div key={c.id} onClick={()=>{setForm(c);setModal("form");}} style={{background:c.status==="Completado"?T.green+"20":T.purple+"20",borderRadius:6,padding:"4px 6px",marginBottom:4,cursor:"pointer",border:`1px solid ${c.status==="Completado"?T.green:T.purple}30`}}>
                        <p style={{fontSize:10,fontWeight:600,color:c.status==="Completado"?T.green:T.purple}}>Apt {c.apt}</p>
                        <p style={{fontSize:10,color:T.muted}}>{c.time} · {c.type}</p>
                      </div>
                    ))}
                    <button onClick={()=>{setForm({...E,date:day});setModal("form");}} style={{width:"100%",background:"transparent",border:`1px dashed ${T.border}`,borderRadius:6,color:T.muted,fontSize:11,cursor:"pointer",padding:"3px 0",marginTop:2}}>+</button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* WhatsApp preview */}
          <Card>
            <p style={{fontSize:13,fontWeight:700,marginBottom:10,color:T.green}}>📲 Vista previa WhatsApp para Ana</p>
            <pre style={{fontSize:12,color:T.text,background:T.bg,borderRadius:8,padding:12,whiteSpace:"pre-wrap",fontFamily:"monospace",lineHeight:1.7}}>{whatsappText()||"Sin tareas programadas esta semana"}</pre>
          </Card>

          {/* Full table */}
          <h3 style={{fontSize:14,fontWeight:700}}>Registro Completo</h3>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table>
              <thead><tr><th>Fecha</th><th>Hora</th><th>Edificio</th><th>Apt</th><th>Tipo</th><th>Personal</th><th>Estado</th><th>Notas</th><th></th></tr></thead>
              <tbody>
                {[...cleaningSchedule].sort((a,b)=>b.date.localeCompare(a.date)).map(c=>(
                  <tr key={c.id}>
                    <td style={{fontSize:12,color:T.muted}}>{c.date}</td>
                    <td style={{fontSize:12}}>{c.time}</td>
                    <td>{c.building}</td><td>{c.apt}</td>
                    <td><span className="badge bpurple">{c.type}</span></td>
                    <td style={{fontSize:12}}>{c.cleaner}</td>
                    <td><span className={`badge ${c.status==="Completado"?"bg":c.status==="En Proceso"?"bo":"bb"}`}>{c.status}</span></td>
                    <td style={{fontSize:12,color:T.muted,maxWidth:180}}>{c.notes||"—"}</td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        <Btn size="sm" v="ghost" onClick={()=>{setForm(c);setModal("form")}}>✏</Btn>
                        {c.status!=="Completado"&&<Btn size="sm" v="success" onClick={()=>setCleaningSchedule(p=>p.map(x=>x.id===c.id?{...x,status:"Completado"}:x))}>✓</Btn>}
                        <Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setCleaningSchedule(p=>p.filter(x=>x.id!==c.id))}}>🗑</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab==="fees"&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:13}}>
            <StatCard label="Fee Cobrado" value={fmt(feePaid)} color={T.green} icon="✅"/>
            <StatCard label="Fee Pendiente" value={fmt(feePending)} color={T.red} icon="⚠"/>
            <StatCard label="Total Registros" value={cleaningFees.length} color={T.accent} icon="📋"/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn v="teal" onClick={()=>{
              const newFees=tenants.filter(t=>t.status!=="Inactivo").map(t=>({id:Date.now()+Math.random(),tenantId:t.id,tenantName:t.name,apt:t.apt,building:t.building,month:today().slice(0,7),amount:80,paid:false,date:""}));
              setCleaningFees(p=>[...p,...newFees]);
            }}>+ Generar Fees del Mes</Btn>
          </div>
          <Card style={{padding:0,overflowX:"auto"}}>
            <table>
              <thead><tr><th>Inquilino</th><th>Apt</th><th>Mes</th><th>Monto</th><th>Pagado</th><th>Fecha Pago</th><th>Acción</th></tr></thead>
              <tbody>
                {cleaningFees.map(f=>(
                  <tr key={f.id}>
                    <td style={{fontWeight:600}}>{f.tenantName}</td>
                    <td>{f.building}·{f.apt}</td>
                    <td style={{fontSize:12,color:T.muted}}>{f.month}</td>
                    <td className="mono">{fmt(f.amount)}</td>
                    <td>{f.paid?<span className="badge bg">✓ Sí</span>:<span className="badge br">✗ No</span>}</td>
                    <td style={{fontSize:12,color:T.muted}}>{f.date||"—"}</td>
                    <td>
                      {!f.paid&&<Btn size="sm" v="success" onClick={()=>setCleaningFees(p=>p.map(x=>x.id===f.id?{...x,paid:true,date:today()}:x))}>✓ Marcar Pagado</Btn>}
                      <Btn size="sm" v="danger" style={{marginLeft:4}} onClick={()=>{if(confirm("¿Eliminar?"))setCleaningFees(p=>p.filter(x=>x.id!==f.id))}}>🗑</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {modal==="form"&&(
        <Modal title={form.id?"Editar Limpieza":"Nueva Programación"} onClose={()=>setModal(null)} width={500}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Edificio"><select value={form.building} onChange={F("building")}>{BUILDINGS.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Apartamento"><select value={form.apt} onChange={F("apt")}><option value="">Seleccionar</option>{allApts.map(a=><option key={a}>{a}</option>)}</select></Field>
            <Field label="Fecha"><input type="date" value={form.date} onChange={F("date")}/></Field>
            <Field label="Hora"><input type="time" value={form.time} onChange={F("time")}/></Field>
            <Field label="Personal"><input value={form.cleaner} onChange={F("cleaner")}/></Field>
            <Field label="Tipo"><select value={form.type} onChange={F("type")}>{["Rutina","Salida","Entrada","Profunda"].map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Estado"><select value={form.status} onChange={F("status")}>{["Pendiente","En Proceso","Completado"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="col" col={1}></Field>
            <Field label="Notas / Reporte" col={2}><textarea value={form.notes} onChange={F("notes")}/></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY — warehouse + per apt, with photos
// ══════════════════════════════════════════════════════════════════════════════
function InventoryModule({inventory,setInventory,properties}){
  const [tab,setTab]=useState("warehouse");
  const [modal,setModal]=useState(null);
  const [gallery,setGallery]=useState(null);
  const [aptFilter,setAptFilter]=useState("");
  const E={id:null,category:"Camas",item:"",qty:1,location:"Almacén Central",condition:"Nuevo",apt:"",photos:[]};
  const [form,setForm]=useState(E);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=()=>{if(!form.item)return;if(form.id)setInventory(p=>p.map(x=>x.id===form.id?{...form,qty:+form.qty}:x));else setInventory(p=>[...p,{...form,id:Date.now(),qty:+form.qty}]);setModal(null);};
  const allApts=[...new Set(properties.map(p=>p.apt))];
  const cc=c=>c==="Nuevo"?T.green:c==="Bueno"?T.accent:T.orange;

  const warehouse=inventory.filter(i=>i.location==="Almacén Central"||!i.apt);
  const assigned=inventory.filter(i=>i.apt);
  const byApt={};
  assigned.forEach(i=>{if(!byApt[i.apt])byApt[i.apt]=[];byApt[i.apt].push(i);});

  // Totals by category
  const totals={};
  inventory.forEach(i=>{if(!totals[i.category])totals[i.category]=0;totals[i.category]+=i.qty;});

  const shown=tab==="warehouse"?warehouse:tab==="assigned"?(aptFilter?assigned.filter(i=>i.apt===aptFilter):assigned):inventory;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="📦 Almacén & Inventario" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Artículo</Btn>}/>

      {/* Totals by category */}
      <Card>
        <p style={{fontSize:13,fontWeight:700,marginBottom:10,color:T.accent}}>📊 Total por Categoría</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {Object.entries(totals).map(([cat,qty])=>(
            <div key={cat} style={{background:T.bg,borderRadius:8,padding:"6px 12px",display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:T.muted}}>{cat}</span>
              <span className="mono" style={{fontWeight:700,color:T.accent,fontSize:15}}>{qty}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {[["warehouse","🏪 Almacén Central"],["assigned","🏠 Por Apartamento"],["all","Ver Todo"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,background:tab===k?T.accent:T.border,color:tab===k?T.bg:T.muted,cursor:"pointer"}}>{l}</button>
        ))}
        {tab==="assigned"&&(
          <select value={aptFilter} onChange={e=>setAptFilter(e.target.value)} style={{width:"auto",padding:"5px 10px",fontSize:12}}>
            <option value="">Todos los apts</option>{allApts.map(a=><option key={a}>Apt {a}</option>)}
          </select>
        )}
      </div>

      {/* Per apt view */}
      {tab==="assigned"&&!aptFilter&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
          {Object.entries(byApt).map(([apt,items])=>(
            <Card key={apt}>
              <p style={{fontWeight:700,fontSize:14,marginBottom:10,color:T.gold}}>Apartamento {apt}</p>
              {items.map(i=>(
                <div key={i.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}20`,fontSize:12}}>
                  <div>
                    <span style={{fontWeight:500}}>{i.item}</span>
                    {i.photos?.length>0&&<button onClick={()=>setGallery({photos:i.photos,title:i.item})} style={{background:"none",border:"none",color:T.accent,cursor:"pointer",fontSize:11,marginLeft:6}}>📷 {i.photos.length}</button>}
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span className="mono" style={{color:T.accent,fontWeight:700}}>{i.qty}</span>
                    <span className="badge" style={{background:cc(i.condition)+"20",color:cc(i.condition),fontSize:10}}>{i.condition}</span>
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      <Card style={{padding:0,overflowX:"auto"}}>
        <table>
          <thead><tr><th>Artículo</th><th>Categoría</th><th>Cant.</th><th>Ubicación</th><th>Apt</th><th>Condición</th><th>Fotos</th><th></th></tr></thead>
          <tbody>
            {shown.map(i=>(
              <tr key={i.id}>
                <td style={{fontWeight:600}}>{i.item}</td>
                <td><span className="badge bteal">{i.category}</span></td>
                <td className="mono" style={{fontWeight:700,color:T.accent}}>{i.qty}</td>
                <td style={{fontSize:12}}>{i.location}</td>
                <td style={{fontSize:12,color:T.muted}}>{i.apt||"—"}</td>
                <td><span className="badge" style={{background:cc(i.condition)+"20",color:cc(i.condition)}}>{i.condition}</span></td>
                <td>
                  {i.photos?.length>0
                    ?<button onClick={()=>setGallery({photos:i.photos,title:i.item})} style={{background:"none",border:`1px solid ${T.accent}40`,borderRadius:6,color:T.accent,cursor:"pointer",padding:"3px 8px",fontSize:11}}>📷 {i.photos.length}</button>
                    :<span style={{fontSize:11,color:T.muted}}>Sin fotos</span>}
                </td>
                <td>
                  <div style={{display:"flex",gap:4}}>
                    <Btn size="sm" v="ghost" onClick={()=>{setForm({...i,photos:i.photos||[]});setModal("form")}}>✏</Btn>
                    <Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setInventory(p=>p.filter(x=>x.id!==i.id))}}>🗑</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal==="form"&&(
        <Modal title={form.id?"Editar Artículo":"Nuevo Artículo"} onClose={()=>setModal(null)} width={540}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Nombre Artículo" col={2}><input value={form.item} onChange={F("item")}/></Field>
            <Field label="Categoría"><select value={form.category} onChange={F("category")}>{INVENTORY_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Cantidad"><input type="number" value={form.qty} onChange={F("qty")}/></Field>
            <Field label="Condición"><select value={form.condition} onChange={F("condition")}>{["Nuevo","Bueno","Requiere reparación"].map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Ubicación"><select value={form.location} onChange={F("location")}>{["Almacén Central","Pasillo Temporal","Asignado",...BUILDINGS.map(b=>`Pasillo - ${b}`)].map(l=><option key={l}>{l}</option>)}</select></Field>
            <Field label="Apartamento Asignado" col={2}><select value={form.apt} onChange={F("apt")}><option value="">Sin asignar</option>{allApts.map(a=><option key={a}>{a}</option>)}</select></Field>
            <Field label="📷 Fotos del Artículo" col={2}>
              <PhotoUpload photos={form.photos||[]} onChange={v=>setForm(p=>({...p,photos:v}))} label="Sube fotos del artículo"/>
            </Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div>
        </Modal>
      )}

      {gallery&&<PhotoGallery photos={gallery.photos} title={gallery.title} onClose={()=>setGallery(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════════════════════
function TasksModule({tasks,setTasks}){
  const [tab,setTab]=useState("pending");
  const [modal,setModal]=useState(null);
  const E={id:null,title:"",description:"",date:today(),priority:"Media",status:"Pendiente",origin:"App",apt:"",building:BUILDINGS[0]};
  const [form,setForm]=useState(E);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=()=>{if(!form.title)return;if(form.id)setTasks(p=>p.map(x=>x.id===form.id?{...form}:x));else setTasks(p=>[...p,{...form,id:Date.now()}]);setModal(null);};
  const shown=tab==="pending"?tasks.filter(t=>t.status==="Pendiente"):tab==="done"?tasks.filter(t=>t.status==="Completado"):tasks;
  const pCount=tasks.filter(t=>t.status==="Pendiente").length;
  const dCount=tasks.filter(t=>t.status==="Completado").length;
  const prioColor=p=>p==="Alta"?T.red:p==="Media"?T.orange:T.muted;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="✅ Tareas Diarias" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Nueva Tarea</Btn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:13}}>
        <StatCard label="Pendientes" value={pCount} color={T.orange} icon="⏳"/>
        <StatCard label="Completadas" value={dCount} color={T.green} icon="✅"/>
        <StatCard label="Total" value={tasks.length} color={T.accent} icon="📋"/>
      </div>

      <Card style={{fontSize:13,color:T.muted,display:"flex",gap:10,alignItems:"flex-start",background:T.card}}>
        <span style={{fontSize:18}}>💡</span>
        <div><p style={{fontWeight:600,color:T.text,marginBottom:3}}>Tareas desde WhatsApp</p><p>En producción, conecta un número de WhatsApp Business a un webhook que crea tareas automáticamente cuando alguien te escribe. El campo "Origen" mostrará "WhatsApp" y el nombre del contacto.</p></div>
      </Card>

      <div style={{display:"flex",gap:6}}>
        {[["pending",`Pendientes (${pCount})`],["done","Completadas"],["all","Todas"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,background:tab===k?T.accent:T.border,color:tab===k?T.bg:T.muted,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {shown.length===0&&<Card style={{textAlign:"center",padding:40}}><p style={{color:T.muted}}>Sin tareas en esta vista</p></Card>}
        {shown.map(t=>(
          <Card key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,fontSize:14,textDecoration:t.status==="Completado"?"line-through":"none",color:t.status==="Completado"?T.muted:T.text}}>{t.title}</span>
                <span className="badge" style={{background:prioColor(t.priority)+"20",color:prioColor(t.priority)}}>{t.priority}</span>
                <span className={`badge ${t.status==="Completado"?"bg":"bo"}`}>{t.status}</span>
                {t.origin==="WhatsApp"&&<span className="badge bg" style={{fontSize:10}}>📲 WhatsApp</span>}
              </div>
              {t.description&&<p style={{fontSize:12,color:T.muted,marginBottom:4}}>{t.description}</p>}
              <div style={{display:"flex",gap:12,fontSize:11,color:T.muted}}>
                <span>📅 {t.date}</span>
                {t.building&&<span>🏢 {t.building}</span>}
                {t.apt&&<span>🚪 Apt {t.apt}</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              {t.status!=="Completado"&&<Btn size="sm" v="success" onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,status:"Completado"}:x))}>✓ Completar</Btn>}
              <Btn size="sm" v="ghost" onClick={()=>{setForm(t);setModal("form")}}>✏</Btn>
              <Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setTasks(p=>p.filter(x=>x.id!==t.id))}}>🗑</Btn>
            </div>
          </Card>
        ))}
      </div>

      {modal==="form"&&(
        <Modal title={form.id?"Editar Tarea":"Nueva Tarea"} onClose={()=>setModal(null)} width={500}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Título" col={2}><input value={form.title} onChange={F("title")}/></Field>
            <Field label="Descripción" col={2}><textarea value={form.description} onChange={F("description")}/></Field>
            <Field label="Fecha"><input type="date" value={form.date} onChange={F("date")}/></Field>
            <Field label="Prioridad"><select value={form.priority} onChange={F("priority")}>{["Alta","Media","Baja"].map(p=><option key={p}>{p}</option>)}</select></Field>
            <Field label="Estado"><select value={form.status} onChange={F("status")}>{["Pendiente","Completado"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Origen"><select value={form.origin} onChange={F("origin")}>{["App","WhatsApp","Llamada","Email","Otro"].map(o=><option key={o}>{o}</option>)}</select></Field>
            <Field label="Edificio"><select value={form.building} onChange={F("building")}><option value="">N/A</option>{BUILDINGS.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Apartamento"><input value={form.apt} onChange={F("apt")} placeholder="opcional"/></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEPOSITS — with refunds tracking, building/apt filter
// ══════════════════════════════════════════════════════════════════════════════
function DepositsModule({tenants,setTenants}){
  const [filter,setFilter]=useState({building:"",apt:""});
  const [modal,setModal]=useState(null);
  const [selected,setSelected]=useState(null);
  const [df,setDf]=useState({amount:"",reason:"",evidence:""});
  const allBuildings=[...new Set(tenants.map(t=>t.building))];
  const allApts=[...new Set(tenants.filter(t=>!filter.building||t.building===filter.building).map(t=>t.apt))].sort();

  const filtered=tenants.filter(t=>{
    if(filter.building&&t.building!==filter.building)return false;
    if(filter.apt&&t.apt!==filter.apt)return false;
    return true;
  });

  // Deposits to return: inactive tenants with depositPaid > 0
  const toReturn=tenants.filter(t=>t.status==="Inactivo"&&t.depositPaid>0);
  const totalRec=filtered.reduce((s,t)=>s+t.depositPaid,0);
  const totalPend=filtered.reduce((s,t)=>s+(t.deposit-t.depositPaid),0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="🔐 Depósitos"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:13}}>
        <StatCard label="Total Recibido" value={fmt(totalRec)} color={T.green} icon="✅"/>
        <StatCard label="Total Pendiente" value={fmt(totalPend)} color={T.red} icon="⏳"/>
        <StatCard label="Depósitos Completos" value={filtered.filter(t=>t.depositPaid>=t.deposit&&t.deposit>0).length} color={T.accent} icon="🔐"/>
        <StatCard label="Por Devolver" value={toReturn.length} color={T.orange} icon="↩"/>
      </div>

      <FilterBar buildings={allBuildings} apts={allApts} value={filter} onChange={setFilter}/>

      {/* Deposits to return */}
      {toReturn.length>0&&(
        <Card style={{border:`1px solid ${T.orange}40`}}>
          <p style={{fontSize:13,fontWeight:700,marginBottom:12,color:T.orange}}>↩ Depósitos por Devolver</p>
          {toReturn.map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}20`}}>
              <div>
                <p style={{fontWeight:600,fontSize:13}}>{t.name}</p>
                <p style={{fontSize:11,color:T.muted}}>{t.building}·Apt {t.apt} · Check-out: {t.checkOut||"—"}</p>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span className="mono" style={{color:T.gold,fontWeight:700}}>{fmt(t.depositPaid)}</span>
                <Btn size="sm" v="success" onClick={()=>setTenants(p=>p.map(x=>x.id===t.id?{...x,depositPaid:0}:x))}>✓ Devuelto</Btn>
                <Btn size="sm" v="orange" onClick={()=>{setSelected(t);setDf({amount:"",reason:"",evidence:""});setModal("deduct")}}>Deducir</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card style={{padding:0,overflowX:"auto"}}>
        <table>
          <thead><tr><th>Inquilino</th><th>Apt</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th>%</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(t=>{
              const pend=t.deposit-t.depositPaid;
              const pct=t.deposit>0?Math.round(t.depositPaid/t.deposit*100):0;
              const cls=pend===0?"bg":t.depositPaid>0?"bgold":"br";
              const lbl=pend===0?"Completo":t.depositPaid>0?"Parcial":"Pendiente";
              return(
                <tr key={t.id}>
                  <td style={{fontWeight:600}}>{t.name}</td>
                  <td style={{fontSize:12}}>{t.building}·{t.apt}</td>
                  <td className="mono">{fmt(t.deposit)}</td>
                  <td className="mono" style={{color:T.green}}>{fmt(t.depositPaid)}</td>
                  <td className="mono" style={{color:pend>0?T.red:T.muted}}>{pend>0?fmt(pend):"—"}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:50,height:4,background:T.border,borderRadius:2}}><div style={{height:4,background:pct===100?T.green:T.gold,borderRadius:2,width:`${pct}%`}}/></div>
                      <span style={{fontSize:11,color:T.muted}}>{pct}%</span>
                    </div>
                  </td>
                  <td><span className={`badge ${cls}`}>{lbl}</span></td>
                  <td>
                    <div style={{display:"flex",gap:5}}>
                      {pend>0&&<Btn size="sm" v="success" onClick={()=>{const v=prompt(`Abonar (pendiente: ${fmt(pend)})`);if(v&&!isNaN(+v)&&+v>0)setTenants(p=>p.map(x=>x.id===t.id?{...x,depositPaid:Math.min(x.deposit,x.depositPaid+Math.min(+v,pend))}:x))}}>+Abonar</Btn>}
                      <Btn size="sm" v="danger" onClick={()=>{setSelected(t);setDf({amount:"",reason:"",evidence:""});setModal("deduct")}}>Deducir</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {modal==="deduct"&&selected&&(
        <Modal title={`Deducción — ${selected.name}`} onClose={()=>setModal(null)} width={440}>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <Field label="Monto"><input type="number" value={df.amount} onChange={e=>setDf(p=>({...p,amount:e.target.value}))}/></Field>
            <Field label="Motivo"><textarea value={df.reason} onChange={e=>setDf(p=>({...p,reason:e.target.value}))}/></Field>
            <Field label="Evidencia"><input value={df.evidence} onChange={e=>setDf(p=>({...p,evidence:e.target.value}))}/></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
            <Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn v="danger" onClick={()=>{if(!df.amount||!df.reason)return alert("Requeridos");setTenants(p=>p.map(t=>t.id===selected.id?{...t,depositPaid:Math.max(0,t.depositPaid-+df.amount)}:t));setModal(null);}}>Confirmar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STUB modules with building/apt filter
// ══════════════════════════════════════════════════════════════════════════════
function PaymentsModule({tenants,setTenants,payments,setPayments,onToast}){
  const [filter,setFilter]=useState({building:"",apt:""});
  const [modal,setModal]=useState(null);
  const [receipt,setReceipt]=useState(null);
  const E={date:today(),tenantId:"",apt:"",building:"",rent:0,cleaning:0,parking:0,lateFee:0,method:METHODS[0],checkNo:"",bank:"",holder:"",total:0};
  const [form,setForm]=useState(E);
  const rc=f=>({...f,total:+f.rent+ +f.cleaning+ +f.parking+ +f.lateFee});
  const setT=id=>{const t=tenants.find(t=>t.id===+id);if(t)setForm(p=>rc({...p,tenantId:+id,apt:t.apt,building:t.building,rent:t.rent,parking:t.parking?t.parkingAmt:0}));};
  const F=k=>e=>{const v=e.target.value;setForm(p=>{const n={...p,[k]:v};return["rent","cleaning","parking","lateFee"].includes(k)?rc(n):n;});};
  const save=()=>{
    if(!form.tenantId)return alert("Selecciona inquilino");
    const f=rc(form);const np={...f,id:Date.now()};
    setPayments(p=>[...p,np]);
    setTenants(prev=>prev.map(t=>{if(t.id!==f.tenantId)return t;const nb=Math.max(0,t.balance-f.rent);return{...t,balance:nb,status:nb>0?"Moroso":"Activo"};}));
    onToast(`Pago registrado: ${fmt(f.total)}`);setReceipt(np);setModal(null);
  };
  const allBuildings=[...new Set(payments.map(p=>{const t=tenants.find(t=>t.id===p.tenantId);return t?.building;}).filter(Boolean))];
  const allApts=[...new Set(payments.map(p=>{const t=tenants.find(t=>t.id===p.tenantId);return t?.apt;}).filter(Boolean))].sort();
  const shown=payments.filter(p=>{
    const t=tenants.find(t=>t.id===p.tenantId);
    if(filter.building&&t?.building!==filter.building)return false;
    if(filter.apt&&t?.apt!==filter.apt)return false;
    return true;
  });
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="💳 Pagos" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Registrar Pago</Btn>}/>
      <FilterBar buildings={allBuildings} apts={allApts} value={filter} onChange={setFilter}/>
      {receipt&&(
        <Card style={{border:`1px solid ${T.green}40`,background:T.green+"08"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{color:T.green,fontWeight:700}}>✅ Recibo Digital</span><Btn size="sm" v="muted" onClick={()=>setReceipt(null)}>✕</Btn></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[["Inquilino",tenants.find(t=>t.id===receipt.tenantId)?.name||"N/A"],["Fecha",receipt.date],["Método",receipt.method],["TOTAL",fmt(receipt.total)],["Renta",fmt(receipt.rent)],["Limpieza",fmt(receipt.cleaning)],["Parqueo",fmt(receipt.parking)],["Late Fee",fmt(receipt.lateFee)]].map(([l,v])=>(
              <div key={l} style={{background:T.card,borderRadius:8,padding:"8px 10px"}}><p style={{fontSize:10,color:T.muted,marginBottom:2}}>{l}</p><p className="mono" style={{fontWeight:600,fontSize:13}}>{v}</p></div>
            ))}
          </div>
        </Card>
      )}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table>
          <thead><tr><th>Fecha</th><th>Inquilino</th><th>Apt</th><th>Renta</th><th>Limpieza</th><th>Parqueo</th><th>Late Fee</th><th>Método</th><th>Total</th></tr></thead>
          <tbody>
            {[...shown].reverse().map(p=>{const t=tenants.find(t=>t.id===p.tenantId);return(
              <tr key={p.id}><td style={{color:T.muted,fontSize:12}}>{p.date}</td><td style={{fontWeight:600}}>{t?.name||"N/A"}</td><td style={{fontSize:12}}>{p.apt}</td><td className="mono">{fmt(p.rent)}</td><td className="mono" style={{color:T.muted}}>{fmt(p.cleaning)}</td><td className="mono" style={{color:T.muted}}>{fmt(p.parking)}</td><td className="mono" style={{color:p.lateFee>0?T.red:T.muted}}>{fmt(p.lateFee)}</td><td><span className="badge bb">{p.method}</span></td><td className="mono" style={{fontWeight:700,color:T.green}}>{fmt(p.total)}</td></tr>
            );})}
          </tbody>
        </table>
      </Card>
      {modal==="form"&&(
        <Modal title="Registrar Pago" onClose={()=>setModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Fecha"><input type="date" value={form.date} onChange={F("date")}/></Field>
            <Field label="Inquilino"><select value={form.tenantId} onChange={e=>setT(e.target.value)}><option value="">Seleccionar...</option>{tenants.filter(t=>t.status!=="Inactivo").map(t=><option key={t.id} value={t.id}>{t.name} — Apt {t.apt}</option>)}</select></Field>
            <Field label="Renta"><input type="number" value={form.rent} onChange={F("rent")}/></Field>
            <Field label="Limpieza"><input type="number" value={form.cleaning} onChange={F("cleaning")}/></Field>
            <Field label="Parqueo"><input type="number" value={form.parking} onChange={F("parking")}/></Field>
            <Field label="Late Fee"><input type="number" value={form.lateFee} onChange={F("lateFee")}/></Field>
            <Field label="Método" col={2}><select value={form.method} onChange={F("method")}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></Field>
            {form.method==="Cheque"&&<><Field label="# Cheque"><input value={form.checkNo} onChange={F("checkNo")}/></Field><Field label="Banco"><input value={form.bank} onChange={F("bank")}/></Field></>}
            <Field label="TOTAL" col={2}><input readOnly value={fmt(form.total)} style={{fontWeight:700,color:T.green}}/></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Registrar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

function LatePaymentsModule({tenants,setTenants,promises,setPromises}){
  const [filter,setFilter]=useState({building:"",apt:""});
  const [modal,setModal]=useState(null);
  const [pForm,setPForm]=useState({tenantId:"",tenantName:"",amount:"",promiseDate:"",notes:""});
  const allBuildings=[...new Set(tenants.map(t=>t.building))];
  const allApts=[...new Set(tenants.filter(t=>!filter.building||t.building===filter.building).map(t=>t.apt))].sort();
  const morosos=tenants.filter(t=>{
    if(t.balance<=0)return false;
    if(filter.building&&t.building!==filter.building)return false;
    if(filter.apt&&t.apt!==filter.apt)return false;
    return true;
  }).sort((a,b)=>b.balance-a.balance);
  useEffect(()=>{setPromises(prev=>prev.map(p=>p.status==="Pendiente"&&p.promiseDate<today()?{...p,status:"Vencida"}:p));},[]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="⚠ Cobranza" action={
        <div style={{display:"flex",gap:8}}>
          <Btn v="gold" onClick={()=>setModal("promise")}>📅 Promesa</Btn>
          <Btn v="danger" onClick={()=>alert("WhatsApp Business API — producción")}>📲 Envío Masivo</Btn>
        </div>
      }/>
      <FilterBar buildings={allBuildings} apts={allApts} value={filter} onChange={setFilter}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:13}}>
        <StatCard label="Total Adeudado" value={fmt(morosos.reduce((s,t)=>s+t.balance,0))} color={T.red} icon="💸"/>
        <StatCard label="Morosos" value={morosos.length} color={T.orange} icon="👤"/>
        <StatCard label="Promesas Activas" value={promises.filter(p=>p.status==="Pendiente").length} color={T.gold} icon="📅"/>
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table>
          <thead><tr><th>Inquilino</th><th>Apt</th><th>Saldo</th><th>Severidad</th><th>Acciones</th></tr></thead>
          <tbody>
            {morosos.map(t=>{
              const isCrit=t.deposit-t.depositPaid>0||t.balance>t.rent*1.5;
              return(
                <tr key={t.id}>
                  <td><p style={{fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:T.muted}}>{t.phone}</p></td>
                  <td style={{fontSize:12}}>{t.building}·Apt {t.apt}</td>
                  <td className="mono" style={{color:T.red,fontWeight:700}}>{fmt(t.balance)}</td>
                  <td><span className={`badge ${isCrit?"br":"bo"}`}>{isCrit?"🔴 Crítico":"🟡 Urgente"}</span></td>
                  <td>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <Btn size="sm" v="gold" onClick={()=>{setPForm({tenantId:t.id,tenantName:t.name,amount:t.balance,promiseDate:"",notes:""});setModal("promise")}}>📅</Btn>
                      <Btn size="sm" v="orange" onClick={()=>{const f=prompt(`Late fee manual para ${t.name}`);if(f&&!isNaN(+f))setTenants(p=>p.map(x=>x.id===t.id?{...x,balance:x.balance+ +f}:x))}}>+Fee</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <h3 style={{fontSize:14,fontWeight:700}}>📅 Promesas</h3>
      <Card style={{padding:0}}>
        <table>
          <thead><tr><th>Inquilino</th><th>Monto</th><th>Fecha</th><th>Estado</th><th>Notas</th><th></th></tr></thead>
          <tbody>
            {promises.map(p=>(
              <tr key={p.id}>
                <td style={{fontWeight:600}}>{p.tenantName}</td>
                <td className="mono">{fmt(p.amount)}</td>
                <td style={{color:p.status==="Vencida"?T.red:T.text}}>{p.promiseDate}</td>
                <td><span className={`badge ${p.status==="Pendiente"?"bgold":p.status==="Cumplida"?"bg":"br"}`}>{p.status}</span></td>
                <td style={{fontSize:12,color:T.muted}}>{p.notes||"—"}</td>
                <td>
                  <div style={{display:"flex",gap:4}}>
                    <Btn size="sm" v="success" onClick={()=>setPromises(prev=>prev.map(x=>x.id===p.id?{...x,status:"Cumplida"}:x))}>✓</Btn>
                    <Btn size="sm" v="danger" onClick={()=>setPromises(prev=>prev.filter(x=>x.id!==p.id))}>🗑</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {modal==="promise"&&(
        <Modal title="Promesa de Pago" onClose={()=>setModal(null)} width={440}>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <Field label="Inquilino"><select value={pForm.tenantId} onChange={e=>{const t=tenants.find(t=>t.id===+e.target.value);setPForm(p=>({...p,tenantId:+e.target.value,tenantName:t?.name||"",amount:t?.balance||0}))}}><option value="">Seleccionar</option>{tenants.filter(t=>t.balance>0).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            <Field label="Monto"><input type="number" value={pForm.amount} onChange={e=>setPForm(p=>({...p,amount:e.target.value}))}/></Field>
            <Field label="Fecha"><input type="date" value={pForm.promiseDate} onChange={e=>setPForm(p=>({...p,promiseDate:e.target.value}))}/></Field>
            <Field label="Notas"><textarea value={pForm.notes} onChange={e=>setPForm(p=>({...p,notes:e.target.value}))}/></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn v="gold" onClick={()=>{if(!pForm.tenantId||!pForm.promiseDate)return;setPromises(p=>[...p,{...pForm,id:Date.now(),amount:+pForm.amount,status:"Pendiente"}]);setModal(null);}}>💾 Guardar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

function AvailabilityModule({availability,setAvailability}){
  const [filter,setFilter]=useState({building:"",apt:""});
  const [modal,setModal]=useState(null);
  const E={id:null,building:BUILDINGS[0],apt:"",bed:BED_TYPES[0],type:"Privado",gender:"Mixto",price:"",status:"Disponible",releaseDate:"",reservation:0};
  const [form,setForm]=useState(E);
  const Ff=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=()=>{if(!form.apt)return;if(form.id)setAvailability(p=>p.map(x=>x.id===form.id?{...form,price:+form.price}:x));else setAvailability(p=>[...p,{...form,id:Date.now(),price:+form.price}]);setModal(null);};
  const allBuildings=[...new Set(availability.map(a=>a.building))];
  const allApts=[...new Set(availability.filter(a=>!filter.building||a.building===filter.building).map(a=>a.apt))].sort();
  const shown=availability.filter(a=>{
    if(filter.building&&a.building!==filter.building)return false;
    if(filter.apt&&a.apt!==filter.apt)return false;
    return true;
  });
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="📌 Disponibilidad" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Agregar</Btn>}/>
      <FilterBar buildings={allBuildings} apts={allApts} value={filter} onChange={setFilter}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:13}}>
        <StatCard label="Disponibles" value={shown.filter(a=>a.status==="Disponible").length} color={T.green} icon="✅"/>
        <StatCard label="Ocupados" value={shown.filter(a=>a.status==="Ocupado").length} color={T.muted} icon="🛏"/>
        <StatCard label="Reservados" value={shown.filter(a=>a.status==="Reservado").length} color={T.accent} icon="📌"/>
        <StatCard label="Próxima Salida" value={shown.filter(a=>a.status==="Próxima Salida").length} color={T.gold} icon="🚪"/>
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table>
          <thead><tr><th>Edificio</th><th>Apt</th><th>Espacio</th><th>Tipo</th><th>Género</th><th>Precio</th><th>Reserva</th><th>Liberación</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {shown.map(a=>(
              <tr key={a.id}>
                <td>{a.building}</td><td>{a.apt}</td><td>{a.bed}</td>
                <td><span className="badge bb">{a.type}</span></td>
                <td style={{fontSize:12,color:T.muted}}>{a.gender}</td>
                <td className="mono">{fmt(a.price)}</td>
                <td className="mono" style={{color:a.reservation>0?T.gold:T.muted}}>{a.reservation>0?fmt(a.reservation):"—"}</td>
                <td style={{fontSize:12,color:T.muted}}>{a.releaseDate||"—"}</td>
                <td><span className={`badge ${a.status==="Disponible"?"bg":a.status==="Ocupado"?"bmuted":a.status==="Reservado"?"bb":"bgold"}`}>{a.status}</span></td>
                <td><div style={{display:"flex",gap:4}}><Btn size="sm" v="ghost" onClick={()=>{setForm(a);setModal("form")}}>✏</Btn><Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setAvailability(p=>p.filter(x=>x.id!==a.id))}}>🗑</Btn></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {modal==="form"&&(
        <Modal title={form.id?"Editar":"Nuevo Espacio"} onClose={()=>setModal(null)} width={520}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Edificio"><select value={form.building} onChange={Ff("building")}>{BUILDINGS.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Apt"><input value={form.apt} onChange={Ff("apt")}/></Field>
            <Field label="Espacio"><select value={form.bed} onChange={Ff("bed")}>{BED_TYPES.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Tipo"><select value={form.type} onChange={Ff("type")}>{["Master","Privado","Compartido"].map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Género"><select value={form.gender} onChange={Ff("gender")}>{["Mixto","Hombres","Mujeres"].map(g=><option key={g}>{g}</option>)}</select></Field>
            <Field label="Precio"><input type="number" value={form.price} onChange={Ff("price")}/></Field>
            <Field label="Estado"><select value={form.status} onChange={Ff("status")}>{["Disponible","Ocupado","Reservado","Depósito Pendiente","Próxima Salida"].map(s=><option key={s}>{s}</option>)}</select></Field>
            {form.status==="Reservado"&&<Field label="Reserva"><input type="number" value={form.reservation} onChange={e=>setForm(p=>({...p,reservation:+e.target.value}))}/></Field>}
            <Field label="Fecha Liberación" col={2}><input type="date" value={form.releaseDate} onChange={Ff("releaseDate")}/></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

function PropertiesModule({properties,setProperties,tenants}){
  const [filter,setFilter]=useState({building:"",apt:""});
  const [modal,setModal]=useState(null);
  const [gallery,setGallery]=useState(null);
  const E={id:null,building:BUILDINGS[0],apt:"",type:"Compartido",bedrooms:2,beds:4,expectedRent:"",parking:false,parkingTenant:"",parkingAmt:0,parkingSticker:"",parkingRemote:"",hallwayNotes:"",lastRepair:"",lastPaint:"",carpetCleaning:"",curtainReplacement:"",extras:"",photos:[]};
  const [form,setForm]=useState(E);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const allBuildings=[...new Set(properties.map(p=>p.building))];
  const allApts=[...new Set(properties.filter(p=>!filter.building||p.building===filter.building).map(p=>p.apt))].sort();
  const shown=properties.filter(p=>{
    if(filter.building&&p.building!==filter.building)return false;
    if(filter.apt&&p.apt!==filter.apt)return false;
    return true;
  });
  const save=()=>{if(!form.apt)return;if(form.id)setProperties(p=>p.map(x=>x.id===form.id?{...form}:x));else setProperties(p=>[...p,{...form,id:Date.now(),expectedRent:+form.expectedRent,beds:+form.beds,bedrooms:+form.bedrooms}]);setModal(null);};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="🏢 Propiedades" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Nueva</Btn>}/>
      <FilterBar buildings={allBuildings} apts={allApts} value={filter} onChange={setFilter}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
        {shown.map(prop=>{
          const pts=tenants.filter(t=>t.apt===prop.apt&&t.building===prop.building&&t.status!=="Inactivo");
          const occ=Math.round(pts.length/prop.beds*100);
          return(
            <Card key={prop.id} style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div><p style={{fontWeight:700,fontSize:15}}>{prop.building} — Apt {prop.apt}</p><p style={{color:T.muted,fontSize:12}}>{prop.type}·{prop.beds} camas</p></div>
                <span className={`badge ${occ>=80?"bg":occ>=50?"bgold":"br"}`}>{occ}%</span>
              </div>
              {/* Photos */}
              {prop.photos?.length>0&&(
                <button onClick={()=>setGallery({photos:prop.photos,title:`Fotos — Apt ${prop.apt}`})} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",color:T.accent,fontSize:12,cursor:"pointer",textAlign:"left"}}>📷 {prop.photos.length} foto(s) — Ver galería</button>
              )}
              <div style={{height:4,background:T.border,borderRadius:2}}><div style={{height:4,background:occ>=80?T.green:T.gold,borderRadius:2,width:`${occ}%`}}/></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:T.muted}}>Esperada</span><span className="mono" style={{color:T.accent}}>{fmt(prop.expectedRent)}</span></div>
              {pts.map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderBottom:`1px solid ${T.border}15`}}><span>🛏 {t.bed}—{t.name}</span><span className="mono" style={{color:T.green}}>{fmt(t.rent)}</span></div>)}
              {Array(Math.max(0,prop.beds-pts.length)).fill(0).map((_,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",color:T.muted}}><span>🛏 Disponible</span><span className="badge bg" style={{fontSize:10}}>Libre</span></div>)}
              {prop.parking&&<div style={{background:T.accent+"10",borderRadius:8,padding:"5px 8px",fontSize:12}}>🚗 {prop.parkingTenant||"Sin asignar"}·{fmt(prop.parkingAmt)}/mes</div>}
              {prop.hallwayNotes&&<div style={{background:T.orange+"10",borderRadius:8,padding:"5px 8px",fontSize:12,color:T.orange}}>📦 {prop.hallwayNotes}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:11,color:T.muted}}><span>Rep: {prop.lastRepair||"—"}</span><span>Pintura: {prop.lastPaint||"—"}</span></div>
              <div style={{display:"flex",gap:6}}><Btn size="sm" v="ghost" onClick={()=>{setForm({...prop,photos:prop.photos||[]});setModal("form")}}>✏</Btn><Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setProperties(p=>p.filter(x=>x.id!==prop.id))}}>🗑</Btn></div>
            </Card>
          );
        })}
      </div>
      {modal==="form"&&(
        <Modal title={form.id?"Editar":"Nueva Propiedad"} onClose={()=>setModal(null)} width={640}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <Field label="Edificio"><select value={form.building} onChange={F("building")}>{BUILDINGS.map(b=><option key={b}>{b}</option>)}</select></Field>
            <Field label="Apartamento"><input value={form.apt} onChange={F("apt")}/></Field>
            <Field label="Tipo"><select value={form.type} onChange={F("type")}>{["Compartido","Privado","Mixto","Master"].map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Habitaciones"><input type="number" value={form.bedrooms} onChange={F("bedrooms")}/></Field>
            <Field label="Total Camas"><input type="number" value={form.beds} onChange={F("beds")}/></Field>
            <Field label="Renta Esperada"><input type="number" value={form.expectedRent} onChange={F("expectedRent")}/></Field>
            <Field label="¿Parqueo?" col={2}><select value={form.parking?"Sí":"No"} onChange={e=>setForm(p=>({...p,parking:e.target.value==="Sí"}))}><option>No</option><option>Sí</option></select></Field>
            {form.parking&&<><Field label="Inquilino Parqueo"><input value={form.parkingTenant} onChange={F("parkingTenant")}/></Field><Field label="Monto"><input type="number" value={form.parkingAmt} onChange={F("parkingAmt")}/></Field><Field label="Sticker"><input value={form.parkingSticker} onChange={F("parkingSticker")}/></Field><Field label="Control"><input value={form.parkingRemote} onChange={F("parkingRemote")}/></Field></>}
            <Field label="Última Reparación"><input type="date" value={form.lastRepair} onChange={F("lastRepair")}/></Field>
            <Field label="Última Pintura"><input type="date" value={form.lastPaint} onChange={F("lastPaint")}/></Field>
            <Field label="Limpieza Alfombra"><input type="date" value={form.carpetCleaning} onChange={F("carpetCleaning")}/></Field>
            <Field label="Reemplazo Cortina"><input type="date" value={form.curtainReplacement} onChange={F("curtainReplacement")}/></Field>
            <Field label="Notas Pasillo" col={2}><textarea value={form.hallwayNotes} onChange={F("hallwayNotes")}/></Field>
            <Field label="📷 Fotos del Apartamento" col={2}>
              <PhotoUpload photos={form.photos||[]} onChange={v=>setForm(p=>({...p,photos:v}))} label="Fotos generales del apartamento"/>
            </Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div>
        </Modal>
      )}
      {gallery&&<PhotoGallery photos={gallery.photos} title={gallery.title} onClose={()=>setGallery(null)}/>}
    </div>
  );
}

// ─── SIMPLE REMAINING MODULES ─────────────────────────────────────────────────
function PettyCashModule({pettyCash,setPettyCash}){
  const [modal,setModal]=useState(null);
  const E={id:null,date:today(),type:"Ingreso",concept:"",amount:""};
  const [form,setForm]=useState(E);
  const balance=pettyCash.reduce((s,p)=>p.type==="Ingreso"?s+p.amount:s-p.amount,0);
  const save=()=>{if(!form.concept||!form.amount)return;setPettyCash(p=>[...p,{...form,id:Date.now(),amount:+form.amount}]);setModal(null);};
  const days=[...new Set(pettyCash.map(p=>p.date))].sort().reverse();
  const dailyBal=d=>pettyCash.filter(p=>p.date<=d).reduce((s,p)=>p.type==="Ingreso"?s+p.amount:s-p.amount,0);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="💵 Caja Chica" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Movimiento</Btn>}/>
      <Card style={{background:`linear-gradient(135deg,${T.gold}12,${T.card})`,border:`1px solid ${T.gold}30`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
        <div><p style={{fontSize:12,color:T.muted,marginBottom:4}}>SALDO DISPONIBLE</p><p className="mono" style={{fontSize:38,fontWeight:800,color:balance>=0?T.gold:T.red}}>{fmt(balance)}</p></div>
        <div style={{display:"flex",gap:20}}>
          <div style={{textAlign:"center"}}><p style={{fontSize:11,color:T.muted}}>INGRESOS</p><p className="mono" style={{color:T.green,fontWeight:700,fontSize:18}}>{fmt(pettyCash.filter(p=>p.type==="Ingreso").reduce((s,p)=>s+p.amount,0))}</p></div>
          <div style={{textAlign:"center"}}><p style={{fontSize:11,color:T.muted}}>EGRESOS</p><p className="mono" style={{color:T.red,fontWeight:700,fontSize:18}}>{fmt(pettyCash.filter(p=>p.type==="Egreso").reduce((s,p)=>s+p.amount,0))}</p></div>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10}}>
        {days.slice(0,6).map(d=><Card key={d} style={{padding:12}}><p style={{fontSize:11,color:T.muted,marginBottom:3}}>{d}</p><p className="mono" style={{fontWeight:700,color:dailyBal(d)>=0?T.gold:T.red,fontSize:15}}>{fmt(dailyBal(d))}</p><p style={{fontSize:11,color:T.muted,marginTop:3}}>{pettyCash.filter(p=>p.date===d).length} mov.</p></Card>)}
      </div>
      <Card style={{padding:0}}>
        <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Monto</th></tr></thead>
        <tbody>{[...pettyCash].reverse().map(p=><tr key={p.id}><td style={{color:T.muted,fontSize:12}}>{p.date}</td><td>{p.concept}</td><td><span className={`badge ${p.type==="Ingreso"?"bg":"br"}`}>{p.type==="Ingreso"?"↑":"↓"} {p.type}</span></td><td className="mono" style={{color:p.type==="Ingreso"?T.green:T.red,fontWeight:700}}>{p.type==="Egreso"?"-":"+"}{fmt(p.amount)}</td></tr>)}</tbody>
        </table>
      </Card>
      {modal==="form"&&<Modal title="Nuevo Movimiento" onClose={()=>setModal(null)} width={400}><div style={{display:"flex",flexDirection:"column",gap:13}}><Field label="Fecha"><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></Field><Field label="Tipo"><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}><option>Ingreso</option><option>Egreso</option></select></Field><Field label="Concepto"><input value={form.concept} onChange={e=>setForm(p=>({...p,concept:e.target.value}))}/></Field><Field label="Monto"><input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></Field></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾</Btn></div></Modal>}
    </div>
  );
}

function MaintenanceModule({maintenance,setMaintenance,setExpenses}){
  const [modal,setModal]=useState(null);
  const E={id:null,apt:"",building:BUILDINGS[0],description:"",status:"Pendiente",technician:"",scheduledDate:"",materialCost:0,laborCost:0,notes:""};
  const [form,setForm]=useState(E);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=()=>{if(!form.description)return;if(form.id)setMaintenance(p=>p.map(x=>x.id===form.id?{...form}:x));else setMaintenance(p=>[...p,{...form,id:Date.now(),materialCost:+form.materialCost,laborCost:+form.laborCost}]);setModal(null);};
  const complete=item=>{setMaintenance(p=>p.map(x=>x.id===item.id?{...x,status:"Completado"}:x));if(item.materialCost+item.laborCost>0)setExpenses(p=>[...p,{id:Date.now(),date:today(),type:"Reparaciones",category:"Fijo",building:item.building,apt:item.apt,supplier:item.technician||"Técnico",method:"Cash",amount:item.materialCost+item.laborCost,description:`Mant: ${item.description}`,isPending:false,dueDate:""}]);};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}} className="anim">
      <SectionHeader title="🔧 Mantenimiento" action={<Btn onClick={()=>{setForm(E);setModal("form")}}>+ Incidente</Btn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:13}}><StatCard label="Pendientes" value={maintenance.filter(m=>m.status==="Pendiente").length} color={T.red} icon="🔴"/><StatCard label="En Proceso" value={maintenance.filter(m=>m.status==="En Proceso").length} color={T.orange} icon="🟡"/><StatCard label="Completados" value={maintenance.filter(m=>m.status==="Completado").length} color={T.green} icon="✅"/></div>
      {maintenance.map(item=>(
        <Card key={item.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><span className={`badge ${item.status==="Completado"?"bg":item.status==="En Proceso"?"bo":"br"}`}>{item.status}</span><span style={{fontWeight:700}}>{item.building}—Apt {item.apt}</span></div>
              <p style={{fontSize:13,marginBottom:4}}>{item.description}</p>
              {item.technician&&<p style={{fontSize:12,color:T.muted}}>👷 {item.technician}{item.scheduledDate?`·${item.scheduledDate}`:""}</p>}
              {item.notes&&<p style={{fontSize:12,color:T.muted,marginTop:3}}>📝 {item.notes}</p>}
              {(item.materialCost+item.laborCost)>0&&<p style={{fontSize:12,marginTop:6}}>Mat: <span className="mono" style={{color:T.orange}}>{fmt(item.materialCost)}</span>·MO: <span className="mono" style={{color:T.orange}}>{fmt(item.laborCost)}</span>·<strong>Total: <span className="mono" style={{color:T.red}}>{fmt(item.materialCost+item.laborCost)}</span></strong></p>}
            </div>
            <div style={{display:"flex",gap:6}}><Btn size="sm" v="ghost" onClick={()=>{setForm(item);setModal("form")}}>✏</Btn>{item.status!=="Completado"&&<Btn size="sm" v="success" onClick={()=>complete(item)}>✓</Btn>}<Btn size="sm" v="danger" onClick={()=>{if(confirm("¿Eliminar?"))setMaintenance(p=>p.filter(x=>x.id!==item.id))}}>🗑</Btn></div>
          </div>
        </Card>
      ))}
      {modal==="form"&&<Modal title={form.id?"Editar":"Nuevo Incidente"} onClose={()=>setModal(null)} width={540}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}><Field label="Edificio"><select value={form.building} onChange={F("building")}>{BUILDINGS.map(b=><option key={b}>{b}</option>)}</select></Field><Field label="Apt"><input value={form.apt} onChange={F("apt")}/></Field><Field label="Descripción" col={2}><textarea value={form.description} onChange={F("description")}/></Field><Field label="Estado"><select value={form.status} onChange={F("status")}>{["Pendiente","En Proceso","Completado"].map(s=><option key={s}>{s}</option>)}</select></Field><Field label="Técnico"><input value={form.technician} onChange={F("technician")}/></Field><Field label="Fecha"><input type="date" value={form.scheduledDate} onChange={F("scheduledDate")}/></Field><Field label="Costo Materiales"><input type="number" value={form.materialCost} onChange={F("materialCost")}/></Field><Field label="Mano de Obra"><input type="number" value={form.laborCost} onChange={F("laborCost")}/></Field><Field label="Notas" col={2}><textarea value={form.notes} onChange={F("notes")}/></Field></div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}><Btn v="muted" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>💾 Guardar</Btn></div></Modal>}
    </div>
  );
}

function ReportsModule({tenants,payments,expenses,pettyCash,maintenance,month}){
  const [my,mm]=month.split("-").map(Number);
  const totalIncome=payments.reduce((s,p)=>s+p.total,0);
  const totalExp=expenses.filter(e=>!e.isPending).reduce((s,e)=>s+e.amount,0);
  const net=totalIncome-totalExp;
  const cash=pettyCash.reduce((s,p)=>p.type==="Ingreso"?s+p.amount:s-p.amount,0);
  const byBuilding={};
  payments.forEach(p=>{const t=tenants.find(t=>t.id===p.tenantId);if(!t)return;if(!byBuilding[t.building])byBuilding[t.building]={income:0};byBuilding[t.building].income+=p.total;});
  const topDebtors=[...tenants].filter(t=>t.balance>0).sort((a,b)=>b.balance-a.balance);
  const exportCSV=(rows,fn)=>{if(!rows.length)return;const k=Object.keys(rows[0]);const csv=[k.join(","),...rows.map(r=>k.map(k=>`"${r[k]??""}`).join(","))].join("\n");const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=fn+".csv";a.click();};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim">
      <SectionHeader title="📊 Reportes" action={<div style={{display:"flex",gap:8}}><Btn v="ghost" onClick={()=>exportCSV([{ingresos:totalIncome,gastos:totalExp,neto:net,caja:cash}],`reporte_${month}`)}>⬇ CSV</Btn><Btn v="ghost" onClick={()=>{const a=document.createElement("a");a.href="data:application/json,"+encodeURIComponent(JSON.stringify({tenants,payments,expenses,pettyCash},null,2));a.download=`backup_${month}.json`;a.click()}}>💾 Backup</Btn></div>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:13}}><StatCard label="Ingresos Totales" value={fmt(totalIncome)} color={T.green} icon="📈"/><StatCard label="Gastos Totales" value={fmt(totalExp)} color={T.orange} icon="📉"/><StatCard label="Ganancia Neta" value={fmt(net)} color={net>=0?T.green:T.red} icon="💎"/><StatCard label="Caja Chica" value={fmt(cash)} color={T.gold} icon="💵"/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card><h3 style={{fontSize:14,fontWeight:700,marginBottom:14,color:T.accent}}>💰 Por Edificio</h3>{Object.entries(byBuilding).map(([b,v])=>{const bExp=expenses.filter(e=>e.building===b&&!e.isPending).reduce((s,e)=>s+e.amount,0);const bNet=v.income-bExp;return(<div key={b} style={{padding:"10px 0",borderBottom:`1px solid ${T.border}30`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:600}}>{b}</span><span className="mono" style={{color:T.green}}>{fmt(v.income)}</span></div><div style={{display:"flex",gap:16,fontSize:12,color:T.muted}}><span>Gastos: <span className="mono" style={{color:T.orange}}>{fmt(bExp)}</span></span><span>Neto: <span className="mono" style={{color:bNet>=0?T.green:T.red}}>{fmt(bNet)}</span></span></div></div>);})}</Card>
        <Card><h3 style={{fontSize:14,fontWeight:700,marginBottom:14,color:T.red}}>⚠ Deudores</h3>{topDebtors.length===0?<p style={{color:T.green,fontSize:13}}>✓ Sin deudores</p>:topDebtors.map((t,i)=>(<div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}30`,alignItems:"center"}}><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:16,color:T.muted}}>#{i+1}</span><div><p style={{fontSize:12,fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:T.muted}}>{t.building}·{t.apt}</p></div></div><span className="mono badge br">{fmt(t.balance)}</span></div>))}</Card>
      </div>
      <Card><h3 style={{fontSize:14,fontWeight:700,marginBottom:14,color:T.gold}}>📊 Por Tipo de Gasto</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>{[...new Set(expenses.map(e=>e.type))].map(type=>{const total=expenses.filter(e=>e.type===type&&!e.isPending).reduce((s,e)=>s+e.amount,0);return(<div key={type} style={{background:T.bg,borderRadius:10,padding:"8px 12px"}}><p style={{fontSize:11,color:T.muted,marginBottom:3}}>{type}</p><p className="mono" style={{fontSize:16,fontWeight:700,color:T.orange}}>{fmt(total)}</p></div>);})}</div></Card>
    </div>
  );
}

function MessagesModule({tenants}){
  const templates=[{id:1,name:"Recordatorio Preventivo",icon:"📅",preview:t=>`Hola ${t.name}, tu pago de ${fmt(t.rent)} vence pronto. Por favor realiza tu pago a tiempo. ¡Gracias!`},{id:2,name:"Notificación Atraso",icon:"⚠",preview:t=>`Hola ${t.name}, tu renta está vencida. Saldo: ${fmt(t.balance)}. Contáctanos hoy.`},{id:3,name:"Confirmación de Pago",icon:"✅",preview:t=>`Hola ${t.name}, confirmamos tu pago. Saldo: ${fmt(t.balance)}. ¡Gracias!`},{id:4,name:"Check-In",icon:"🔑",preview:t=>`Hola ${t.name}, bienvenido/a a ${t.building}, Apt ${t.apt}. Adjunto reglas y acceso. ¡Bienvenido/a!`},{id:5,name:"Cuota Depósito",icon:"🔐",preview:t=>`Hola ${t.name}, tienes depósito pendiente de ${fmt(t.deposit-t.depositPaid)}. Por favor realiza el pago.`}];
  const [sel,setSel]=useState(1);const [tenant,setTenant]=useState(tenants[0]?.id||"");
  const s=templates.find(t=>t.id===sel);const ten=tenants.find(t=>t.id===+tenant)||tenants[0];
  return(<div style={{display:"flex",flexDirection:"column",gap:14}} className="anim"><h2 style={{fontSize:19,fontWeight:700}}>📲 Mensajes Automáticos</h2><div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:14}}><div style={{display:"flex",flexDirection:"column",gap:6}}>{templates.map(t=><button key={t.id} onClick={()=>setSel(t.id)} style={{textAlign:"left",padding:"10px 14px",borderRadius:10,border:`1px solid ${sel===t.id?T.accent:T.border}`,background:sel===t.id?T.accent+"15":T.card,cursor:"pointer",color:T.text}}><p style={{fontWeight:600,fontSize:13}}>{t.icon} {t.name}</p></button>)}</div><Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}><p style={{fontWeight:700}}>{s?.icon} {s?.name}</p><Field label="Para:"><select value={tenant} onChange={e=>setTenant(e.target.value)} style={{width:"auto"}}>{tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field></div><div style={{background:T.bg,borderRadius:12,padding:14,fontSize:13,lineHeight:1.8,border:`1px solid ${T.border}`}}>{ten?s?.preview(ten):""}</div><div style={{display:"flex",gap:8,marginTop:12}}><Btn v="success" onClick={()=>{if(ten){navigator.clipboard?.writeText(s?.preview(ten));alert("Copiado")};}}>📋 Copiar</Btn><Btn v="ghost" onClick={()=>alert("Requiere WhatsApp Business API")}>📲 Enviar Masivo</Btn></div></Card></div></div>);
}

function RolesModule(){
  const roles=[{name:"Administrador",icon:"👑",color:T.gold,access:"Acceso total. Ganancias globales, eliminar registros, gestionar usuarios.",restricted:"Sin restricciones"},{name:"Manager",icon:"👔",color:T.accent,access:"Inquilinos, pagos, disponibilidad, asignar camas, gastos diarios.",restricted:"Sin ganancias netas ni saldos bancarios"},{name:"Contabilidad",icon:"🧮",color:T.green,access:"Pagos, gastos, caja chica, cheques, depósitos, reportes.",restricted:"Sin módulos operativos"},{name:"Asistente Virtual",icon:"🤖",color:T.purple,access:"Disponibilidad, inquilinos básico, WhatsApp, calendario.",restricted:"Sin datos financieros"},{name:"Equipo Limpieza",icon:"🧹",color:T.pink,access:"Solo su agenda de tareas asignadas.",restricted:"Sin contactos ni finanzas"}];
  return(<div style={{display:"flex",flexDirection:"column",gap:14}} className="anim"><h2 style={{fontSize:19,fontWeight:700}}>🔑 Roles & Permisos</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>{roles.map(r=><Card key={r.name}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><span style={{fontSize:22}}>{r.icon}</span><span style={{fontWeight:700,fontSize:15,color:r.color}}>{r.name}</span></div><div style={{marginBottom:10}}><p style={{fontSize:11,fontWeight:700,color:T.green,marginBottom:3,textTransform:"uppercase"}}>✓ Acceso</p><p style={{fontSize:12,lineHeight:1.6}}>{r.access}</p></div><div style={{background:T.red+"10",borderRadius:8,padding:"7px 10px"}}><p style={{fontSize:11,fontWeight:700,color:T.red,marginBottom:2}}>✗ Restringido</p><p style={{fontSize:12,color:T.muted}}>{r.restricted}</p></div></Card>)}</div></div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════════════════════════════════════════════
function GlobalSearch({tenants,payments,expenses,tasks,onNavigate}){
  const [q,setQ]=useState("");const [open,setOpen]=useState(false);const ref=useRef();
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const results=q.length<2?[]:[
    ...tenants.filter(t=>t.name.toLowerCase().includes(q.toLowerCase())||t.apt.includes(q)||t.phone.includes(q)).slice(0,4).map(t=>({type:"Inquilino",label:t.name,sub:`${t.building} Apt ${t.apt}·${fmt(t.balance)} pend.`,tab:"tenants",color:T.accent})),
    ...payments.filter(p=>{const t=tenants.find(x=>x.id===p.tenantId);return t?.name.toLowerCase().includes(q.toLowerCase());}).slice(0,3).map(p=>{const t=tenants.find(x=>x.id===p.tenantId);return{type:"Pago",label:`${t?.name}—${fmt(p.total)}`,sub:`${p.date}·${p.method}`,tab:"payments",color:T.green};}),
    ...expenses.filter(e=>e.description.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(e=>({type:"Gasto",label:e.description,sub:`${e.date}·${fmt(e.amount)}`,tab:"expenses",color:T.orange})),
    ...tasks.filter(t=>t.title.toLowerCase().includes(q.toLowerCase())).slice(0,2).map(t=>({type:"Tarea",label:t.title,sub:`${t.date}·${t.priority}`,tab:"tasks",color:T.purple})),
  ];
  return(
    <div ref={ref} style={{position:"relative",flex:1,maxWidth:320}}>
      <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} placeholder="🔍 Buscar..." onFocus={()=>setOpen(true)} style={{paddingLeft:14}}/>
      {open&&results.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:T.surf,border:`1px solid ${T.border}`,borderRadius:10,zIndex:500,overflow:"hidden"}}>
          {results.map((r,i)=>(
            <div key={i} onClick={()=>{onNavigate(r.tab);setQ("");setOpen(false);}} style={{padding:"9px 14px",cursor:"pointer",borderBottom:`1px solid ${T.border}20`,display:"flex",gap:10,alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background=T.border+"30"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:r.color+"20",color:r.color,fontWeight:700}}>{r.type}</span>
              <div><p style={{fontSize:13,fontWeight:600}}>{r.label}</p><p style={{fontSize:11,color:T.muted}}>{r.sub}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
const TABS=[
  {id:"dashboard",label:"Dashboard",icon:"⚡"},
  {id:"properties",label:"Propiedades",icon:"🏢"},
  {id:"tenants",label:"Inquilinos",icon:"👥"},
  {id:"payments",label:"Pagos",icon:"💳"},
  {id:"late",label:"Cobranza",icon:"⚠"},
  {id:"availability",label:"Disponibilidad",icon:"📌"},
  {id:"expenses",label:"Gastos",icon:"📤"},
  {id:"pettycash",label:"Caja Chica",icon:"💵"},
  {id:"deposits",label:"Depósitos",icon:"🔐"},
  {id:"maintenance",label:"Mantenimiento",icon:"🔧"},
  {id:"inventory",label:"Inventario",icon:"📦"},
  {id:"cleaning",label:"Limpieza",icon:"🧹"},
  {id:"tasks",label:"Tareas",icon:"✅"},
  {id:"messages",label:"Mensajes",icon:"📲"},
  {id:"roles",label:"Roles",icon:"🔑"},
  {id:"reports",label:"Reportes",icon:"📊"},
];

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [open,setOpen]=useState(true);
  const [month,setMonth]=useState(today().slice(0,7));
  const [toast,setToast]=useState(null);

  const [tenants,setTenants]=usePersist("tenants3",SEED.tenants);
  const [payments,setPayments]=usePersist("payments3",SEED.payments);
  const [expenses,setExpenses]=usePersist("expenses3",SEED.expenses);
  const [pettyCash,setPettyCash]=usePersist("pettyCash3",SEED.pettyCash);
  const [properties,setProperties]=usePersist("properties3",SEED.properties);
  const [maintenance,setMaintenance]=usePersist("maintenance3",SEED.maintenance);
  const [inventory,setInventory]=usePersist("inventory3",SEED.inventory);
  const [cleaningSchedule,setCleaningSchedule]=usePersist("cleanSched3",SEED.cleaningSchedule);
  const [cleaningFees,setCleaningFees]=usePersist("cleanFees3",SEED.cleaningFees);
  const [promises,setPromises]=usePersist("promises3",SEED.promises);
  const [availability,setAvailability]=usePersist("avail3",SEED.availability);
  const [tasks,setTasks]=usePersist("tasks3",SEED.tasks);

  const morososCount=tenants.filter(t=>t.balance>0).length;
  const pendingMaint=maintenance.filter(m=>m.status==="Pendiente").length;
  const pendingTasks=tasks.filter(t=>t.status==="Pendiente").length;

  return(
    <>
      <style>{CSS}</style>
      <div style={{display:"flex",minHeight:"100vh",background:T.bg}}>
        {/* Sidebar */}
        <aside style={{width:open?210:58,background:T.surf,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,transition:"width .2s",overflow:"hidden"}}>
          <div style={{padding:"14px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:52}}>
            {open&&<span style={{fontWeight:800,fontSize:14,color:T.accent,whiteSpace:"nowrap"}}>RentFlow Miami</span>}
            <button onClick={()=>setOpen(p=>!p)} style={{background:"none",border:"none",color:T.muted,fontSize:18,cursor:"pointer",flexShrink:0}}>☰</button>
          </div>
          <nav style={{flex:1,padding:"10px 6px",display:"flex",flexDirection:"column",gap:1,overflowY:"auto"}}>
            {TABS.map(t=>{
              const badge=t.id==="late"?morososCount:t.id==="maintenance"?pendingMaint:t.id==="tasks"?pendingTasks:0;
              return(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:8,border:"none",background:tab===t.id?T.accent+"20":"transparent",color:tab===t.id?T.accent:T.muted,fontWeight:tab===t.id?700:400,fontSize:12,textAlign:"left",justifyContent:open?"flex-start":"center",whiteSpace:"nowrap",cursor:"pointer",position:"relative"}}>
                  <span style={{fontSize:14,flexShrink:0}}>{t.icon}</span>
                  {open&&<span style={{flex:1}}>{t.label}</span>}
                  {open&&badge>0&&<span style={{background:T.red,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{badge}</span>}
                  {!open&&badge>0&&<span style={{position:"absolute",top:4,right:4,width:7,height:7,background:T.red,borderRadius:"50%"}}/>}
                </button>
              );
            })}
          </nav>
          {open&&<div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`}}><button onClick={()=>{if(confirm("¿Reset datos?")){"tenants3 payments3 expenses3 pettyCash3 properties3 maintenance3 inventory3 cleanSched3 cleanFees3 promises3 avail3 tasks3".split(" ").forEach(k=>localStorage.removeItem("rf3_"+k));window.location.reload();}}} style={{background:"none",border:"none",color:T.muted,fontSize:11,cursor:"pointer",width:"100%",textAlign:"left"}}>🔄 Reset demo</button><p style={{fontSize:10,color:T.muted,marginTop:3}}>v3.0 · Auto-guardado ✓</p></div>}
        </aside>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <div style={{background:T.surf,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <GlobalSearch tenants={tenants} payments={payments} expenses={expenses} tasks={tasks} onNavigate={setTab}/>
            <MonthPicker value={month} onChange={setMonth}/>
          </div>
          <main style={{flex:1,padding:22,overflowY:"auto",overflowX:"hidden"}}>
            {tab==="dashboard"&&<Dashboard tenants={tenants} payments={payments} expenses={expenses} pettyCash={pettyCash} maintenance={maintenance} cleaningSchedule={cleaningSchedule} promises={promises} month={month} onNavigate={setTab} properties={properties}/>}
            {tab==="properties"&&<PropertiesModule properties={properties} setProperties={setProperties} tenants={tenants}/>}
            {tab==="tenants"&&<TenantsModule tenants={tenants} setTenants={setTenants} availability={availability} setAvailability={setAvailability} setCleaningOrders={setCleaningSchedule} onToast={setToast}/>}
            {tab==="payments"&&<PaymentsModule tenants={tenants} setTenants={setTenants} payments={payments} setPayments={setPayments} onToast={setToast}/>}
            {tab==="late"&&<LatePaymentsModule tenants={tenants} setTenants={setTenants} promises={promises} setPromises={setPromises}/>}
            {tab==="availability"&&<AvailabilityModule availability={availability} setAvailability={setAvailability}/>}
            {tab==="expenses"&&<ExpensesModule expenses={expenses} setExpenses={setExpenses}/>}
            {tab==="pettycash"&&<PettyCashModule pettyCash={pettyCash} setPettyCash={setPettyCash}/>}
            {tab==="deposits"&&<DepositsModule tenants={tenants} setTenants={setTenants}/>}
            {tab==="maintenance"&&<MaintenanceModule maintenance={maintenance} setMaintenance={setMaintenance} setExpenses={setExpenses}/>}
            {tab==="inventory"&&<InventoryModule inventory={inventory} setInventory={setInventory} properties={properties}/>}
            {tab==="cleaning"&&<CleaningModule cleaningSchedule={cleaningSchedule} setCleaningSchedule={setCleaningSchedule} cleaningFees={cleaningFees} setCleaningFees={setCleaningFees} tenants={tenants} properties={properties}/>}
            {tab==="tasks"&&<TasksModule tasks={tasks} setTasks={setTasks}/>}
            {tab==="messages"&&<MessagesModule tenants={tenants}/>}
            {tab==="roles"&&<RolesModule/>}
            {tab==="reports"&&<ReportsModule tenants={tenants} payments={payments} expenses={expenses} pettyCash={pettyCash} maintenance={maintenance} month={month}/>}
          </main>
        </div>
      </div>
      {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}
    </>
  );
}
