import { GlassCard } from "../components/GlassCard";
import { PointCloudViewer } from "../components/PointCloudViewer";

export function PersonalDev() {
  return (
    <>
      <h2 className="text-2xl font-bold mb-2 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
        Personal Development
      </h2>
      <p className="text-white/50 text-sm mb-6 font-medium" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        Coming soon
      </p>
      <div className="flex justify-center">
        <div className="w-[500px] h-[400px] liquid-glass overflow-hidden">
          <PointCloudViewer />
        </div>
      </div>
    </>
  );
}
