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

export function Polyline({ path, options }: PolylineProps) {
  const map = useMap();
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (!polylineRef.current && (window as any).google) {
      polylineRef.current = new (window as any).google.maps.Polyline({
        map,
        ...options,
      });
    }

    polylineRef.current.setPath(path);
    if (options) {
      polylineRef.current.setOptions(options);
    }

    return () => {
      polylineRef.current?.setMap(null);
    };
  }, [map, path, options]);

  return null;
}
