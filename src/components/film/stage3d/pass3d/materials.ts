import { ShaderMaterial } from 'three';
import type { CanvasTexture, IUniform } from 'three';
import { defaultPassSky, passLightingChunk, passWorldVertex, stageUniformDeclarations } from './lighting';
import type { StageLighting } from './lighting';

export interface PassShaderOptions {
  /**
   * Film: deklarasi uniform panggung dan `skyColor` milik panggung itu sendiri (`COMMON` di stage3d/shared.ts),
   * menggantikan deklarasi dan langit bawaan modul ini. Uniform panggung dibagi lewat `lighting` dan `extraUniforms`.
   */
  prelude?: string;
  /** Optional replacement defining vec3 skyColor(vec3 dir) in the stage's linear working space. */
  skyGLSL?: string;
  /** Attach uniforms used by the replacement sky function. Declare them in skyGLSL. */
  extraUniforms?: Record<string, IUniform>;
}

const common = /* glsl */`
  varying vec3 vPassWorld;
  varying vec3 vPassNormal;
  varying vec2 vPassUv;
`;

const face = /* glsl */`
  uniform sampler2D uPrint;
  float grain(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  void main() {
    vec3 n = normalize(vPassNormal);
    vec3 v = normalize(cameraPosition - vPassWorld);
    vec3 l;
    vec3 point = lampEnergy(vPassWorld, l);
    vec3 key = normalize(uKeyDir);
    vec3 print = texture2D(uPrint, vPassUv).rgb;
    float foil = print.g;
    float fiber = grain(floor(vPassUv * vec2(920.0, 1400.0)));
    float crossFiber = 0.5 + 0.5 * sin(vPassUv.x * 1230.0 + vPassUv.y * 2311.0 + fiber * 1.2);
    float roughPaper = 0.95 + 0.061 * fiber + 0.028 * crossFiber;
    vec3 nil = mix(vec3(0.010, 0.014, 0.045), vec3(0.025, 0.033, 0.099), smoothstep(0.0, 1.0, vPassUv.y));
    vec3 source = ambientAt(n) + uKeyColor * max(dot(n, key), 0.0) * 0.69 + point * max(dot(n, l), 0.0) * 0.58;
    vec3 paper = nil * roughPaper * source + nil * 0.23;
    vec3 lightInk = vec3(0.72, 0.63, 0.49) * (0.39 + source * 0.55);
    vec3 dimInk = vec3(0.225, 0.259, 0.345) * (0.62 + source * 0.39);
    paper = mix(paper, dimInk, print.b * 0.90);
    paper = mix(paper, lightInk, print.r);
    float emboss = 0.0;
    vec3 metalNormal = n;
    #if PASS_RELIEF == 1
      float slope = foil - texture2D(uPrint, vPassUv + vec2(-0.00115, 0.00072)).g;
      float other = foil - texture2D(uPrint, vPassUv + vec2(0.00094, -0.00053)).g;
      vec3 tangent = normalize(dFdx(vPassWorld) + vec3(0.000001, 0.0, 0.0));
      vec3 bitangent = normalize(dFdy(vPassWorld) + vec3(0.0, 0.000001, 0.0));
      metalNormal = normalize(n + 0.22 * slope * tangent - 0.22 * other * bitangent);
      emboss = clamp(slope * 0.31 - other * 0.10, -0.13, 0.24);
      paper *= 1.0 - max(-slope, 0.0) * 0.23;
    #endif
    vec3 gold = stampedGold(metalNormal, v, l, point, vec3(0.65, 0.36, 0.13), 37.0, 2.0);
    float scuff = 0.89 + 0.14 * fiber + 0.055 * sin(vPassUv.y * 1340.0 + vPassUv.x * 480.0);
    gold *= scuff * (1.0 + emboss);
    float edgeDust = 0.09 * pow(1.0 - max(dot(n, v), 0.0), 4.0);
    paper += edgeDust * skyColor(reflect(-v, n)) * vec3(0.18, 0.19, 0.25);
    gl_FragColor = vec4(passFog(mix(paper, gold, foil), vPassWorld), 1.0);
  }
`;

const metal = /* glsl */`
  void main() {
    vec3 n = normalize(vPassNormal);
    vec3 v = normalize(cameraPosition - vPassWorld);
    vec3 l;
    vec3 point = lampEnergy(vPassWorld, l);
    vec3 color;
    #if PASS_METAL == 2
      float braid = 0.84 + 0.16 * sin(vPassUv.x * 25.1327 + vPassUv.y * 660.0);
      float binding = max(0.0, 1.0 - abs(vPassUv.y - 0.849) / 0.037);
      braid *= 1.0 + 0.21 * binding * sin(vPassUv.y * 1190.0);
      color = stampedGold(n, v, l, point, vec3(0.63, 0.34, 0.105), 14.0, 1.5) * braid;
      color += vec3(0.12, 0.057, 0.013) * (0.7 + 0.4 * braid);
    #elif PASS_METAL == 1
      float wear = 0.92 + 0.06 * sin(vPassUv.x * 440.0 + vPassUv.y * 53.0)
        + 0.045 * sin(vPassUv.y * 219.0);
      color = stampedGold(n, v, l, point, vec3(0.68, 0.36, 0.107), 62.0, 4.0) * wear;
    #else
      float paperLayers = 0.83 + 0.13 * cos(vPassUv.y * 17.0) + 0.07 * sin(vPassUv.x * 895.0);
      color = stampedGold(n, v, l, point, vec3(0.73, 0.41, 0.146), 37.0, 3.1) * paperLayers;
    #endif
    gl_FragColor = vec4(passFog(color, vPassWorld), 1.0);
  }
`;

function buildMaterial(lighting: StageLighting, options: PassShaderOptions, shader: string,
  defines: Record<string, number>, uniforms: Record<string, IUniform> = {}): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...lighting, ...options.extraUniforms, ...uniforms },
    defines,
    vertexShader: passWorldVertex,
    fragmentShader: (options.prelude ?? stageUniformDeclarations + (options.skyGLSL ?? defaultPassSky)) + common + passLightingChunk + shader,
    toneMapped: false,
    // alfa selalu 1 (gambar sama); masuk daftar tembus pandang supaya renderOrder bisa menggambarnya di atas kelir
    transparent: true,
  });
}

export function faceMaterial(lighting: StageLighting, options: PassShaderOptions, texture: CanvasTexture, relief: boolean) {
  return buildMaterial(lighting, options, face, { PASS_RELIEF: Number(relief) }, { uPrint: { value: texture } });
}

export function metalMaterial(lighting: StageLighting, options: PassShaderOptions, surface: 'edge' | 'eyelet' | 'cord') {
  const type = { edge: 0, eyelet: 1, cord: 2 }[surface];
  return buildMaterial(lighting, options, metal, { PASS_METAL: type });
}
