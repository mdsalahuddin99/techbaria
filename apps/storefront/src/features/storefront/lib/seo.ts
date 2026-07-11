import { useEffect } from "react";

/** Lightweight per-page SEO without pulling in react-helmet. */
export function useSeo({
  title,
  description,
  canonical,
}: {
  title: string;
  description?: string;
  canonical?: string;
}) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title.length > 60 ? title.slice(0, 57) + "..." : title;

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
      return el;
    };

    const metas: HTMLMetaElement[] = [];
    if (description) {
      metas.push(ensureMeta("description", description.slice(0, 158)));
    }

    let canonicalEl: HTMLLinkElement | null = null;
    if (canonical) {
      canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.rel = "canonical";
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.href = canonical;
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, canonical]);
}
