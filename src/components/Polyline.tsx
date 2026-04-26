import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface PolylineProps {
  path: Array<{ lat: number; lng: number }>;
  options?: {
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    icons?: Array<{
      icon: {
        path: string;
        strokeOpacity: number;
        scale: number;
      };
      offset: string;
      repeat: string;
    }>;
  };
}

interface GooglePolyline {
  setPath: (path: Array<{ lat: number; lng: number }>) => void;
  setOptions: (options: PolylineProps['options']) => void;
  setMap: (map: unknown) => void;
}

export function Polyline({ path, options }: PolylineProps) {
  const map = useMap();
  const polylineRef = useRef<GooglePolyline | null>(null);

  useEffect(() => {
    if (!map) return;

    // Access google.maps from window object
    const googleMaps = (window as typeof window & { google?: { maps: { Polyline: new (options: unknown) => GooglePolyline } } }).google?.maps;

    if (!polylineRef.current && googleMaps) {
      polylineRef.current = new googleMaps.Polyline({
        map,
        ...options,
      });
    }

    polylineRef.current?.setPath(path);
    if (options) {
      polylineRef.current?.setOptions(options);
    }

    return () => {
      polylineRef.current?.setMap(null);
    };
  }, [map, path, options]);

  return null;
}
