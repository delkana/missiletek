import * as BABYLON from "@babylonjs/core/Legacy/legacy";
import "./style.css";

type Trajectory = "standard" | "high" | "depressed";
type Kind = "warhead" | "decoy";

type Missile = {
  id:number; kind:Kind; mesh:BABYLON.Mesh; start:BABYLON.Vector3; target:BABYLON.Vector3;
  launchAt:number; duration:number; arc:number; alive:boolean; detected:boolean; pdDwell:number; smokeClock:number;
};
type Interceptor = { id:number; mesh:BABYLON.Mesh; targetId:number; speed:number; alive:boolean; smokeClock:number };

const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas")!;
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.035,0.075,0.11,1);
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.0045;
scene.fogColor = new BABYLON.Color3(0.20,0.30,0.38);

const camera = new BABYLON.ArcRotateCamera("camera",-Math.PI/2,1.12,165,new BABYLON.Vector3(0,8,0),scene);
camera.lowerRadiusLimit=42; camera.upperRadiusLimit=240; camera.lowerBetaLimit=.28; camera.upperBetaLimit=1.45;
camera.wheelPrecision=5; camera.panningSensibility=75; camera.attachControl(canvas,true);

const hemi = new BABYLON.HemisphericLight("hemi",new BABYLON.Vector3(0,1,0),scene); hemi.intensity=.55;
const sun = new BABYLON.DirectionalLight("sun",new BABYLON.Vector3(-.55,-1,.35),scene); sun.position.set(70,100,-50); sun.intensity=1.35;
const glow = new BABYLON.GlowLayer("glow",scene,{blurKernelSize:32}); glow.intensity=.55;

function mat(name:string,c:BABYLON.Color3,e?:BABYLON.Color3){const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=c;m.specularColor.set(.12,.12,.12);if(e)m.emissiveColor=e;return m;}
const waterMat=mat("water",new BABYLON.Color3(.045,.16,.22)); waterMat.alpha=.94;
const rockMat=mat("rock",new BABYLON.Color3(.22,.24,.20));
const grassMat=mat("grass",new BABYLON.Color3(.18,.31,.16));
const metalMat=mat("metal",new BABYLON.Color3(.23,.28,.31));
const darkMat=mat("dark",new BABYLON.Color3(.09,.12,.14));
const radarMat=mat("radar",new BABYLON.Color3(.32,.37,.39));
const glowMat=mat("tech",new BABYLON.Color3(.15,.25,.31),new BABYLON.Color3(.08,.20,.28));
const hostileMat=mat("hostile",new BABYLON.Color3(.44,.43,.40),new BABYLON.Color3(.24,.055,.02));
const decoyMat=mat("decoy",new BABYLON.Color3(.34,.34,.34),new BABYLON.Color3(.10,.055,.015));
const samMat=mat("sam",new BABYLON.Color3(.8,.85,.86),new BABYLON.Color3(.09,.12,.12));

const water=BABYLON.MeshBuilder.CreateGround("water",{width:240,height:150},scene); water.position.y=-1.8; water.material=waterMat;
function island(name:string,x:number,r:number,seed:number){
  const root=new BABYLON.TransformNode(name,scene);
  const rock=BABYLON.MeshBuilder.CreateCylinder(name+"-rock",{diameterTop:r*1.86,diameterBottom:r*2.18,height:5,tessellation:18},scene); rock.position.set(x,0,0); rock.material=rockMat; rock.parent=root;
  const top=BABYLON.MeshBuilder.CreateCylinder(name+"-top",{diameter:r*1.82,height:.65,tessellation:18},scene); top.position.set(x,2.7,0); top.material=grassMat; top.parent=root;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2+seed, rr=r*(.35+((i*37+seed*100)%41)/100); const trunk=BABYLON.MeshBuilder.CreateCylinder(name+"-tree-"+i,{height:2.8,diameterTop:.1,diameterBottom:.35,tessellation:6},scene); trunk.position.set(x+Math.cos(a)*rr,4.15,Math.sin(a)*rr); trunk.material=darkMat; trunk.parent=root; const crown=BABYLON.MeshBuilder.CreateCylinder(name+"-crown-"+i,{height:3.5,diameterTop:.1,diameterBottom:2.2,tessellation:8},scene); crown.position.set(trunk.position.x,6.5,trunk.position.z); crown.material=grassMat; crown.parent=root;}
}
island("launch-island",-53,25,.2); island("target-island",53,30,1.1);

