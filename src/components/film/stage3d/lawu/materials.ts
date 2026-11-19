import { AdditiveBlending, type DataTexture, type Vector2, DoubleSide, ShaderMaterial } from "three";
import { COMMON, type Shared } from "../shared";
export interface Light {
  uClear: { value: number };
  uDay: { value: number };
  uDawn: { value: number };
  uPassed: { value: number };
  uPixel: { value: number };
  uRidge: { value: DataTexture };
  uPlot: { value: Vector2 };
  uUpper: { value: number };
  uBearing: { value: number };
  uLocal: { value: number };
}
const solidVert = `
uniform sampler2D uRidge;uniform vec2 uPlot;uniform float uClear,uUpper,uBearing,uLocal;
varying vec3 wp; varying vec3 norm; varying vec3 tint;varying float direct;
void main(){
 vec4 p=vec4(position,1.); vec3 n=normal;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p; n=normalize(mat3(instanceMatrix)*n);
 #endif
 wp=(modelMatrix*p).xyz; norm=normalize(mat3(modelMatrix)*n); tint=color;
 #ifdef USE_INSTANCING_COLOR
 tint*=instanceColor;
 #endif
 direct=uClear;
 vec2 cell=(wp.xz-uPlot)/46.+.5;
 if(uLocal>.5 && uBearing>=79. && uBearing<=84. && min(cell.x,cell.y)>=0. && max(cell.x,cell.y)<=1.){
   vec3 h=texture2D(uRidge,(cell*16.+.5)/17.).rgb*(255./8.);
   float a=(uBearing-79.)/2.5;
   float ridge=a<1.?mix(h.r,h.g,a):mix(h.g,h.b,a-1.);
   direct=smoothstep(0.,.53,uUpper-ridge);
 }
 gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);
}`;
export function surface(shared: Shared, light: Light, steps: number, land = false) {
  return new ShaderMaterial({
    uniforms: { ...shared, ...light },
    side: DoubleSide,
    vertexColors: true,
    vertexShader: solidVert,
    fragmentShader: `
 ${COMMON}
 uniform float uClear,uDay,uDawn;
 varying vec3 wp; varying vec3 norm; varying vec3 tint; varying float direct;
 void main(){
  vec3 n=normalize(norm);vec3 ray=wp-cameraPosition;float dist=length(ray);vec3 dir=ray/max(.001,dist);
  float grain=vnoise(wp.xz*${land ? "1.25" : "18.0"}+wp.y*.55);
  vec3 albedo=tint*(.91+.17*grain);
  ${
    land
      ? `
   float contour=wp.y*3.2+vnoise(wp.xz*.055)*.9;
   float aa=min(.5,fwidth(contour));
   float hedge=1.-smoothstep(.20-aa,.37+aa,abs(fract(contour)-.5));
   float field=smoothstep(.35,.71,vnoise(wp.xz*.020))*smoothstep(75.,99.,wp.y)*(1.-smoothstep(152.,185.,wp.y));
   albedo*=1.-.21*hedge*field*(1.-smoothstep(80.,330.,dist));`
      : ""
  }
  float sunDot=max(0.,dot(n,uKeyDir));
  float grazing=pow(max(0.,dot(dir,uSunDir)),8.);
  float shade=mix(.72,1.,smoothstep(-.55,.55,n.y));
  vec3 col=albedo*(mix(vec3(.21,.29,.40),vec3(.55,.64,.65),uDay)*shade
            +mix(vec3(.18,.26,.40),mix(vec3(2.05,1.08,.40),vec3(1.10,1.01,.81),uDay),direct)*sunDot)+flashLight(n,wp)*.08;
  // Sample density along the view ray. Noise moves through a bounded inversion layer;
  // silhouettes and nearby stone stay crisp. Lower tiers use the analytic distance term.
  float haze=1.-exp(-dist*mix(.00165,.00093,uDay)); float banks=0.;
  ${
    steps > 1
      ? `for(int i=0;i<${steps};i++){float t=(float(i)+.5)/${steps}.;vec3 q=cameraPosition+dir*(t*min(dist,190.));
     float h=(q.y-105.)*.035;float holes=vnoise(q.xz*.027+vec2(uTime*.019,0.));
     banks+=exp(-h*h)*(.36+.64*holes)/${steps}.;}`
      : `banks=.45*exp(-sq((wp.y-106.)*.028));`
  }
  float fog=clamp(haze+banks*(1.-exp(-dist*.026))*(.21+.37*uDawn),0.,.86);
  vec3 mist=mix(vec3(.16,.24,.31),vec3(.52,.63,.64),uDay);
  mist=mix(mist,vec3(1.12,.61,.27),uDawn*grazing*(.32+.68*uClear));
  float rim=pow(1.-clamp(abs(dot(n,-dir)),0.,1.),3.);
  col+=albedo*vec3(.76,.50,.20)*rim*uDawn*direct;
  col=mix(col,mist,fog)*mix(1.,.095,uNight);col+=vec3(1.1,.63,.27)*uDawn*uClear*grazing*banks*min(1.,dist*.023)*.22;
  gl_FragColor=vec4(col,1.);
 }`,
  });
}
export function waterfall(shared: Shared, light: Light) {
  return new ShaderMaterial({
    uniforms: { ...shared, ...light },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: `
 varying vec2 st;varying vec3 wp;
 void main(){st=uv;wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,
    fragmentShader: `${COMMON}
 varying vec2 st;varying vec3 wp;
 void main(){float edge=sin(3.14159*st.x);
 float strand=vnoise(vec2(st.x*28.,st.y*7.+uTime*3.4))*.6+vnoise(vec2(st.x*85.,st.y*15.+uTime*6.))*.4;
 float body=smoothstep(.03,.25,edge+strand*.13-.10);
 vec3 water=mix(vec3(.28,.44,.48),vec3(1.00,1.14,1.13),strand*strand+.16*(1.-st.y));
 gl_FragColor=vec4(water,body*(.44+.51*strand));}`,
  });
}
export function motes(shared: Shared, light: Light) {
  return new ShaderMaterial({
    uniforms: { ...shared, ...light },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: `
 uniform float uTime,uPassed,uPixel,uNight,uClear,uDawn;attribute float serial;attribute float radius;
 varying float type;varying float lit;
 void main(){type=serial;vec3 p=position;lit=1.;
 if(serial<0.){float phase=fract(uTime*.20+abs(serial));p.y+=phase*.76;p.x+=sin(phase*3.4+serial)*phase*.42;lit=sin(phase*3.14159);}
 else if(serial>=2000.){p.x+=.13*sin(uTime*.53+serial);p.z+=.07*cos(uTime*.61+serial);p.y+=.09*sin(uTime*.84+serial);lit=.27*(1.-uNight);}
 else if(serial>=1000.){lit=uDawn*uClear*(.18+.82*pow(.5+.5*sin(uTime*.5+serial),6.));}
 else if(serial>20.){lit=(.34+.25*sin(serial+uTime*.8))*uNight;}
 else{lit=mix(.025,1.,smoothstep(serial-.75,serial-.01,uPassed));}
 vec4 q=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*q;
 gl_PointSize=clamp(radius*uPixel/max(.1,-q.z),1.6,64.);}`,
    fragmentShader: `
 varying float type;varying float lit;
 void main(){vec2 uv=gl_PointCoord-.5;float d=dot(uv,uv)*4.;if(d>=1.)discard;
 float a=pow(1.-d,3.);vec3 c=type<0.?vec3(.49,.68,.71):vec3(2.3,1.05,.29);
 if(type>=2000.){c=vec3(.48,.62,.21);a*=1.-smoothstep(.02,.20,abs(uv.x+uv.y*.4));}
 else if(type>=1000.)c=vec3(1.5,1.47,1.20);
 gl_FragColor=vec4(c,a*lit*(type<0.?.19:1.));}`,
  });
}
