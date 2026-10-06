"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

/** Il CDN di Unsplash ridimensiona da sé: niente doppia ottimizzazione lato server. */
function unsplashLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 70));
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  return url.toString();
}

/** Solo questi host passano da next/image (sono configurati in next.config). Gli altri (foto dei provider) usano <img>. */
const OPTIMIZED_HOSTS = ["images.unsplash.com"];

function isOptimizable(src: string) {
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return src.startsWith("/");
  }
}

/**
 * Immagine di copertina con fallback a pannello del tabellone: se l'immagine non carica (rete, CDN, id errato)
 * l'utente vede il nome della meta sulla palette nera, mai un'icona rotta.
 */
export function CoverImage({ src, alt, sizes, priority, className, label }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string; label?: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Un errore avvenuto prima dell'idratazione non invoca onError: lo intercettiamo qui
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  const showImage = !!src && !failed;
  return (
    <div className={cn("relative overflow-hidden bg-board", className)}>
      {!showImage ? (
        label && <span className="flap absolute inset-0 flex items-end p-4 text-2xl text-board-text">{label}</span>
      ) : isOptimizable(src) ? (
        <Image
          ref={imgRef}
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loader={src.startsWith("https://images.unsplash.com") ? unsplashLoader : undefined}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={src} alt={alt} loading={priority ? "eager" : "lazy"} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