const launchOrigin=new BABYLON.Vector3(-55,7.2,2), targetPoint=new BABYLON.Vector3(55,4.8,-1), samOrigin=new BABYLON.Vector3(47,6,10);
const pdA=new BABYLON.Vector3(59,5.4,8), pdB=new BABYLON.Vector3(60,5.4,-8);

const silo=BABYLON.MeshBuilder.CreateCylinder("silo",{diameter:8,height:2.4,tessellation:20},scene); silo.position.set(-55,4.1,2); silo.material=metalMat;
const door=BABYLON.MeshBuilder.CreateCylinder("silo-door",{diameter:5.3,height:.35,tessellation:20},scene); door.position.set(-55,5.45,2); door.material=glowMat;
for(let i=0;i<4;i++){const b=BABYLON.MeshBuilder.CreateBox("launch-building-"+i,{width:6+i,height:3.2+i*.2,depth:5.5},scene); b.position.set(-68+(i%2)*15,4.7,-10+Math.floor(i/2)*19); b.material=darkMat;}
for(let i=0;i<6;i++){const b=BABYLON.MeshBuilder.CreateBox("target-building-"+i,{width:7+(i%3)*1.4,height:4+(i%2)*2.5,depth:6.5},scene); b.position.set(45+(i%3)*9,5.8,-8+Math.floor(i/3)*15); b.material=i===1?glowMat:metalMat;}
const mast=BABYLON.MeshBuilder.CreateCylinder("radar-mast",{height:9,diameter:.7,tessellation:8},scene); mast.position.set(63,8.2,1); mast.material=darkMat;
const dish=BABYLON.MeshBuilder.CreateTorus("radar-dish",{diameter:6,thickness:.7,tessellation:24},scene); dish.position.set(63,13,1); dish.rotation.x=Math.PI/2.7; dish.material=radarMat;
const samBase=BABYLON.MeshBuilder.CreateBox("sam-base",{width:6,height:1.5,depth:5},scene); samBase.position.set(47,3.9,10); samBase.material=darkMat;
for(let i=0;i<4;i++){const tube=BABYLON.MeshBuilder.CreateCylinder("sam-tube-"+i,{height:4.5,diameter:.55,tessellation:10},scene); tube.position.set(45.6+i*.9,6.1,10); tube.rotation.z=-.35; tube.material=metalMat;}
for(const [i,p] of [pdA,pdB].entries()){const base=BABYLON.MeshBuilder.CreateCylinder("pd-base-"+i,{diameter:4,height:1.3,tessellation:16},scene); base.position.set(p.x,4,p.z); base.material=darkMat; const barrel=BABYLON.MeshBuilder.CreateCylinder("pd-barrel-"+i,{height:3.5,diameter:.45,tessellation:8},scene); barrel.position.set(p.x,6.2,p.z); barrel.rotation.z=Math.PI/2; barrel.material=metalMat;}

const previewPts:BABYLON.Vector3[]=[]; for(let i=0;i<=50;i++){const t=i/50,p=BABYLON.Vector3.Lerp(launchOrigin,targetPoint,t);p.y+=38*4*t*(1-t);previewPts.push(p);} const preview=BABYLON.MeshBuilder.CreateDashedLines("trajectory-preview",{points:previewPts,dashSize:2,gapSize:1,dashNb:36},scene); preview.color.set(.22,.55,.72); preview.alpha=.26; preview.isPickable=false;

