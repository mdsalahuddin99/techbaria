"use client";

import { useEffect, useRef, useState } from "react";

export function ScaledIframe({ html, title }: { html: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(1123); // Default A4 height

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    // Watch container width to calculate scale
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      // A4 width is ~794px (21cm at 96dpi)
      setScale(Math.min(1, width / 794));
    });
    
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Measure iframe content height once it loads
    const handleLoad = () => {
      try {
        const body = iframe.contentWindow?.document.body;
        const docHtml = iframe.contentWindow?.document.documentElement;
        if (body && docHtml) {
          const h = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            docHtml.clientHeight,
            docHtml.scrollHeight,
            docHtml.offsetHeight
          );
          setContentHeight(Math.max(1123, h));
        }
      } catch (e) {
        console.error("Could not measure iframe height", e);
      }
    };

    iframe.addEventListener("load", handleLoad);
    
    // Fallback: trigger after a short delay in case srcDoc loads instantly without firing load event
    const timer = setTimeout(handleLoad, 100);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      clearTimeout(timer);
    };
  }, [html]);

  return (
    <div 
      ref={containerRef} 
      className="w-full relative mx-auto overflow-hidden transition-all duration-200"
      style={{ height: `${contentHeight * scale}px`, maxWidth: "794px" }}
    >
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={html}
        className="absolute top-0 left-0 origin-top-left bg-white shadow-sm"
        style={{
          width: "794px",
          height: `${contentHeight}px`,
          border: 0,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
}
