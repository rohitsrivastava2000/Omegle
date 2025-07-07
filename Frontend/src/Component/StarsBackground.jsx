import React, { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadStarsPreset } from "tsparticles-preset-stars";
import "./stars.css"; // we'll define glow styles here

export default function StarsBackground() {
  const particlesInit = useCallback(async (engine) => {
    await loadStarsPreset(engine);
  }, []);

  return (
    <div className="stars-container">
      {/* Glows on corners */}
      <div className="glow top-left" />
      <div className="glow bottom-right" />
      <div className="glow center-pulse" />

      {/* Stars animation */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          preset: "stars",
          background: { color: "transparent" },
          fullScreen: { enable: true, zIndex: -1 },
        }}
      />
    </div>
  );
}