const missiles:Missile[]=[], interceptors:Interceptor[]=[];
let nextMissile=1,nextInterceptor=1,targetHealth=1000,samAmmo=4,lastSam=-100,lastFrame=performance.now()/1000,elapsed=0,current:Trajectory="standard",pdTracerClock=0;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const healthFill=$<HTMLDivElement>("healthFill"), healthText=$<HTMLDivElement>("healthText"), samAmmoEl=$<HTMLSpanElement>("samAmmo"), pdState=$<HTMLSpanElement>("pdState"), trackCount=$<HTMLSpanElement>("trackCount"), warning=$<HTMLDivElement>("warning"), logEl=$<HTMLDivElement>("combatLog"), status=$<HTMLDivElement>("status"), samToggle=$<HTMLInputElement>("samToggle"), pdToggle=$<HTMLInputElement>("pdToggle");

function log(msg:string){const row=document.createElement("div");row.className="log-row";const mm=Math.floor(elapsed/60).toString().padStart(2,"0"),ss=Math.floor(elapsed%60).toString().padStart(2,"0");row.innerHTML=`<span class="log-time">${mm}:${ss}</span>${msg}`;logEl.prepend(row);while(logEl.children.length>18)logEl.lastElementChild?.remove();}
function hud(){const hp=Math.max(0,targetHealth/1000)*100;healthFill.style.width=hp+"%";healthText.textContent=`${Math.max(0,targetHealth)} / 1000`;samAmmoEl.textContent=String(samAmmo);pdState.textContent=pdToggle.checked?"ONLINE":"OFFLINE";const tracks=missiles.filter(m=>m.alive&&m.detected).length;trackCount.textContent=String(tracks);warning.classList.toggle("show",tracks>0);status.textContent=targetHealth>0?"DEFENSE GRID ONLINE":"TARGET BASE DESTROYED";status.style.color=targetHealth>0?"#9fc6a5":"#e5a080";}
function params(t:Trajectory){return t==="high"?{arc:58,duration:9.4}:t==="depressed"?{arc:24,duration:6.3}:{arc:38,duration:7.8};}
function position(m:Missile,now:number){const t=BABYLON.Scalar.Clamp((now-m.launchAt)/m.duration,0,1),p=BABYLON.Vector3.Lerp(m.start,m.target,t);p.y+=m.arc*4*t*(1-t);return p;}
function trajectoryTangent(m:Missile,now:number){const t=BABYLON.Scalar.Clamp((now-m.launchAt)/m.duration,0,1),d=m.target.subtract(m.start);d.y+=m.arc*4*(1-2*t);return d;}
function alignYAxis(mesh:BABYLON.Mesh,direction:BABYLON.Vector3){if(direction.lengthSquared()<1e-8)return;const dir=direction.normalize(),localY=new BABYLON.Vector3(0,1,0),dot=BABYLON.Scalar.Clamp(BABYLON.Vector3.Dot(localY,dir),-1,1);if(dot>.999999){mesh.rotationQuaternion=BABYLON.Quaternion.Identity();return;}if(dot<-.999999){mesh.rotationQuaternion=BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1,0,0),Math.PI);return;}const axis=BABYLON.Vector3.Cross(localY,dir).normalize();mesh.rotationQuaternion=BABYLON.Quaternion.RotationAxis(axis,Math.acos(dot));}
function smoke(p:BABYLON.Vector3,friendly:boolean){const puff=BABYLON.MeshBuilder.CreateSphere("smoke",{diameter:friendly?.75:1.05,segments:4},scene),m=new BABYLON.StandardMaterial("smoke-mat",scene);puff.position.copyFrom(p);m.diffuseColor=friendly?new BABYLON.Color3(.56,.62,.65):new BABYLON.Color3(.38,.40,.40);m.alpha=.58;puff.material=m;puff.isPickable=false;const born=elapsed,obs=scene.onBeforeRenderObservable.add(()=>{const age=elapsed-born;puff.scaling.setAll(1+age*1.15);m.alpha=Math.max(0,.58*(1-age/1.8));puff.position.y+=engine.getDeltaTime()*.00045;if(age>1.8){scene.onBeforeRenderObservable.remove(obs);puff.dispose();m.dispose();}});}
function explosion(p:BABYLON.Vector3,size:number,intercept:boolean){const sphere=BABYLON.MeshBuilder.CreateSphere("explosion",{diameter:1.5,segments:8},scene),m=new BABYLON.StandardMaterial("explosion-mat",scene);sphere.position.copyFrom(p);m.diffuseColor=new BABYLON.Color3(1,.35,.06);m.emissiveColor=intercept?new BABYLON.Color3(.3,.65,.95):new BABYLON.Color3(1,.22,.02);sphere.material=m;const light=new BABYLON.PointLight("flash",p.clone(),scene);light.diffuse=intercept?new BABYLON.Color3(.45,.72,1):new BABYLON.Color3(1,.42,.12);light.intensity=18;light.range=30+size*2;const born=elapsed,obs=scene.onBeforeRenderObservable.add(()=>{const age=elapsed-born;sphere.scaling.setAll(1+size*Math.min(1,age/.24));m.alpha=Math.max(0,1-age/.65);light.intensity=Math.max(0,18*(1-age/.25));if(age>.7){scene.onBeforeRenderObservable.remove(obs);sphere.dispose();m.dispose();light.dispose();}});}
function createMissile(kind:Kind,delay=0,offset=0){const p=params(current),mesh=BABYLON.MeshBuilder.CreateCylinder("missile-"+nextMissile,{height:3.2,diameter:.72,tessellation:10},scene),target=targetPoint.clone();mesh.material=kind==="warhead"?hostileMat:decoyMat;mesh.position.copyFrom(launchOrigin);target.z+=offset;missiles.push({id:nextMissile++,kind,mesh,start:launchOrigin.clone(),target,launchAt:elapsed+delay,duration:p.duration*(1+Math.abs(offset)*.002),arc:p.arc,alive:true,detected:false,pdDwell:0,smokeClock:0});}
function launchSingle(){if(targetHealth<=0)return;createMissile("warhead");log(`MISSILE ${nextMissile-1} launched — ${current.toUpperCase()} trajectory.`);}
function launchSalvo(){if(targetHealth<=0)return;for(let i=0;i<6;i++)createMissile("warhead",i*.33,(i-2.5)*1.8);log("Six-missile saturation salvo launched.");}
function launchDecoys(){if(targetHealth<=0)return;(["decoy","decoy","warhead","decoy","warhead"] as Kind[]).forEach((k,i)=>createMissile(k,i*.28,(i-2)*2.1));log("Penetration package launched: 3 decoys + 2 live warheads.");}
function launchInterceptor(target:Missile){if(samAmmo<=0||!samToggle.checked)return;samAmmo--;lastSam=elapsed;const mesh=BABYLON.MeshBuilder.CreateCylinder("interceptor-"+nextInterceptor,{height:2.2,diameter:.42,tessellation:8},scene);mesh.position.copyFrom(samOrigin);mesh.material=samMat;interceptors.push({id:nextInterceptor++,mesh,targetId:target.id,speed:43,alive:true,smokeClock:0});log(`SAM launch — engaging TRACK ${target.id}${target.kind==="decoy"?" (unconfirmed)":""}.`);}
function destroy(m:Missile,p:BABYLON.Vector3,reason:"SAM"|"PD"){if(!m.alive)return;m.alive=false;m.mesh.dispose();explosion(p,reason==="SAM"?3.4:2.6,true);log(`${reason} intercept — TRACK ${m.id} destroyed${m.kind==="decoy"?"; target was DECOY.":"."}`);}
function impact(m:Missile){m.alive=false;m.mesh.dispose();if(m.kind==="decoy"){log(`TRACK ${m.id} resolved as decoy at terminal phase.`);return;}targetHealth=Math.max(0,targetHealth-250);explosion(m.target,7.5,false);log(`IMPACT — warhead ${m.id} struck target complex. Damage 250.`);if(targetHealth<=0)log("TARGET BASE DESTROYED.");}
function tracer(from:BABYLON.Vector3,to:BABYLON.Vector3){const end=to.add(new BABYLON.Vector3((Math.random()-.5)*1.5,(Math.random()-.5)*1.5,(Math.random()-.5)*1.5)),line=BABYLON.MeshBuilder.CreateLines("tracer",{points:[from,end]},scene);line.color.set(1,.72,.28);line.alpha=.95;const born=elapsed,obs=scene.onBeforeRenderObservable.add(()=>{const age=elapsed-born;line.alpha=Math.max(0,1-age/.11);if(age>.12){scene.onBeforeRenderObservable.remove(obs);line.dispose();}});}
function updateMissiles(dt:number){for(const m of missiles.filter(m=>m.alive)){if(elapsed<m.launchAt){m.mesh.setEnabled(false);continue;}m.mesh.setEnabled(true);const p=position(m,elapsed);m.mesh.position.copyFrom(p);alignYAxis(m.mesh,trajectoryTangent(m,elapsed));m.smokeClock+=dt;if(m.smokeClock>.085){m.smokeClock=0;smoke(p,false);}const progress=(elapsed-m.launchAt)/m.duration;if(!m.detected&&progress>.16){m.detected=true;log(`EARLY WARNING — TRACK ${m.id} detected.`);}if(m.detected&&samToggle.checked&&samAmmo>0&&elapsed-lastSam>1.05&&!interceptors.some(i=>i.alive&&i.targetId===m.id)&&progress<.78)launchInterceptor(m);const d=Math.hypot(p.x-targetPoint.x,p.z-targetPoint.z);if(pdToggle.checked&&m.kind==="warhead"&&d<20&&progress>.72){m.pdDwell+=dt;pdTracerClock+=dt;if(pdTracerClock>.045){pdTracerClock=0;tracer(Math.random()>.5?pdA:pdB,p);}if(m.pdDwell>.78){destroy(m,p,"PD");continue;}}if(progress>=1)impact(m);}}
function updateInterceptors(dt:number){for(const i of interceptors.filter(i=>i.alive)){const target=missiles.find(m=>m.id===i.targetId);if(!target||!target.alive){i.alive=false;i.mesh.dispose();continue;}const targetPos=position(target,elapsed),toTarget=targetPos.subtract(i.mesh.position),dist=toTarget.length();if(dist<2.25){i.alive=false;i.mesh.dispose();destroy(target,targetPos,"SAM");continue;}const dir=toTarget.normalize();i.mesh.position.addInPlace(dir.scale(i.speed*dt));alignYAxis(i.mesh,dir);i.smokeClock+=dt;if(i.smokeClock>.07){i.smokeClock=0;smoke(i.mesh.position,true);}}}

