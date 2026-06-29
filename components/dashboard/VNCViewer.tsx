"use client";

import { memo, useEffect, useRef } from "react";

type VNCViewerProps = {
  streamUrl: string;
};

export const VNCViewer = memo(function VNCViewer({
  streamUrl,
}: VNCViewerProps) {
  const renderCount = useRef(0);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      renderCount.current += 1;
      console.debug("VNCViewer render count", renderCount.current);
    }
  });

  return (
    <iframe
      src={streamUrl}
      className="h-full w-full"
      style={{
        transformOrigin: "center",
        width: "100%",
        height: "100%",
      }}
      allow="autoplay"
    />
  );
});
