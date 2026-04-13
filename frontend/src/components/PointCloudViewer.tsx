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

  // Auto-rotate slowly, oscillating ±20° around center
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // Gentle oscillation: Math.sin gives smooth back-and-forth
    const autoRotateY = Math.sin(t * 0.3) * 0.2; // ±12°
    const autoRotateX = Math.sin(t * 0.2) * 0.05; // ±3° subtle vertical

    ref.current.rotation.y = Math.PI + autoRotateY;
    ref.current.rotation.x = autoRotateX;
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
        size={0.006}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.95}
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
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <Cloud data={data} />
      </Canvas>
    </div>
  );
}
