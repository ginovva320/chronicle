import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface PolylineProps {
  path: google.maps.LatLngLiteral[];
  options?: google.maps.PolylineOptions;
}

export function Polyline({ path, options }: PolylineProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
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
