import {
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  ShadowMaterial,
} from "three";

type Point = [number, number, number];
type Section = [halfWidth: number, halfDepth: number, bevel: number, height: number];
type Finish = "jade" | "brass" | "champagne" | "inset" | "mineral";

class Surface {
  private coordinates: number[] = [];

  triangle(a: Point, b: Point, c: Point) {
    this.coordinates.push(...a, ...b, ...c);
  }

  quad(a: Point, b: Point, c: Point, d: Point) {
    this.triangle(a, b, c);
    this.triangle(a, c, d);
  }

  toGeometry() {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.coordinates, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    this.coordinates.length = 0;
    return geometry;
  }
}

function contour([x, z, cut, y]: Section): Point[] {
  return [
    [-x + cut, y, -z],
    [-x, y, -z + cut],
    [-x, y, z - cut],
    [-x + cut, y, z],
    [x - cut, y, z],
    [x, y, z - cut],
    [x, y, -z + cut],
    [x - cut, y, -z],
  ];
}

const mineralNoise = /* glsl */ `
  varying vec3 vDioSurface;
  float dioHash(vec2 p) {
    vec3 p3 = fract(p.xyx * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float dioNoise(vec2 p) {
    vec2 i = floor(p), u = fract(p);
    u = u*u*(3.0-2.0*u);
    return mix(mix(dioHash(i),dioHash(i+vec2(1,0)),u.x),
               mix(dioHash(i+vec2(0,1)),dioHash(i+vec2(1)),u.x),u.y);
  }
`;

function materialFor(finish: Finish) {
  const parameters: Record<Finish, [string, number, number]> = {
    jade: ["#243d35", 0.55, 0.2],
    inset: ["#192e29", 0.67, 0.1],
    brass: ["#ad8953", 0.36, 0.46],
    champagne: ["#c4a26b", 0.31, 0.43],
    mineral: ["#c6b896", 0.88, 0.02],
  };
  const [color, roughness, metalness] = parameters[finish];
  const material = new MeshStandardMaterial({ color, roughness, metalness });
  material.name = "dio-studio-" + finish;
  const metal = finish === "brass" || finish === "champagne";

  // Grain is evaluated in model space and filtered out as it becomes smaller
  // than one pixel. Both its scale and its position are fixed under the camera.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDioSurface;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n vDioSurface = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + mineralNoise)
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\n" +
          (metal
            ? `
        vec2 brushUv = vec2((vDioSurface.x+vDioSurface.z)*2.7,
          vDioSurface.y*170.0 + (vDioSurface.x-vDioSurface.z)*3.3);
        float brush = (dioNoise(brushUv)-0.5) *
          (1.0-smoothstep(0.40,1.65,max(fwidth(brushUv.x),fwidth(brushUv.y))));
        diffuseColor.rgb *= 1.0 + brush*0.13;
      `
            : `
        vec2 mineralUv = vec2(vDioSurface.x+vDioSurface.y*0.73,
          vDioSurface.z+vDioSurface.y*1.37);
        vec2 grainUv = mineralUv*77.0;
        float grainVisibility = 1.0-smoothstep(0.45,1.65,max(fwidth(grainUv.x),fwidth(grainUv.y)));
        float fleck = (dioNoise(grainUv)-0.50)*grainVisibility;
        float mineralCloud = (dioNoise(mineralUv*1.12)-0.5)*0.058
          + (dioNoise(mineralUv*4.0)-0.5)*0.022;
        diffuseColor.rgb *= 1.0 + mineralCloud + fleck*0.18;
      `),
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\n" +
          (metal
            ? "roughnessFactor = clamp(roughnessFactor + brush*0.11, 0.2, 0.9);"
            : "roughnessFactor = clamp(roughnessFactor + fleck*0.07, 0.35, 1.0);"),
      );
  };
  material.customProgramCacheKey = () => "dio-studio-" + (metal ? "brush" : "mineral");
  return material;
}

