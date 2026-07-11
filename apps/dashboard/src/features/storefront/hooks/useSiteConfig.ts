"use client";

import { useState, useEffect } from "react";
import { getSiteConfig } from "../actions/config.actions";

export function useSiteConfig(key: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getSiteConfig(key).then((res) => {
      if (isMounted) {
        setData(res || {});
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setData({});
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [key]);

  return { data, loading };
}
