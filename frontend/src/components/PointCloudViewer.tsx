import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Point data: [x, y, z, r, g, b]
type PointData = number[][];

function Cloud({ data }: { data: PointData }) {
  const ref = useRef<THREE.Points>(null);
  const { pointer } = useThree();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(data.length * 3);
    const col = new Float32Array(data.length * 3);
    data.forEach((p, i) => {
      pos[i * 3] = p[0];
      pos[i * 3 + 1] = p[1];
      pos[i * 3 + 2] = p[2];
      col[i * 3] = p[3];
      col[i * 3 + 1] = p[4];
      col[i * 3 + 2] = p[5];
    });
    return [pos, col];
  }, [data]);

  // Subtle rotation following mouse
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y = THREE.MathUtils.lerp(
      ref.current.rotation.y,
      pointer.x * 0.25,
      0.03
    );
    ref.current.rotation.x = THREE.MathUtils.lerp(
      ref.current.rotation.x,
      pointer.y * 0.12,
      0.03
    );
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={data.length}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={data.length}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}

export function PointCloudViewer() {
  const [data, setData] = useState<PointData>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/pointcloud.json")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <p className="text-white/40 text-sm">Point Cloud wird geladen...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <p className="text-white/40 text-sm">Kein Point Cloud vorhanden</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] rounded-3xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <Cloud data={data} />
      </Canvas>
    </div>
  );
}