function plinth() {
  const group = new Group();
  group.name = "dio-socle";
  const sections: [Section, Finish][] = [
    [[10.68, 7.68, 0.57, -0.89], "inset"],
    [[10.76, 7.76, 0.57, -0.84], "jade"],
    [[10.79, 7.79, 0.58, -0.775], "brass"],
    [[10.79, 7.79, 0.58, -0.75], "inset"],
    [[10.81, 7.81, 0.58, -0.716], "jade"],
    [[10.92, 7.92, 0.6, -0.65], "jade"],
    [[10.92, 7.92, 0.6, -0.272], "inset"],
    [[10.925, 7.925, 0.6, -0.245], "brass"],
    [[10.941, 7.941, 0.6, -0.223], "brass"],
    [[10.941, 7.941, 0.6, -0.183], "champagne"],
    [[10.976, 7.976, 0.61, -0.149], "jade"],
    [[11, 8, 0.61, -0.103], "jade"],
    [[11, 8, 0.61, -0.061], "brass"],
    [[10.961, 7.961, 0.6, -0.024], "champagne"],
    [[10.925, 7.925, 0.6, -0.012], "jade"],
    [[10.83, 7.83, 0.58, -0.008], "brass"],
    [[10.806, 7.806, 0.58, -0.006], "mineral"],
    [[10.78, 7.78, 0.57, 0], "mineral"],
  ];
  const surfaces: Record<Finish, Surface> = {
    jade: new Surface(),
    brass: new Surface(),
    champagne: new Surface(),
    inset: new Surface(),
    mineral: new Surface(),
  };
  let previous = contour(sections[0]![0]);
  for (let i = 0; i < previous.length; i++) {
    const next = (i + 1) % previous.length;
    surfaces.inset.triangle([0, sections[0]![0][3], 0], previous[next]!, previous[i]!);
  }
  for (let i = 1; i < sections.length; i++) {
    const [section, finish] = sections[i]!;
    const ring = contour(section);
    const surface = surfaces[finish];
    for (let j = 0; j < ring.length; j++) {
      const next = (j + 1) % ring.length;
      surface.quad(previous[j]!, previous[next]!, ring[next]!, ring[j]!);
    }
    previous = ring;
  }
  for (let i = 0; i < previous.length; i++) {
    surfaces.mineral.triangle([0, 0, 0], previous[i]!, previous[(i + 1) % previous.length]!);
  }
  const filigree = surfaces.brass;
  function frontInlay(
    center: Point,
    along: [number, number],
    from: [number, number],
    to: [number, number],
    thickness = 0.017,
  ) {
    const ds = to[0] - from[0],
      dy = to[1] - from[1],
      length = Math.hypot(ds, dy);
    const hs = ((-dy / length) * thickness) / 2,
      hy = ((ds / length) * thickness) / 2;
    const point = (s: number, y: number): Point => [
      center[0] + s * along[0],
      center[1] + y,
      center[2] + s * along[1],
    ];
    filigree.quad(
      point(from[0] + hs, from[1] + hy),
      point(from[0] - hs, from[1] - hy),
      point(to[0] - hs, to[1] - hy),
      point(to[0] + hs, to[1] + hy),
    );
  }
  // A fine chased lozenge interrupts the paired hairlines on each face.
  for (const [x, z, ax, az, length] of [
    [0, 7.9225, 1, 0, 10.22],
    [0, -7.9225, -1, 0, 10.22],
    [10.9225, 0, 0, -1, 7.22],
    [-10.9225, 0, 0, 1, 7.22],
  ] as const) {
    const center: Point = [x, -0.463, z];
    const axis: [number, number] = [ax, az];
    for (const side of [-1, 1]) {
      frontInlay(center, axis, [side * 0.65, 0], [side * (length - 0.16), 0], 0.011);
      frontInlay(center, axis, [side * 0.12, 0], [side * 0.34, 0.083]);
      frontInlay(center, axis, [side * 0.34, 0.083], [side * 0.64, 0]);
      frontInlay(center, axis, [side * 0.12, 0], [side * 0.34, -0.083]);
      frontInlay(center, axis, [side * 0.34, -0.083], [side * 0.64, 0]);
      frontInlay(center, axis, [side * (length - 0.96), -0.067], [side * (length - 0.28), -0.067], 0.013);
      frontInlay(center, axis, [side * (length - 0.28), -0.067], [side * (length - 0.12), 0], 0.013);
    }
    frontInlay(center, axis, [-0.086, 0], [0, 0.049], 0.022);
    frontInlay(center, axis, [0, 0.049], [0.086, 0], 0.022);
    frontInlay(center, axis, [0.086, 0], [0, -0.049], 0.022);
    frontInlay(center, axis, [0, -0.049], [-0.086, 0], 0.022);
  }
  for (const [name, surface] of Object.entries(surfaces)) {
    const material = materialFor(name as Finish);
    if (name === "brass") material.side = DoubleSide;
    const mesh = new Mesh(surface.toGeometry(), material);
    mesh.name = "dio-plinth-" + name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function backdrop() {
  const triangle = new BufferGeometry();
  triangle.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const material = new ShaderMaterial({
    name: "dio-backdrop",
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    uniforms: {
      deep: { value: new Color("#132825") },
      light: { value: new Color("#40534b") },
      low: { value: new Color("#1b322d") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vDioUv;
      void main() {
        vDioUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 0.999999, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vDioUv;
      uniform vec3 deep, light, low;
      void main() {
        vec2 p = (vDioUv - vec2(0.50,0.59)) * vec2(1.50,1.12);
        float glow = exp(-3.4*dot(p,p));
        vec3 field = mix(deep,light,glow*0.90);
        field = mix(field,low,0.38*(1.0-smoothstep(0.02,0.56,vDioUv.y)));
        gl_FragColor = vec4(field,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new Mesh(triangle, material);
  mesh.name = "dio-studio-background";
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  mesh.userData.dioNoPick = true;
  return mesh;
}

function contactShadow() {
  const ground = new PlaneGeometry(56, 46);
  const material = new ShaderMaterial({
    name: "dio-contact-shadow",
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: { color: { value: new Color("#0b1815") } },
    vertexShader: /* glsl */ `
      varying vec2 vDioFloor;
      void main() {
        vDioFloor = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vDioFloor;
      uniform vec3 color;
      void main() {
        vec2 p = abs(vDioFloor - vec2(0.09,-0.06)) - vec2(10.24,7.24);
        float d = length(max(p,0.0)) + min(max(p.x,p.y),0.0) - 0.44;
        float tight = 1.0-smoothstep(-0.34,0.88,d);
        float wide = 1.0-smoothstep(-0.25,3.00,d);
        gl_FragColor = vec4(color,tight*0.45+wide*0.21);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new Mesh(ground, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.909;
  mesh.renderOrder = 2;
  mesh.name = "dio-plinth-contact";
  mesh.userData.dioNoPick = true;
  return mesh;
}

export function makeStudio(): { group: Group; key: DirectionalLight; dispose(): void } {
  const group = new Group();
  group.name = "dio-studio";
  const key = new DirectionalLight("#ffe4bd", 2.39);
  key.position.set(-12, 22, -10);
  key.castShadow = true;
  key.name = "dio-northwest-sun";
  key.shadow.mapSize.set(1024, 1024);
  const shadow = key.shadow.camera;
  shadow.left = -14.8;
  shadow.right = 14.8;
  shadow.top = 14.3;
  shadow.bottom = -14.3;
  shadow.near = 0.1;
  shadow.far = 53;
  shadow.updateProjectionMatrix();
  key.shadow.bias = -0.00016;
  key.shadow.normalBias = 0.019;
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;
  const sky = new HemisphereLight("#e8eddf", "#9c8a70", 1.25);
  const fill = new DirectionalLight("#d1e6eb", 1.16);
  fill.position.set(10.5, 7.8, 13.15);
  group.add(backdrop(), plinth(), contactShadow(), key, key.target, sky, fill, fill.target);

  const catcher = new Mesh(
    new PlaneGeometry(80, 70),
    new ShadowMaterial({ color: "#0b1513", opacity: 0.22, depthWrite: false }),
  );
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = -0.895;
  catcher.receiveShadow = true;
  catcher.renderOrder = 3;
  catcher.name = "dio-shadow-catcher";
  catcher.userData.dioNoPick = true;
  group.add(catcher);

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    group.traverse((object) => {
      if (object instanceof Mesh) {
        geometries.add(object.geometry);
        for (const m of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(m);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    key.shadow.dispose();
    group.clear();
  }
  return { group, key, dispose };
}
