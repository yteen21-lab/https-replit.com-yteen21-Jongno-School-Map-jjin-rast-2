declare namespace kakao {
  namespace maps {
    function load(callback: () => void): void;

    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }

    class Point {
      constructor(x: number, y: number);
    }

    class Size {
      constructor(width: number, height: number);
    }

    interface MapOptions {
      center: LatLng;
      level: number;
    }

    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      setLevel(level: number, options?: { animate?: { duration: number } }): void;
      getLevel(): number;
      panTo(latlng: LatLng): void;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      zIndex?: number;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng;
    }

    interface CustomOverlayOptions {
      position: LatLng;
      content: string | HTMLElement;
      map?: Map;
      zIndex?: number;
      xAnchor?: number;
      yAnchor?: number;
    }

    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng;
    }

    interface InfoWindowOptions {
      content: string;
      removable?: boolean;
    }

    class InfoWindow {
      constructor(options: InfoWindowOptions);
      open(map: Map, marker: Marker): void;
      close(): void;
      setContent(content: string): void;
    }

    interface CircleOptions {
      center: LatLng;
      radius: number;
      map?: Map;
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: string;
      fillColor?: string;
      fillOpacity?: number;
    }

    class Circle {
      constructor(options: CircleOptions);
      setMap(map: Map | null): void;
    }

    interface PolygonOptions {
      path: LatLng[];
      map?: Map;
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      fillColor?: string;
      fillOpacity?: number;
    }

    class Polygon {
      constructor(options: PolygonOptions);
      setMap(map: Map | null): void;
    }

    namespace event {
      function addListener(
        target: Map | Marker | CustomOverlay | Circle | Polygon,
        type: string,
        handler: (e?: any) => void
      ): object;
      function removeListener(listener: object): void;
    }

    namespace services {
      enum Status {
        OK = "OK",
        ZERO_RESULT = "ZERO_RESULT",
        ERROR = "ERROR",
      }
      enum SortBy {
        ACCURACY = "accuracy",
        DISTANCE = "distance",
      }
      interface PlaceSearchOptions {
        location?: LatLng;
        radius?: number;
        sort?: SortBy;
        category_group_code?: string;
        size?: number;
      }
      interface PlaceSearchResult {
        id: string;
        place_name: string;
        category_name: string;
        category_group_code: string;
        address_name: string;
        road_address_name: string;
        x: string;
        y: string;
        distance: string;
      }
      class Places {
        categorySearch(
          code: string,
          callback: (result: PlaceSearchResult[], status: Status) => void,
          options?: PlaceSearchOptions
        ): void;
        keywordSearch(
          keyword: string,
          callback: (result: PlaceSearchResult[], status: Status) => void,
          options?: PlaceSearchOptions
        ): void;
      }
      interface AddressSearchResult {
        address_name: string;
        address_type: string;
        x: string;
        y: string;
        address: Record<string, string> | null;
        road_address: Record<string, string> | null;
      }
      class Geocoder {
        addressSearch(
          address: string,
          callback: (result: AddressSearchResult[], status: Status) => void
        ): void;
        coord2Address(
          lng: number, lat: number,
          callback: (result: Array<{ address: Record<string, string>; road_address: Record<string, string> | null }>, status: Status) => void
        ): void;
      }
    }
  }
}
