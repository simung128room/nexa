import React from "react";

interface NexaLogoProps {
  className?: string;
  size?: number | string;
  height?: number | string;
  width?: number | string;
  color?: string;
}

export const NexaEmblemLogo: React.FC<NexaLogoProps> = ({
  className = "",
  size,
  height = 36,
  width,
  color = "#09090b",
}) => {
  const finalHeight = size || height || 36;
  const finalWidth = size || width || "auto";

  return (
    <svg
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none filter drop-shadow-sm transition-transform duration-200 hover:scale-105 ${className}`}
      style={{
        height: finalHeight,
        width: finalWidth === "auto" ? "auto" : finalWidth,
        aspectRatio: "1/1",
      }}
      aria-label="NEXA Star Emblem"
    >
      {/* 
        5 Sharp Monolith Shards in Black with Cobalt Blue accent blade
      */}
      {/* Shard 1: Top Shard */}
      <polygon points="428,195 300,405 452,360" fill={color} />

      {/* Shard 2: Top-Right Shard */}
      <polygon points="452,252 670,300 548,338" fill={color} />

      {/* Shard 3: Right Wing Shard */}
      <polygon points="600,322 750,555 598,412" fill="#2563eb" />

      {/* Shard 4: Bottom Blade Shard (Pointing down) */}
      <polygon points="572,486 688,512 468,800" fill={color} />

      {/* Shard 5: Left Wing Shard (Pointing far left) */}
      <polygon points="160,398 492,642 452,360" fill={color} />
    </svg>
  );
};

export const StarEmblemLogo = NexaEmblemLogo;

export const NexaLogo: React.FC<{
  className?: string;
  height?: number | string;
  width?: number | string;
  showText?: boolean;
  color?: string;
}> = ({
  className = "",
  height = 34,
  width = "auto",
  showText = true,
  color = "#09090b",
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{ height, width: width === "auto" ? "auto" : width }}
    >
      <NexaEmblemLogo height={height} color={color} />
      {showText && (
        <span 
          className="text-zinc-950 font-bold tracking-[0.18em] text-[17px] select-none flex items-center drop-shadow-xs mt-0.5"
          style={{ fontFamily: "'Michroma', sans-serif" }}
        >
          NEXA
        </span>
      )}
    </div>
  );
};

export const ZeroworkLogo = NexaLogo;

