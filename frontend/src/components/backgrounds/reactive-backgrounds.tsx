/** Three.js reactive 3D backgrounds */

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ── Shared mouse tracker ── */

function useMousePosition() {
  const mouse = useRef(new THREE.Vector2(0, 0));
  const { gl } = useThree();

  useFrame(() => {
    // Read from a global so we don't need event listeners per component
    mouse.current.copy(_globalMouse);
  });

  // Attach listener once to the canvas
  useMemo(() => {
    const el = gl.domElement;
    const handler = (e: MouseEvent) => {
      _globalMouse.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [gl]);

  return mouse;
}

const _globalMouse = new THREE.Vector2(0, 0);

// Update global mouse from window level
if (typeof window !== "undefined") {
  window.addEventListener("mousemove", (e) => {
    _globalMouse.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
  });
}

/* ── 3D Grid ── */

function GridScene() {
  const meshRef = useRef<THREE.Points>(null);
  const mouse = useMousePosition();

  const { positions, count } = useMemo(() => {
    const size = 30;
    const step = 1;
    const pts: number[] = [];
    for (let x = -size; x <= size; x += step) {
      for (let z = -size; z <= size; z += step) {
        pts.push(x, 0, z);
      }
    }
    return { positions: new Float32Array(pts), count: pts.length / 3 };
  }, []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const posArr = mesh.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    const mx = mouse.current.x * 10;
    const mz = -mouse.current.y * 10;

    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      const dist = Math.sqrt((x - mx) ** 2 + (z - mz) ** 2);
      posArr[i * 3 + 1] = Math.sin(t * 0.8 + x * 0.3 + z * 0.3) * 0.5 + Math.exp(-dist * 0.15) * 2;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.slice(), 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#007AFF" size={0.06} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

export function Grid3D() {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f" }}>
      <Canvas camera={{ position: [0, 12, 18], fov: 50 }} style={{ position: "absolute", inset: 0 }}>
        <GridScene />
      </Canvas>
    </div>
  );
}

/* ── Floating Sphere ── */

function SphereScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouse = useMousePosition();

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, mouse.current.x * 2, 0.03);
    mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, mouse.current.y * 1.5, 0.03);
    mesh.rotation.x = t * 0.15;
    mesh.rotation.y = t * 0.2;
    mesh.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05);
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[3, 3, 5]} intensity={0.8} color="#007AFF" />
      <pointLight position={[-3, -2, 3]} intensity={0.4} color="#8A2BE2" />
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.8, 3]} />
        <meshStandardMaterial color="#1a1a2e" wireframe transparent opacity={0.6} />
      </mesh>
    </>
  );
}

export function Sphere3D() {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f" }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} style={{ position: "absolute", inset: 0 }}>
        <SphereScene />
      </Canvas>
    </div>
  );
}

/* ── Wave Mesh ── */

function WaveMeshScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouse = useMousePosition();

  const geo = useMemo(() => new THREE.PlaneGeometry(30, 30, 80, 80), []);
  const basePositions = useMemo(() => new Float32Array(geo.attributes.position.array), [geo]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const posArr = mesh.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    const mx = mouse.current.x * 8;
    const my = mouse.current.y * 8;

    for (let i = 0; i < posArr.length; i += 3) {
      const x = basePositions[i];
      const y = basePositions[i + 1];
      const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      posArr[i + 2] = Math.sin(t + x * 0.4) * 0.4 + Math.cos(t * 0.7 + y * 0.3) * 0.3 + Math.exp(-dist * 0.2) * 1.5;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI * 0.45, 0, 0]} position={[0, -2, 0]} geometry={geo}>
      <meshStandardMaterial color="#007AFF" wireframe transparent opacity={0.2} />
    </mesh>
  );
}

export function WaveMesh3D() {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f" }}>
      <Canvas camera={{ position: [0, 8, 12], fov: 50 }} style={{ position: "absolute", inset: 0 }}>
        <ambientLight intensity={0.3} />
        <WaveMeshScene />
      </Canvas>
    </div>
  );
}

/* ── Point Cloud ── */

function PointCloudScene() {
  const pointsRef = useRef<THREE.Points>(null);
  const mouse = useMousePosition();

  const { positions, velocities, count } = useMemo(() => {
    const n = 800;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    return { positions: pos, velocities: vel, count: n };
  }, []);

  useFrame(() => {
    const pts = pointsRef.current;
    if (!pts) return;
    const posArr = pts.geometry.attributes.position.array as Float32Array;
    const mx = mouse.current.x * 6;
    const my = mouse.current.y * 6;

    for (let i = 0; i < count; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
      // Gravity toward mouse
      const dx = mx - posArr[ix], dy = my - posArr[iy];
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.5;
      const force = 0.0003 / dist;
      velocities[ix] += dx * force;
      velocities[iy] += dy * force;

      posArr[ix] += velocities[ix];
      posArr[iy] += velocities[iy];
      posArr[iz] += velocities[iz];

      // Damping
      velocities[ix] *= 0.998;
      velocities[iy] *= 0.998;
      velocities[iz] *= 0.998;

      // Bounds
      if (Math.abs(posArr[ix]) > 8) velocities[ix] *= -0.5;
      if (Math.abs(posArr[iy]) > 8) velocities[iy] *= -0.5;
      if (Math.abs(posArr[iz]) > 8) velocities[iz] *= -0.5;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#7A9FFF" size={0.05} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export function PointCloud3D() {
  return (
    <div className="absolute inset-0" style={{ background: "#0a0a0f" }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} style={{ position: "absolute", inset: 0 }}>
        <PointCloudScene />
      </Canvas>
    </div>
  );
}
