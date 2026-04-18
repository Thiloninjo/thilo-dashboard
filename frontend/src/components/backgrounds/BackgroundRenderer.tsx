import { lazy, Suspense } from "react";
import type { BackgroundId } from "./registry";

import {
  TimeOfDay, CleanWhite, AppleLight, PureDark, MidnightBlue,
  WarmDark, TexturedDark, SubtleMesh, Aurora, FlowingWaves,
  GlassBlobs, ParticleField, Topography,
} from "./css-backgrounds";

// Lazy-load Three.js backgrounds so they don't bloat the initial bundle
const Grid3D = lazy(() => import("./reactive-backgrounds").then(m => ({ default: m.Grid3D })));
const Sphere3D = lazy(() => import("./reactive-backgrounds").then(m => ({ default: m.Sphere3D })));
const WaveMesh3D = lazy(() => import("./reactive-backgrounds").then(m => ({ default: m.WaveMesh3D })));
const PointCloud3D = lazy(() => import("./reactive-backgrounds").then(m => ({ default: m.PointCloud3D })));

const Fallback = () => <div className="absolute inset-0" style={{ background: "#0a0a0f" }} />;

const CSS_MAP: Record<string, () => JSX.Element> = {
  "time-of-day": TimeOfDay,
  "clean-white": CleanWhite,
  "apple-light": AppleLight,
  "pure-dark": PureDark,
  "midnight-blue": MidnightBlue,
  "warm-dark": WarmDark,
  "textured-dark": TexturedDark,
  "subtle-mesh": SubtleMesh,
  "aurora": Aurora,
  "flowing-waves": FlowingWaves,
  "glass-blobs": GlassBlobs,
  "particle-field": ParticleField,
  "topography": Topography,
};

const THREE_MAP: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  "grid-3d": Grid3D,
  "sphere-3d": Sphere3D,
  "wave-mesh-3d": WaveMesh3D,
  "point-cloud-3d": PointCloud3D,
};

export function BackgroundRenderer({ id }: { id: BackgroundId }) {
  const CssBg = CSS_MAP[id];
  if (CssBg) {
    return (
      <div className="fixed inset-0 -z-10">
        <CssBg />
      </div>
    );
  }

  const ThreeBg = THREE_MAP[id];
  if (ThreeBg) {
    return (
      <div className="fixed inset-0 -z-10">
        <Suspense fallback={<Fallback />}>
          <ThreeBg />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10">
      <Fallback />
    </div>
  );
}
