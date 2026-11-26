import { Color, Vector3 } from 'three';
import type { IUniform } from 'three';

type RGB = Color | Vector3;

/** Shared uniform objects. Colours are linear and directions point toward the source. */
export interface StageLighting {
  uTime: IUniform<number>;
  uKeyDir: IUniform<Vector3>;
  uKeyColor: IUniform<RGB>;
  uAmbSky: IUniform<RGB>;
  uAmbGround: IUniform<RGB>;
  uLampPos: IUniform<Vector3>;
  uLampColor: IUniform<RGB>;
  uFogColor: IUniform<RGB>;
  uFogDensity: IUniform<number>;
  uNight: IUniform<number>;
  uFlash: IUniform<number>;
  uSky: IUniform<RGB[]>;
  uSunDir: IUniform<Vector3>;
  uSunColor: IUniform<RGB>;
}

export function createPassLighting(overrides: Partial<StageLighting> = {}): StageLighting {
  return {
    uTime: { value: 0 },
    uKeyDir: { value: new Vector3(-0.24, 0.56, 0.80).normalize() },
    uKeyColor: { value: new Color().setRGB(0.88, 0.92, 1.17) },
    uAmbSky: { value: new Color().setRGB(0.31, 0.36, 0.47) },
    uAmbGround: { value: new Color().setRGB(0.19, 0.127, 0.115) },
    uLampPos: { value: new Vector3(0.225, -0.088, 0.115) },
    uLampColor: { value: new Color().setRGB(2.35, 0.94, 0.34) },
    uFogColor: { value: new Color('#090c21') },
    uFogDensity: { value: 0.09 },
    uNight: { value: 1 },
    uFlash: { value: 0 },
    uSky: { value: ['#292745', '#463741', '#b08057', '#252643', '#1b1422'].map((hex) => new Color(hex)) },
    uSunDir: { value: new Vector3(0.57, 0.40, 0.72).normalize() },
    uSunColor: { value: new Color().setRGB(2.4, 1.12, 0.42) },
    ...overrides,
  };
}

export const passWorldVertex = /* glsl */`
  varying vec3 vPassWorld;
  varying vec3 vPassNormal;
  varying vec2 vPassUv;
  void main() {
    vPassUv = uv;
    vPassWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vPassNormal = normalize((normalMatrix * normal) * mat3(viewMatrix));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const stageUniformDeclarations = /* glsl */`
  uniform float uTime, uFogDensity, uNight, uFlash;
  uniform vec3 uKeyDir, uKeyColor, uAmbSky, uAmbGround, uLampPos, uLampColor, uFogColor;
  uniform vec3 uSky[5], uSunDir, uSunColor;
`;

export const defaultPassSky = /* glsl */`
  vec3 skyColor(vec3 dir) {
    float up = dir.y * 0.5 + 0.5;
    vec3 dome = mix(uSky[4], mix(uSky[1], uSky[0], smoothstep(0.40, 1.0, up)), smoothstep(0.05, 0.55, up));
    float stripe = pow(max(dot(dir, normalize(vec3(-0.68, 0.06, 0.73))), 0.0), 17.0);
    float lamp = pow(max(dot(dir, normalize(uSunDir)), 0.0), 40.0);
    return dome + stripe * uSky[3] * 1.7 + lamp * mix(1.65, 0.92, uNight) * uSunColor;
  }
`;

export const passLightingChunk = /* glsl */`
  vec3 lampEnergy(vec3 point, out vec3 L) {
    vec3 delta = uLampPos - point;
    float distanceSquared = max(dot(delta, delta), 0.0001);
    L = delta * inversesqrt(distanceSquared);
    float flutter = 0.97 + 0.021 * sin(uTime * 5.3) + 0.013 * sin(uTime * 11.7 + 0.7);
    return uLampColor * flutter / (1.0 + 15.0 * distanceSquared);
  }
  vec3 ambientAt(vec3 n) {
    return mix(uAmbGround, uAmbSky, smoothstep(-0.66, 0.81, n.y));
  }
  vec3 passFog(vec3 rgb, vec3 w) {
    float d = length(cameraPosition - w);
    float t = exp(-pow(d * max(0.0, uFogDensity), 2.0));
    return mix(uFogColor, rgb, t);
  }
  vec3 stampedGold(vec3 n, vec3 v, vec3 l, vec3 lamp, vec3 color, float sharp, float energy) {
    vec3 key = normalize(uKeyDir);
    vec3 reflected = reflect(-v, n);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    float keyHit = pow(max(dot(n, normalize(key + v)), 0.0), sharp);
    float lampHit = pow(max(dot(n, normalize(l + v)), 0.0), sharp * 0.73);
    float broad = pow(max(dot(reflected, l), 0.0), 3.5);
    vec3 reflectance = mix(color, vec3(1.0, 0.85, 0.61), rim * 0.52);
    vec3 specular = skyColor(reflected) * (0.65 + rim * 0.9);
    specular += lamp * (lampHit * energy + 0.23 * broad) + uKeyColor * keyHit * energy * 0.59;
    vec3 wax = color * (0.34 + ambientAt(n) * 0.73 + lamp * max(dot(n, l), 0.0) * 0.19);
    return wax + reflectance * specular + reflectance * uFlash * (0.58 + rim);
  }
`;
