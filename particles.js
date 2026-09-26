/* Full-viewport particle motor. Conceptual geometry, not a physical simulation. */
(() => {
  'use strict';
  const canvas = document.getElementById('flow-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const hero = document.querySelector('.hero-visual');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const points = [];
  const outlines = [];
  const stars = [];
  const ripples = [];
  const groupNames = ['shell','stator','rotor','shaft','rear','front'];
  const groupIndex = Object.fromEntries(groupNames.map((group,index) => [group,index]));
  const focusLevels = Object.fromEntries(groupNames.map(group => [group,1]));
  const focusTargets = { ...focusLevels };
  const focusMap = { casting:['shell','front','rear'], inertia:['rotor','shaft'], wire:['stator'], resistance:['stator'], efficiency:groupNames };
  const attachments = {
    casting:{ point:[-.76,.2,.95], group:'shell' },
    inertia:{ point:[.66,-.02,.18], group:'rotor' },
    wire:{ point:[-.9,.7,.48], group:'stator' },
    resistance:{ point:[1.12,-.3,.8], group:'stator' },
    efficiency:{ point:[-.12,-1.19,.02], group:'shell' },
  };
  const buckets = Array.from({ length: 120 * groupNames.length }, () => []);
  const palette = Array.from({ length: 120 }, (_, index) => {
    const depth = Math.floor(index / 20);
    const color = index % 20;
    const hue = color === 19 ? 29 : 180 + color * 5.6;
    return `hsla(${hue},${color === 19 ? 93 : 100}%,${61 + depth * 4.8}%,${0.25 + depth * 0.125})`;
  });
  let seed = 849312;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function add(x, y, z, group = 'shell', color = 0, size = 0.7) {
    points.push({ x, y, z, group, color, size: size * (0.75 + random() * 0.6), phase: random() * TAU });
  }
  function line(a, b, group = 'shell', color = 0, density = 25, size = 0.7, contour = true) {
    for (let i = 0; i <= density; i++) {
      const t = i / density;
      add(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, group, color, size);
    }
    if (contour) outlines.push({ points: [a, b], group, color });
  }
  function radial(x, radius, angle) { return [x, Math.cos(angle) * radius, Math.sin(angle) * radius]; }
  function ring(x, radius, group, color = 0, count = 144, cut = false) {
    const contour = [];
    for (let i = 0; i <= count; i++) {
      const angle = (i / count) * TAU;
      if (cut && angle > 1.72 && angle < 3.56) continue;
      const p = radial(x, radius, angle);
      add(...p, group, color, 0.87);
      contour.push(p);
    }
    if (!cut) outlines.push({ points: contour.filter((_, i) => i % 3 === 0), group, color });
  }
  function box(x1, x2, y1, y2, z1, z2, group = 'shell') {
    const corners = [[x1,y1,z1],[x2,y1,z1],[x2,y2,z1],[x1,y2,z1],[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]];
    for (const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]) line(corners[a], corners[b], group, 0, 12, 0.72);
  }

  // Longitudinal body and cooling fins; an upper cutaway reveals the rotor.
  for (let a = 0; a < 64; a++) {
    const angle = a / 64 * TAU;
    if (angle > 1.72 && angle < 3.56) continue;
    for (let j = 0; j < 30; j++) add(...radial(-1.14 + j / 29 * 2.28, 1.025, angle), 'shell', 0, 0.57);
  }
  for (let fin = 0; fin < 32; fin++) {
    const angle = fin / 32 * TAU;
    if (angle > 1.72 && angle < 3.56) continue;
    line(radial(-1.1, 1.15, angle), radial(1.1, 1.15, angle), 'shell', 0, 44, 0.87);
    line(radial(-1.1, 1.04, angle), radial(-1.1, 1.15, angle), 'shell', 0, 4, 0.8);
    line(radial(1.1, 1.04, angle), radial(1.1, 1.15, angle), 'shell', 0, 4, 0.8);
  }
  for (const x of [-1.2, 1.2]) {
    const group = x < 0 ? 'rear' : 'front';
    ring(x, 1.08, group); ring(x, 0.96, group); ring(x, 0.73, group, 1);
    ring(x + Math.sign(x) * 0.085, 1.08, group, 0, 108);
    for (let bolt = 0; bolt < 8; bolt++) {
      const a = bolt / 8 * TAU;
      const y = Math.cos(a) * 0.99, z = Math.sin(a) * 0.99;
      for (let i = 0; i < 14; i++) add(x + Math.sign(x) * 0.1, y + Math.cos(i/14*TAU)*0.035, z + Math.sin(i/14*TAU)*0.035, group, 1, 1.15);
    }
  }
  // Thirty-six distinct stator teeth on both ends.
  for (let tooth = 0; tooth < 36; tooth++) {
    const angle = tooth / 36 * TAU;
    for (const x of [-1.135, 1.135]) {
      const corners = [radial(x,.76,angle-.043),radial(x,.95,angle-.064),radial(x,.95,angle+.064),radial(x,.76,angle+.043)];
      for (let j=0;j<4;j++) line(corners[j],corners[(j+1)%4],'stator',1,4,.72,false);
    }
  }
  // Copper winding bundles turn around the ends of the stationary core.
  for (let coil = 0; coil < 24; coil++) {
    const angle = coil / 24 * TAU;
    for (let i=0;i<54;i++) {
      const t=i/54*TAU;
      const x=Math.sin(t)*1.17;
      const a=angle + Math.cos(t)*.067;
      add(...radial(x,.865 + Math.pow(Math.abs(Math.sin(t)),8)*.04,a),'stator',2,.85);
    }
  }
  // Rotor laminations and skewed rotor bars, visible through the cutaway.
  for (let j=0;j<15;j++) ring(-.96+j/14*1.92,.605,'rotor',3,72);
  for (let bar=0;bar<26;bar++) {
    const base=bar/26*TAU;
    const contour=[];
    for (let j=0;j<33;j++) {
      const p=radial(-1+j/32*2,.625,base+j/32*.11);
      add(...p,'rotor',3,.79); contour.push(p);
    }
    if (bar%2===0) outlines.push({points:contour,group:'rotor',color:3});
  }
  ring(-1.015,.61,'rotor',3); ring(1.015,.61,'rotor',3);
  ring(-1.027,.19,'rotor',1,60); ring(1.027,.19,'rotor',1,60);
  for (let ray=0;ray<14;ray++) line(radial(1.03,.2,ray/14*TAU),radial(1.03,.59,ray/14*TAU),'rotor',3,8,.6,false);
  // The continuous shaft, bearing collars, and machined end face.
  for (let side=0;side<16;side++) {
    const angle=side/16*TAU;
    for(let j=0;j<52;j++) add(...radial(-2.06+j/51*4.53,.16,angle),'shaft',1,.72);
  }
  for(const x of [-2.06,-1.43,-1.3,1.3,1.47,2.47]) ring(x,Math.abs(x)>2?.16:.265,'shaft',1,64);
  line([1.57,-.17,0],[2.29,-.17,0],'shaft',1,24,1.1);
  // Small mounting feet and the terminal enclosure make the silhouette recognisable.
  box(-1.02,-.62,.89,1.19,-.7,.7,'shell');
  box(.62,1.02,.89,1.19,-.7,.7,'shell');
  box(-.67,.12,-1.32,-1.04,-.36,.25,'shell');
  for(let i=0;i<560;i++) stars.push({x:random(),y:random(),depth:random(),phase:random()*TAU,size:.3+random()*.9});
  // Eight corners per part give a cheap, conservative projection bound at any angle.
  const partBounds = new Map();
  for (const p of points) {
    if (!partBounds.has(p.group)) partBounds.set(p.group, { min:[Infinity,Infinity,Infinity], max:[-Infinity,-Infinity,-Infinity] });
    const b = partBounds.get(p.group);
    [p.x,p.y,p.z].forEach((value,i) => { b.min[i]=Math.min(b.min[i],value); b.max[i]=Math.max(b.max[i],value); });
  }
  const boundingCorners = [];
  for (const [group,b] of partBounds) for (let i=0;i<8;i++) {
    boundingCorners.push({ group, point:[i&1?b.max[0]:b.min[0],i&2?b.max[1]:b.min[1],i&4?b.max[2]:b.min[2]] });
  }

  let width=innerWidth, height=innerHeight, scale=140, centerX=width*.57, centerY=height*.55;
  let anchorX=.57, anchorY=.55, mobileCenter=480, time=0, lastTime=0, raf=0, destroyed=false, paused=false, intensity='high';
  let focusId=null, fieldFocus=0, fieldFocusTarget=0;
  let exploded=0, explosionTarget=0, yaw=-.58, pitch=.12, roll=-.22;
  let dragYaw=0, dragPitch=0, targetDragYaw=0, targetDragPitch=0, dragging=false, dragPointer=null;
  let lastPointerX=0,lastPointerY=0, pointerX=width*.75,pointerY=height*.4, smoothX=pointerX,smoothY=pointerY,pointerActive=false;
  let scrollPosition=scrollY, scrollSmooth=scrollY;
  const controlSelector='button,input,a,select,textarea,dialog,.tool-card,.sidebar,.tool-node,.command-dialog,.scene-controls,.workspace-header,[role="button"],[data-no-particle-interaction]';
  const translations={shell:-.64,stator:0,rotor:.88,shaft:1.4,rear:-1.1,front:1.27};
  let cy=1,sy=0,cp=1,sp=0,cr=1,sr=0;

  function transform(x,y,z,group) {
    x+=(translations[group]||0)*exploded;
    if(group==='rotor'||group==='shaft') {
      const spin=time*.22, c=Math.cos(spin),s=Math.sin(spin), yn=y*c-z*s;
      z=y*s+z*c;y=yn;
    }
    const xx=x*cy+z*sy,zz=-x*sy+z*cy;
    const yy=y*cp-zz*sp, depth=y*sp+zz*cp;
    const perspective=6.7/(6.7-depth*.4);
    return {x:centerX+(xx*cr-yy*sr)*scale*perspective,y:centerY+(xx*sr+yy*cr)*scale*perspective,z:depth,p:perspective};
  }
  function disturbance(x,y,strength=1) {
    let dx=0,dy=0;
    if(pointerActive) {
      const px=x-smoothX,py=y-smoothY,d2=px*px+py*py;
      if(d2<40000 && d2>1) {
        const influence=Math.exp(-d2/9000)*.095*strength;
        dx+=px*influence;dy+=py*influence;
      }
    }
    for(const ripple of ripples) {
      const age=time-ripple.at,px=x-ripple.x,py=y-ripple.y,distance=Math.hypot(px,py),delta=distance-age*225;
      if(Math.abs(delta)<65 && distance>1) {
        const force=Math.exp(-delta*delta/1100)*(1-age/2.8)*13*strength;
        dx+=px/distance*force;dy+=py/distance*force;
      }
    }
    return [dx,dy];
  }
  function atmosphere() {
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const stride=width<=760?3:intensity==='low'?2:1;
    for(let i=0;i<stars.length;i+=stride) {
      const star=stars[i];
      let x=(star.x*width+Math.sin(time*.08+star.phase)*17+width)%width;
      let y=(star.y*height-time*(1+star.depth*2)+height*100)%height;
      const d=disturbance(x,y,.5);x+=d[0];y+=d[1];
      ctx.fillStyle=`hsla(${184+star.depth*80},100%,76%,${.1+star.depth*.3})`;
      ctx.fillRect(x,y,star.size,star.size);
    }
    // Long magnetic field paths reach the complete viewport rather than ending at the hero.
    for(let band=0;band<8;band++) {
      const curve=(u)=>({x:u*width,y:height*(.14+band*.105)+Math.sin(u*Math.PI*1.7+band*.48+time*.06)*height*.12});
      const gradient=ctx.createLinearGradient(0,0,width,height);
      const fieldBoost=1+fieldFocus*1.7;
      gradient.addColorStop(0,`rgba(54,227,239,${.035*fieldBoost})`);
      gradient.addColorStop(.35,`rgba(80,163,255,${.105*fieldBoost})`);
      gradient.addColorStop(.72,`rgba(132,121,255,${.09*fieldBoost})`);
      gradient.addColorStop(1,`rgba(170,113,255,${.025*fieldBoost})`);
      ctx.strokeStyle=gradient;ctx.lineWidth=.65+fieldFocus*.3;ctx.beginPath();
      for(let j=0;j<=52;j++){const p=curve(j/52);if(!j)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
      for(let j=0;j<20;j++) {
        const u=(j/20+time*(.007+band*.0004)+band*.037)%1,p=curve(u),d=disturbance(p.x,p.y,.7);
        ctx.fillStyle=`hsla(${183+u*85},100%,78%,${Math.min(.95,(.15+Math.sin(u*Math.PI)*.36)*(1+fieldFocus*.7))})`;
        ctx.beginPath();ctx.arc(p.x+d[0],p.y+d[1],j%5===0?1.15:.65,0,TAU);ctx.fill();
      }
    }
    for(const ripple of ripples) {
      const age=time-ripple.at;
      ctx.strokeStyle=`rgba(116,222,250,${Math.max(0,1-age/2.8)*.23})`;ctx.lineWidth=.8;
      ctx.beginPath();ctx.arc(ripple.x,ripple.y,age*225,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }
  function modelAura() {
    ctx.save();ctx.translate(centerX,centerY);ctx.rotate(roll);ctx.scale(1.45,.85);
    const glow=ctx.createRadialGradient(0,0,scale*.2,0,0,scale*2.2);
    glow.addColorStop(0,'rgba(77,95,238,.07)');glow.addColorStop(.48,'rgba(55,156,231,.075)');glow.addColorStop(1,'rgba(68,96,240,0)');
    ctx.fillStyle=glow;ctx.fillRect(-scale*2.3,-scale*2.3,scale*4.6,scale*4.6);ctx.restore();
  }
  function render() {
    if(destroyed||!width||!height)return;
    ctx.clearRect(0,0,width,height);
    const mobile=width<=760;
    scale=(mobile?Math.min(width*.193,95):width<900?Math.min(width*.15,height*.22,190):Math.min(width*.16,height*.22,230))*(1-exploded*.3);
    centerX=width*anchorX+Math.sin(time*.1)*2-exploded*width*.025;
    centerY=(mobile?mobileCenter:height*anchorY)-Math.min(scrollSmooth*(mobile?.022:.055),mobile?24:height*.085);
    const px=(smoothX/width-.5),py=(smoothY/height-.5);
    yaw=-.58+dragYaw+(pointerActive?px*.075:0);pitch=.12+dragPitch+(pointerActive?py*.035:0);roll=-.22;
    cy=Math.cos(yaw);sy=Math.sin(yaw);cp=Math.cos(pitch);sp=Math.sin(pitch);cr=Math.cos(roll);sr=Math.sin(roll);
    const horizontalBounds = () => {
      let left=Infinity,right=-Infinity;
      for (const corner of boundingCorners) {
        const p=transform(...corner.point,corner.group);
        left=Math.min(left,p.x);right=Math.max(right,p.x);
      }
      return {left,right};
    };
    let bounds=horizontalBounds();
    const edge=24, available=Math.max(1,width-edge*2);
    if (bounds.right-bounds.left>available) {
      scale*=available/(bounds.right-bounds.left);
      bounds=horizontalBounds();
    }
    if(bounds.right>width-edge)centerX-=bounds.right-(width-edge);
    else if(bounds.left<edge)centerX+=edge-bounds.left;
    atmosphere();modelAura();
    ctx.save();ctx.globalCompositeOperation='lighter';
    const contourGradient=ctx.createLinearGradient(centerX-scale*2,0,centerX+scale*2,0);
    contourGradient.addColorStop(0,'rgba(82,228,249,.24)');contourGradient.addColorStop(.55,'rgba(111,169,255,.26)');contourGradient.addColorStop(1,'rgba(184,137,255,.3)');
    ctx.strokeStyle=contourGradient;ctx.lineWidth=.62;
    for(const outline of outlines) {
      ctx.globalAlpha=Math.min(1,focusLevels[outline.group]);
      ctx.beginPath();
      outline.points.forEach((p,i)=>{const q=transform(...p,outline.group);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});
      ctx.stroke();
    }
    for(const bucket of buckets)bucket.length=0;
    const stride=mobile?2:intensity==='low'?2:1;
    for(let i=0;i<points.length;i+=stride) {
      const point=points[i],p=transform(point.x,point.y,point.z,point.group);
      const d=disturbance(p.x,p.y,.75);p.x+=d[0];p.y+=d[1];
      const depth=Math.max(0,Math.min(5,Math.floor((p.z+2.5)*1.18)));
      let color=Math.max(0,Math.min(18,Math.floor((p.x-centerX+scale*2.2)/(scale*4.4)*18)));
      if(point.color===2)color=19;
      else if(point.color===3)color=Math.min(18,color+3);
      else if(point.color===1)color=Math.max(1,color-3);
      const focus=focusLevels[point.group];
      const radius=point.size*p.p*(.77+depth*.055)*(1+Math.sin(time*.8+point.phase)*.075)*(1+Math.max(0,focus-1)*.22);
      buckets[groupIndex[point.group]*120+depth*20+color].push(p.x,p.y,radius);
    }
    for(let i=0;i<buckets.length;i++) {
      const bucket=buckets[i];if(!bucket.length)continue;
      const focus=focusLevels[groupNames[Math.floor(i/120)]];
      ctx.globalAlpha=Math.min(1,focus);ctx.fillStyle=palette[i%120];ctx.beginPath();
      for(let j=0;j<bucket.length;j+=3){ctx.moveTo(bucket[j]+bucket[j+2],bucket[j+1]);ctx.arc(bucket[j],bucket[j+1],bucket[j+2],0,TAU);}ctx.fill();
      if(focus>1.01){ctx.globalAlpha=(focus-1)*.55;ctx.fill();}
    }
    // Selected machining edges carry a glow; the complete cloud never uses shadowBlur.
    ctx.lineWidth=2.4;ctx.globalAlpha=.19;
    for(let i=0;i<outlines.length;i+=9){const o=outlines[i];ctx.globalAlpha=.19*focusLevels[o.group];ctx.beginPath();o.points.forEach((p,j)=>{const q=transform(...p,o.group);if(!j)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.stroke();}
    ctx.restore();
  }
  function canRun(){return !destroyed&&!paused&&!document.hidden&&!reduced.matches;}
  function tick(timestamp) {
    raf=0;if(!canRun())return;
    const elapsed=timestamp-lastTime,interval=1000/(width<=760||intensity==='low'?24:32);
    if(elapsed>=interval) {
      const dt=Math.min(elapsed,75)/1000;time+=dt;lastTime=timestamp-elapsed%interval;
      const easing=1-Math.exp(-dt*5);
      smoothX+=(pointerX-smoothX)*easing;smoothY+=(pointerY-smoothY)*easing;
      exploded+=(explosionTarget-exploded)*easing;
      for(const group of groupNames)focusLevels[group]+=(focusTargets[group]-focusLevels[group])*easing;
      fieldFocus+=(fieldFocusTarget-fieldFocus)*easing;
      dragYaw+=(targetDragYaw-dragYaw)*easing;dragPitch+=(targetDragPitch-dragPitch)*easing;
      if(!dragging){targetDragYaw*=Math.exp(-dt*.72);targetDragPitch*=Math.exp(-dt*.72);}
      scrollSmooth+=(scrollPosition-scrollSmooth)*easing;
      while(ripples.length&&time-ripples[0].at>2.8)ripples.shift();
      render();
    }
    raf=requestAnimationFrame(tick);
  }
  function schedule(){if(raf)cancelAnimationFrame(raf);raf=0;lastTime=performance.now();if(canRun())raf=requestAnimationFrame(tick);}
  function resize(){
    width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    anchorX=width<=760?.51:width<900?.53:.57;
    anchorY=width<900?.53:.55;
    mobileCenter=480;
    render();
  }
  function ignored(target){return target instanceof Element&&Boolean(target.closest(controlSelector));}
  function pointerMove(event){
    pointerX=event.clientX;pointerY=event.clientY;pointerActive=true;
    if(dragging&&event.pointerId===dragPointer){targetDragYaw=Math.max(-1.15,Math.min(1.15,targetDragYaw+(event.clientX-lastPointerX)*.006));targetDragPitch=Math.max(-.6,Math.min(.6,targetDragPitch+(event.clientY-lastPointerY)*.004));lastPointerX=event.clientX;lastPointerY=event.clientY;}
  }
  function pointerDown(event){
    if(ignored(event.target)||event.button>0)return;
    pointerMove(event);
    if(!paused&&!reduced.matches){ripples.push({x:event.clientX,y:event.clientY,at:time});if(ripples.length>4)ripples.shift();}
    if(hero&&event.target instanceof Element&&event.target.closest('.hero-visual')){
      dragging=true;dragPointer=event.pointerId;lastPointerX=event.clientX;lastPointerY=event.clientY;hero.style.cursor='grabbing';
    }
  }
  function pointerUp(){dragging=false;dragPointer=null;if(hero)hero.style.cursor='grab';}
  function pointerLeave(){pointerActive=false;pointerUp();}
  function onScroll(){scrollPosition=scrollY;}
  function motionEvent(e){if(typeof e.detail?.paused==='boolean')api.setPaused(e.detail.paused);}
  function explodeEvent(e){if(typeof e.detail?.exploded==='boolean')api.setExploded(e.detail.exploded);}
  function preferenceChange(){if(reduced.matches){exploded=explosionTarget;dragYaw=0;dragPitch=0;for(const group of groupNames)focusLevels[group]=focusTargets[group];fieldFocus=fieldFocusTarget;render();}schedule();}
  const api={
    setPaused(value){paused=Boolean(value);schedule();},
    setIntensity(value){intensity=value==='low'?'low':'high';render();},
    setExploded(value){explosionTarget=value?1:0;if(paused||reduced.matches){exploded=explosionTarget;render();}},
    setFocus(id){
      focusId=Object.hasOwn(focusMap,id)?id:null;
      const selected=focusId?focusMap[focusId]:null;
      for(const group of groupNames)focusTargets[group]=selected?(selected.includes(group)?1.48:.55):1;
      fieldFocusTarget=focusId==='efficiency'?1:0;
      if(paused||reduced.matches){for(const group of groupNames)focusLevels[group]=focusTargets[group];fieldFocus=fieldFocusTarget;render();}
    },
    getAttachment(id){
      if(destroyed||!Object.hasOwn(attachments,id))return null;
      const attachment=attachments[id];
      const p=transform(...attachment.point,attachment.group);return {x:p.x,y:p.y};
    },
    resetView(){targetDragYaw=0;targetDragPitch=0;if(paused||reduced.matches){dragYaw=0;dragPitch=0;render();}},
    destroy(){destroyed=true;if(raf)cancelAnimationFrame(raf);observer?.disconnect();for(const [name,handler]of events)window.removeEventListener(name,handler);document.removeEventListener('visibilitychange',schedule);reduced.removeEventListener?.('change',preferenceChange);ctx.clearRect(0,0,width,height);if(window.toolboxFlow===api)delete window.toolboxFlow;},
  };
  const events=[['pointermove',pointerMove],['pointerdown',pointerDown],['pointerup',pointerUp],['pointercancel',pointerUp],['pointerout',e=>{if(!e.relatedTarget)pointerLeave();}],['blur',pointerLeave],['scroll',onScroll],['resize',resize],['toolbox:motion',motionEvent],['toolbox:explode',explodeEvent]];
  for(const [name,handler]of events)window.addEventListener(name,handler,{passive:true});
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener?.('change',preferenceChange);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(document.documentElement);
  if(hero)hero.style.cursor='grab';
  window.toolboxFlow=api;
  resize();schedule();
})();
