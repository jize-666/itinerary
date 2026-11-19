"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { DioramaController, type ViewerState } from "./controller";
import { renderDpr, type DioramaProps, type Quality } from "@/engine/diorama/options";
import { tr } from "@/engine/diorama/strings";
import type { SurfaceMode } from "./artwork";

type Props = Pick<DioramaProps, "calm" | "quality" | "focus" | "lang"> & {
  autoTour: boolean;
  forceQuality: boolean;
  renderTier: Quality;
  mode: SurfaceMode;
  ready: (c: DioramaController | null) => void;
  changed: (s: ViewerState) => void;
  slow: (n: number) => void;
  labelHost: RefObject<HTMLDivElement | null>;
  labels: boolean;
};
const anchors = [new Vector3(0, 4.9, -3.65), new Vector3(5.55, 3.25, 2), new Vector3(-6, 2.8, 2.6)];
const projected = new Vector3();
function Binding(props: Props) {
  const { gl, scene, camera, invalidate, size } = useThree();
  const manager = useRef<DioramaController | null>(null),
    latest = useRef(props),
    bounds = useRef(size);
  useLayoutEffect(() => {
    latest.current = props;
    bounds.current = size;
  }, [props, size]);
  useLayoutEffect(() => {
    const p = latest.current,
      r = bounds.current;
    const c = new DioramaController(
      gl,
      scene,
      camera as PerspectiveCamera,
      {
        invalidate,
        update: (s) => latest.current.changed(s),
        slow: (n) => latest.current.slow(n),
      },
      {
        width: r.width,
        height: r.height,
        quality: p.quality,
        calm: p.calm,
        focus: p.focus,
        autoTour: p.autoTour,
        forceQuality: p.forceQuality,
      },
    );
    manager.current = c;
    p.ready(c);
    return () => {
      manager.current = null;
      c.dispose();
      latest.current.ready(null);
    };
  }, [gl, scene, camera, invalidate]);
  useLayoutEffect(() => {
    manager.current?.settings(props.calm, props.quality, props.forceQuality);
  }, [props.calm, props.quality, props.forceQuality]);
  useLayoutEffect(() => {
    manager.current?.resize(size.width, size.height);
  }, [size.width, size.height]);
  useLayoutEffect(() => {
    gl.domElement.setAttribute("role", "img");
    gl.domElement.setAttribute("aria-label", tr(props.lang, "canvasLabel"));
  }, [gl, props.lang]);
  useLayoutEffect(() => {
    manager.current?.surface(props.mode);
    invalidate();
  }, [props.mode, invalidate]);
  useLayoutEffect(() => {
    invalidate();
  }, [props.labels, invalidate]);
  useFrame(() => {
    manager.current?.frame(performance.now());
    gl.render(scene, camera);
    manager.current?.rendered();
    const host = latest.current.labelHost.current;
    if (!host || !latest.current.labels) return;
    for (let i = 0; i < anchors.length; i++) {
      const el = host.children[i] as HTMLElement | undefined;
      if (!el) continue;
      projected.copy(anchors[i]!).project(camera);
      el.hidden =
        projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 0.96 || Math.abs(projected.y) > 0.85;
      el.style.left = 50 + projected.x * 50 + "%";
      el.style.top = 50 - projected.y * 50 + "%";
    }
  }, 1);
  return null;
}
class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function Viewer(props: Props & { fallback: ReactNode }) {
  return (
    <Boundary fallback={props.fallback}>
      <Canvas
        frameloop="demand"
        shadows="percentage"
        dpr={renderDpr(props.renderTier, typeof window === "undefined" ? 1 : window.devicePixelRatio)}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance", stencil: false }}
        camera={{ fov: 38, near: 0.065, far: 420, position: [0, 16, 33] }}
        fallback={props.fallback}
      >
        <Binding {...props} />
      </Canvas>
    </Boundary>
  );
}
