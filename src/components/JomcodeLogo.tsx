import React from "react";
import { ZeroworkLogo, StarEmblemLogo } from "./ZeroworkLogo";

export { ZeroworkLogo, StarEmblemLogo } from "./ZeroworkLogo";

interface JomcodeLogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
  variant?: "duo" | "light" | "dark" | "monochrome";
  showText?: boolean;
}

export const JomcodeLogo: React.FC<JomcodeLogoProps> = (props) => {
  return <ZeroworkLogo {...props} />;
};
