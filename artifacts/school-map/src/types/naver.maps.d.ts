declare namespace naver {
  namespace maps {
    type MapTypeId = string;

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class Point {
      constructor(x: number, y: number);
    }

    interface MapOptions {
      center: LatLng;
      zoom: number;
      mapTypeId?: string;
      zoomControl?: boolean;
      zoomControlOptions?: { position: Position };
    }

    class Map {
      constructor(el: HTMLElement, options: MapOptions);
      panTo(latlng: LatLng, transitionOptions?: object): void;
      morph(latlng: LatLng, zoom?: number, transitionOptions?: object): void;
      setCenter(latlng: LatLng): void;
      setZoom(zoom: number): void;
      getZoom(): number;
      destroy(): void;
    }

    interface MarkerIcon {
      content: string;
      anchor: Point;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      icon?: MarkerIcon;
      zIndex?: number;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng;
    }

    interface CircleOptions {
      center: LatLng;
      radius: number;
      map?: Map;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
    }

    class Circle {
      constructor(options: CircleOptions);
      setMap(map: Map | null): void;
    }

    interface PolygonOptions {
      paths: LatLng[] | LatLng[][];
      map?: Map;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeLineCap?: string;
      strokeLineJoin?: string;
    }

    class Polygon {
      constructor(options: PolygonOptions);
      setMap(map: Map | null): void;
    }

    interface InfoWindowOptions {
      content: string;
      borderWidth?: number;
      backgroundColor?: string;
      borderColor?: string;
      disableAnchor?: boolean;
      pixelOffset?: Point;
    }

    class InfoWindow {
      constructor(options: InfoWindowOptions);
      open(map: Map, anchor: Marker): void;
      close(): void;
      setContent(content: string): void;
    }

    namespace Event {
      function addListener(
        target: Map | Marker | Circle | Polygon,
        type: string,
        listener: (e: MouseEvent & { latlng?: LatLng }) => void
      ): object;
      function removeListener(listener: object): void;
    }

    namespace Position {
      const TOP_RIGHT: number;
      const BOTTOM_RIGHT: number;
    }

    namespace MapTypeId {
      const NORMAL: string;
      const SATELLITE: string;
      const HYBRID: string;
      const TERRAIN: string;
    }
  }
}