$<HTMLSelectElement>("trajectory").addEventListener("change",e=>{current=(e.target as HTMLSelectElement).value as Trajectory;log(`Trajectory profile selected: ${current.toUpperCase()}.`);});
$("singleBtn").addEventListener("click",launchSingle); $("salvoBtn").addEventListener("click",launchSalvo); $("decoyBtn").addEventListener("click",launchDecoys);
$("reloadBtn").addEventListener("click",()=>{samAmmo=4;log("SAM battery reloaded: 4 interceptors ready.");});
samToggle.addEventListener("change",()=>log(`Long-range SAM ${samToggle.checked?"ONLINE":"OFFLINE"}.`)); pdToggle.addEventListener("change",()=>log(`Point defense ${pdToggle.checked?"ONLINE":"OFFLINE"}.`));
$("overviewBtn").addEventListener("click",()=>{camera.setTarget(new BABYLON.Vector3(0,8,0));camera.radius=165;camera.alpha=-Math.PI/2;camera.beta=1.12;});
$("targetBtn").addEventListener("click",()=>{camera.setTarget(new BABYLON.Vector3(53,6,0));camera.radius=62;camera.alpha=-2.1;camera.beta=1;});
$("launcherBtn").addEventListener("click",()=>{camera.setTarget(new BABYLON.Vector3(-55,6,0));camera.radius=58;camera.alpha=-.9;camera.beta=1;});

log("Missile Tek sandbox initialized. Defense grid online.");hud();
engine.runRenderLoop(()=>{const now=performance.now()/1000,dt=Math.min(.05,now-lastFrame);lastFrame=now;elapsed+=dt;dish.rotation.y+=dt*.8;updateMissiles(dt);updateInterceptors(dt);hud();scene.render();});
window.addEventListener("resize",()=>engine.resize());