import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Expand,
  Layers,
  Minimize2,
  Minus,
  Move,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapCanvasSkeleton } from '@/components/ui/page-skeletons';
import { toast } from '@/components/ui/sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { districtsApi, neighborhoodsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAppStore } from '@/store';

type GeoJsonCoordinates = number[] | GeoJsonCoordinates[];
type YMapsPolygonCoords = [number, number][][] | [number, number][][][];

interface GeoJsonDistrictFeature {
  properties: {
    name: string;
    center?: [number, number];
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: GeoJsonCoordinates;
  };
}

interface GeoJsonFeatureCollection {
  features: GeoJsonDistrictFeature[];
}

interface GeoJsonProvinceBoundary {
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: GeoJsonCoordinates;
  };
}

interface YMapsEvent {
  get: (key: string) => unknown;
  preventDefault: () => void;
}

interface YMapsEventsManager {
  add: (event: string, handler: (e: YMapsEvent) => void) => void;
}

interface YMapsOptionsManager {
  set: (keyOrOptions: string | Record<string, unknown>, value?: unknown) => void;
}

interface YMapsGeoObject {
  events: YMapsEventsManager;
  options: YMapsOptionsManager;
  geometry: {
    getCoordinates: () => [number, number];
  };
}

interface YMapsMapInstance {
  setBounds: (
    bounds: [[number, number], [number, number]],
    options?: Record<string, unknown>,
  ) => void;
  getZoom: () => number;
  setZoom: (zoom: number, options?: Record<string, unknown>) => void;
  setType: (type: 'yandex#map' | 'yandex#satellite' | 'yandex#hybrid') => void;
  behaviors: {
    enable: (behavior: string) => void;
  };
  events: YMapsEventsManager;
  geoObjects: {
    add: (obj: YMapsGeoObject) => void;
    remove: (obj: YMapsGeoObject) => void;
  };
  container?: {
    fitToViewport: () => void;
  };
  destroy: () => void;
}

interface YMapsNamespace {
  ready: (cb: () => void) => void;
  Map: new (
    element: HTMLElement,
    state: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => YMapsMapInstance;
  Polygon: new (
    geometry: YMapsPolygonCoords,
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => YMapsGeoObject;
  Placemark: new (
    geometry: [number, number],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => YMapsGeoObject;
  templateLayoutFactory: {
    createClass: (template: string) => unknown;
  };
}

declare global {
  interface Window {
    ymaps?: YMapsNamespace;
  }
}

function toYmapsPolygonCoords(
  type: 'Polygon' | 'MultiPolygon',
  rawCoords: GeoJsonCoordinates,
): YMapsPolygonCoords {
  const flipPoint = (pt: number[]): [number, number] =>
    pt[0] > 50 ? [pt[1], pt[0]] : [pt[0], pt[1]];

  if (type === 'Polygon') {
    return (rawCoords as number[][][]).map((ring) => ring.map(flipPoint));
  }
  return (rawCoords as number[][][][]).map((poly) => poly.map((ring) => ring.map(flipPoint)));
}

export interface DistrictStat {
  id: string;
  name: string;
  region_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  count: number;
  totalLoss: number;
  percent?: number;
}

export interface NeighborhoodStat {
  id: string;
  name: string;
  district_id: string;
  district_name: string | null;
  latitude?: number | null;
  longitude?: number | null;
  count: number;
  totalLoss: number;
  percent?: number;
}

interface Props {
  districtsData: DistrictStat[];
  neighborhoodsData?: NeighborhoodStat[];
  allowedDistrictNames?: string[];
  isLoading?: boolean;
  periodLabel?: string;
  entityLabel?: string;
  onDistrictSelect?: (districtName: string | null) => void;
}

const YANDEX_API_KEY = (import.meta.env.VITE_YANDEX_MAPS_API_KEY || '').trim();
const PROVINCE_BOUNDS: [[number, number], [number, number]] = [
  [38.0075, 64.3777],
  [39.57, 67.6851],
];
const DEFAULT_CENTER: [number, number] = [38.7888, 66.0314];
const DEFAULT_ZOOM = 8;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const formatUZS = (val?: number | null) => {
  if (!val) return '0 UZS';
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} mlrd UZS`;
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)} mln UZS`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)} ming UZS`;
  return `${val.toLocaleString('uz-UZ')} UZS`;
};

// Xavflilik darajasi bo'yicha badge rangi
function getRiskBadgeColor(count: number, maxCount: number) {
  if (count === 0) {
    return {
      badgeBg: '#64748b', // Tinch: Slate / Kulrang
      label: 'Tinch',
    };
  }
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio >= 0.6) {
    return {
      badgeBg: '#dc2626', // Yuqori: Toza qizil
      label: 'Yuqori',
    };
  }
  if (ratio >= 0.25) {
    return {
      badgeBg: '#2563eb', // O'rtacha: To'q ko'k / Moviy
      label: 'O‘rtacha',
    };
  }
  return {
    badgeBg: '#059669', // Past: Zumrad yashil
    label: 'Kam',
  };
}

export const QashqadaryoYandexMap: React.FC<Props> = ({
  districtsData,
  neighborhoodsData = [],
  allowedDistrictNames,
  isLoading = false,
  entityLabel = 'Arizalar',
  onDistrictSelect,
}) => {
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const outerWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<YMapsMapInstance | null>(null);
  const districtPolygonsRef = useRef<YMapsGeoObject[]>([]);
  const placemarksRef = useRef<YMapsGeoObject[]>([]);
  const mahallaPlacemarksRef = useRef<YMapsGeoObject[]>([]);

  const [isYmapsReady, setIsYmapsReady] = useState(false);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(null);
  const selectedDistrictNameRef = useRef<string | null>(null);
  const onDistrictSelectRef = useRef(onDistrictSelect);
  useEffect(() => {
    onDistrictSelectRef.current = onDistrictSelect;
  }, [onDistrictSelect]);
  useEffect(() => {
    selectedDistrictNameRef.current = selectedDistrictName;
  }, [selectedDistrictName]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'yandex#map' | 'yandex#satellite' | 'yandex#hybrid'>(
    () => {
      try {
        const saved = localStorage.getItem('uvd_dashboard_map_type');
        if (saved === 'yandex#satellite' || saved === 'yandex#hybrid' || saved === 'yandex#map') {
          return saved;
        }
      } catch {
        /* ignore */
      }
      return 'yandex#map';
    },
  );
  const initialMapTypeRef = useRef(mapType);

  const handleChangeMapType = (nextType: 'yandex#map' | 'yandex#satellite' | 'yandex#hybrid') => {
    setMapType(nextType);
    mapInstanceRef.current?.setType(nextType);
    try {
      localStorage.setItem('uvd_dashboard_map_type', nextType);
    } catch {
      /* ignore */
    }
  };

  // Foydalanuvchi tomonidan surilgan nishonlar koordinatalari (localStorage da saqlanadi)
  const [customCenters, setCustomCenters] = useState<Record<string, [number, number]>>(() => {
    try {
      const saved = localStorage.getItem('uvd_district_badge_centers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Oxirgi ko'chirilgan tuman (alohida bittasini qaytarish uchun)
  const [lastMovedDistrict, setLastMovedDistrict] = useState<string | null>(null);

  // Kordinatalarni surish rejimi faolligi (barcha nishonlarni ushlab tortish mumkin)
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);

  // Bitta tumanning yangi koordinatasini saqlash (PostgreSQL bazaga + lokal holatga)
  const handleUpdateDistrictCenter = useCallback(
    (dName: string, newCoords: [number, number], districtId?: string) => {
      setCustomCenters((prev) => {
        const updated = { ...prev, [dName]: newCoords };
        try {
          localStorage.setItem('uvd_district_badge_centers', JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
      setLastMovedDistrict(dName);

      if (districtId && !isReadOnly) {
        void districtsApi
          .update(districtId, { latitude: newCoords[0], longitude: newCoords[1] })
          .then(() => {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.applications.dashboardStatistics,
            });
            void queryClient.invalidateQueries({ queryKey: queryKeys.references.districts });
            toast.success(`"${dName}" koordinatasi bazaga saqlandi`);
          })
          .catch(() => {
            /* lokal holatda qoladi */
          });
      }
    },
    [isReadOnly, queryClient],
  );

  // Bitta tumanning koordinatasini dastlabki holatga qaytarish
  const handleResetSingleDistrict = useCallback(
    (dName: string) => {
      setCustomCenters((prev) => {
        const updated = { ...prev };
        delete updated[dName];
        try {
          localStorage.setItem('uvd_district_badge_centers', JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
      if (lastMovedDistrict === dName) {
        setLastMovedDistrict(null);
      }
    },
    [lastMovedDistrict],
  );

  // Barcha tumanlarning koordinatalarini dastlabki holatga qaytarish
  const handleResetAllDistricts = () => {
    try {
      localStorage.removeItem('uvd_district_badge_centers');
    } catch {
      /* ignore */
    }
    setCustomCenters({});
    setLastMovedDistrict(null);
    setIsMoveMode(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setBounds(PROVINCE_BOUNDS, {
        checkZoomRange: true,
        zoomMargin: [25, 25, 45, 25],
        duration: 600,
        timingFunction: 'ease-in-out',
      });
    }
  };

  // Foydalanuvchi tomonidan surilgan mahallalar koordinatalari (localStorage da saqlanadi)
  const [customMahallaCenters, setCustomMahallaCenters] = useState<
    Record<string, [number, number]>
  >(() => {
    try {
      const saved = localStorage.getItem('uvd_mahalla_badge_centers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [lastMovedMahalla, setLastMovedMahalla] = useState<string | null>(null);

  const handleUpdateMahallaCenter = useCallback(
    (coordKey: string, newCoords: [number, number], neighborhoodId?: string) => {
      setCustomMahallaCenters((prev) => {
        const updated = { ...prev, [coordKey]: newCoords };
        try {
          localStorage.setItem('uvd_mahalla_badge_centers', JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
      setLastMovedMahalla(coordKey);

      if (neighborhoodId && !isReadOnly) {
        void neighborhoodsApi
          .update(neighborhoodId, { latitude: newCoords[0], longitude: newCoords[1] })
          .then(() => {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.applications.dashboardStatistics,
            });
            void queryClient.invalidateQueries({ queryKey: queryKeys.references.neighborhoods });
            toast.success('Mahalla koordinatasi bazaga saqlandi');
          })
          .catch(() => {
            /* lokal holatda qoladi */
          });
      }
    },
    [isReadOnly, queryClient],
  );

  const handleResetSingleMahalla = useCallback(
    (coordKey: string) => {
      setCustomMahallaCenters((prev) => {
        const updated = { ...prev };
        delete updated[coordKey];
        try {
          localStorage.setItem('uvd_mahalla_badge_centers', JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
      if (lastMovedMahalla === coordKey) {
        setLastMovedMahalla(null);
      }
    },
    [lastMovedMahalla],
  );

  const handleResetAllMahallas = () => {
    try {
      localStorage.removeItem('uvd_mahalla_badge_centers');
    } catch {
      /* ignore */
    }
    setCustomMahallaCenters({});
    setLastMovedMahalla(null);
    setIsMoveMode(false);
  };

  // Eng yuqori arizalar soni (badge nisbati uchun)
  const maxDistrictCount = useMemo(() => {
    if (!districtsData || districtsData.length === 0) return 1;
    return Math.max(...districtsData.map((d) => d.count), 1);
  }, [districtsData]);

  // GeoJSON ma'lumotlarni JS bundle dan chiqarib, public/geo/ dan lazy yuklaymiz
  const { data: realDistrictsData } = useQuery<GeoJsonFeatureCollection>({
    queryKey: queryKeys.geo.districts,
    queryFn: async () => {
      const res = await fetch('/geo/qashqadaryo-real-districts.json');
      if (!res.ok) throw new Error('Tumanlar GeoJSON yuklanmadi');
      return res.json() as Promise<GeoJsonFeatureCollection>;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: provinceBoundaryData } = useQuery<GeoJsonProvinceBoundary>({
    queryKey: queryKeys.geo.provinceBoundary,
    queryFn: async () => {
      const res = await fetch('/geo/qashqadaryo-province-boundary.json');
      if (!res.ok) throw new Error('Viloyat chegarasi GeoJSON yuklanmadi');
      return res.json() as Promise<GeoJsonProvinceBoundary>;
    },
    enabled: selectedDistrictName !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: neighborhoodsCoordsData } = useQuery<Record<string, [number, number]>>({
    queryKey: queryKeys.geo.neighborhoodsCoords,
    queryFn: async () => {
      const res = await fetch('/geo/qashqadaryo-neighborhoods-coords.json');
      if (!res.ok) throw new Error('Mahallalar koordinatalari yuklanmadi');
      return res.json() as Promise<Record<string, [number, number]>>;
    },
    enabled: selectedDistrictName !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Tuman xodimi (DISTRICT_OFFICER) uchun faqat ruxsat etilgan tumanlar chegaralari
  const visibleDistrictFeatures = useMemo(() => {
    const allFeatures = realDistrictsData?.features || [];
    if (!allowedDistrictNames) return allFeatures;
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/['`‘’]/g, '')
        .trim();
    const allowedSet = new Set(allowedDistrictNames.map(normalize));
    return allFeatures.filter((feat) => allowedSet.has(normalize(feat.properties.name || '')));
  }, [allowedDistrictNames, realDistrictsData]);

  // Xarita uchun standart chegaralar (DISTRICT_OFFICER bo'lsa biriktirilgan tumanlarga yaqinlashadi)
  const defaultMapBounds = useMemo<[[number, number], [number, number]]>(() => {
    if (!allowedDistrictNames || visibleDistrictFeatures.length === 0) {
      return PROVINCE_BOUNDS;
    }
    let minLat = 999,
      maxLat = -999,
      minLng = 999,
      maxLng = -999;
    const walk = (c: GeoJsonCoordinates) => {
      if (typeof c[0] === 'number') {
        const pt = c as number[];
        const lat = pt[0] > 50 ? pt[1] : pt[0];
        const lng = pt[0] > 50 ? pt[0] : pt[1];
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      } else {
        (c as GeoJsonCoordinates[]).forEach(walk);
      }
    };
    visibleDistrictFeatures.forEach((feat) => walk(feat.geometry.coordinates));
    if (minLat === 999) return PROVINCE_BOUNDS;
    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  }, [allowedDistrictNames, visibleDistrictFeatures]);

  // Tuman nomlari xaritasi
  const districtStatsMap = useMemo(() => {
    const map = new Map<string, DistrictStat>();
    districtsData.forEach((d) => {
      map.set(d.name, d);
      const clean = d.name.toLowerCase().replace(/['`‘]/g, '');
      map.set(clean, d);
    });
    return map;
  }, [districtsData]);

  // Tanlangan tumandagi mahallalar ro'yxati
  const districtNeighborhoods = useMemo(() => {
    if (!selectedDistrictName) return [];
    return neighborhoodsData
      .filter((m) => {
        if (!m.district_name) return false;
        return (
          m.district_name.toLowerCase() === selectedDistrictName.toLowerCase() ||
          m.district_name.replace(/['`‘]/g, '').toLowerCase() ===
            selectedDistrictName.replace(/['`‘]/g, '').toLowerCase()
        );
      })
      .sort((a, b) => b.count - a.count);
  }, [selectedDistrictName, neighborhoodsData]);

  // 1. Fullscreen hodisasini kuzatish
  useEffect(() => {
    let fsTimer: ReturnType<typeof setTimeout> | null = null;
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (mapInstanceRef.current) {
        if (fsTimer) clearTimeout(fsTimer);
        fsTimer = setTimeout(() => mapInstanceRef.current?.container?.fitToViewport(), 200);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      if (fsTimer) clearTimeout(fsTimer);
    };
  }, []);

  // 1.1. Konteyner o'lchami o'zgarganda (masalan o'ng statistika paneli ochilib-yopilganda) xaritani moslashtirish
  useEffect(() => {
    const el = outerWrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        mapInstanceRef.current?.container?.fitToViewport();
      }, 90);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!outerWrapperRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await outerWrapperRef.current.requestFullscreen();
      } catch {
        setIsFullscreen(true);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  };

  // 2. Yandex Maps SDK yuklash (mavjud skript deadlock'ini oldini olish bilan)
  useEffect(() => {
    let isMounted = true;
    const markReady = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => {
          if (isMounted) setIsYmapsReady(true);
        });
      }
    };

    if (window.ymaps) {
      markReady();
      return () => {
        isMounted = false;
      };
    }

    const scriptId = 'yandex-maps-script-tag';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (script && script.dataset.failed === 'true') {
      script.remove();
      script = null;
    }

    const handleLoad = () => {
      markReady();
    };
    const handleError = () => {
      if (script) {
        script.dataset.failed = 'true';
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      const keyParam = YANDEX_API_KEY ? `apikey=${encodeURIComponent(YANDEX_API_KEY)}&` : '';
      script.src = `https://api-maps.yandex.ru/2.1/?${keyParam}lang=uz_UZ`;
      script.async = true;
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
    }

    return () => {
      isMounted = false;
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, []);

  // 3. Tuman tanlash va yaqinlashish (Zoom in)
  const handleSelectDistrict = useCallback(
    (districtName: string | null) => {
      setSelectedDistrictName(districtName);
      if (onDistrictSelectRef.current) {
        onDistrictSelectRef.current(districtName);
      }

      const map = mapInstanceRef.current;
      if (!map || !window.ymaps) return;

      if (!districtName) {
        // Umumiy ko'rinishga markazlashgan holda qaytish (tuman xodimi uchun o'z tumanlariga)
        map.setBounds(defaultMapBounds, {
          checkZoomRange: true,
          zoomMargin: allowedDistrictNames ? [50, 50, 50, 50] : [25, 25, 45, 25],
          duration: 600,
          timingFunction: 'ease-in-out',
        });
        return;
      }

      // Tanlangan tumanning aniq geometrik chegaralariga (Bounds) silliq yaqinlashish
      const feat = visibleDistrictFeatures.find(
        (f) => f.properties.name.toLowerCase() === districtName.toLowerCase(),
      );

      if (feat) {
        let minLat = 999,
          maxLat = -999,
          minLng = 999,
          maxLng = -999;
        const walk = (c: GeoJsonCoordinates) => {
          if (typeof c[0] === 'number') {
            const pt = c as number[];
            const lat = pt[0] > 50 ? pt[1] : pt[0];
            const lng = pt[0] > 50 ? pt[0] : pt[1];
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          } else {
            (c as GeoJsonCoordinates[]).forEach(walk);
          }
        };
        walk(feat.geometry.coordinates);

        if (minLat !== 999) {
          const districtBounds: [[number, number], [number, number]] = [
            [minLat, minLng],
            [maxLat, maxLng],
          ];

          map.setBounds(districtBounds, {
            checkZoomRange: true,
            zoomMargin: [50, 50, 50, 50],
            duration: 600,
            timingFunction: 'ease-in-out',
          });
        }
      }
    },
    [defaultMapBounds, allowedDistrictNames, visibleDistrictFeatures],
  );

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const cur = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(Math.min(14, cur + 1), {
        duration: 250,
        timingFunction: 'ease-out',
      });
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const cur = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(Math.max(7, cur - 1), {
        duration: 250,
        timingFunction: 'ease-out',
      });
    }
  };

  // 4. Xaritani initsializatsiya qilish
  useEffect(() => {
    if (!isYmapsReady || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const ymaps = window.ymaps;
      if (!ymaps) return;
      const map = new ymaps.Map(
        mapContainerRef.current,
        {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          controls: ['zoomControl'],
          type: initialMapTypeRef.current,
        },
        {
          suppressMapOpenBlock: true,
          minZoom: 7,
          maxZoom: 14,
        },
      );

      // Viloyatni butun ekran bo'ylab markazlashtirib joylashtirish
      map.setBounds(PROVINCE_BOUNDS, {
        checkZoomRange: true,
        zoomMargin: [25, 25, 45, 25],
      });

      // Barcha zoom va pan imo-ishoralarini yoqish
      map.behaviors.enable('scrollZoom');
      map.behaviors.enable('drag');
      map.behaviors.enable('multiTouch');
      map.behaviors.enable('dblClickZoom');

      // Qashqadaryodan tashqariga bosilganda viloyat umumiy xaritasiga qaytarish
      map.events.add('click', (e) => {
        if (e.get('target') === map && selectedDistrictNameRef.current) {
          handleSelectDistrict(null);
        }
      });

      mapInstanceRef.current = map;
    } catch (err) {
      console.error('Yandex Maps init error:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch {
          /* ignore */
        }
        mapInstanceRef.current = null;
      }
    };
  }, [isYmapsReady, handleSelectDistrict]);

  // 5. CHEGARALARNI CHIZISH (YUZASINI BO'YAMASDAN - FAQAT TINIQ BORDERLAR BILAN)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const ymaps = window.ymaps;
    if (!map || !ymaps) return;

    // Eski poligonlar va markerlarni tozalash
    districtPolygonsRef.current.forEach((poly) => map.geoObjects.remove(poly));
    districtPolygonsRef.current = [];

    placemarksRef.current.forEach((pm) => map.geoObjects.remove(pm));
    placemarksRef.current = [];

    const isZoomedIn = selectedDistrictName !== null;

    // Tuman tanlanganda viloyat tashqi chegarasi qora rangda paydo bo'lishi
    if (isZoomedIn && provinceBoundaryData) {
      const provinceGeo = provinceBoundaryData as unknown as GeoJsonProvinceBoundary;
      const provinceYmapsCoords = toYmapsPolygonCoords(
        provinceGeo.geometry.type,
        provinceGeo.geometry.coordinates,
      );

      const provincePolygon = new ymaps.Polygon(
        provinceYmapsCoords,
        {
          hintContent: '<b>Qashqadaryo Viloyati chegarasi</b>',
        },
        {
          fill: false,
          strokeColor: isDark ? '#e2e8f0' : '#000000', // Viloyat borderi (dark/light)
          strokeWidth: 2.5,
          strokeOpacity: 0.95,
          interactive: false,
        },
      );

      map.geoObjects.add(provincePolygon);
      districtPolygonsRef.current.push(provincePolygon);
    }

    // Tuman xodimi uchun xarita avtomatik o'z tuman(lar)iga markazlashadi
    if (!isZoomedIn && allowedDistrictNames && visibleDistrictFeatures.length > 0) {
      map.setBounds(defaultMapBounds, {
        checkZoomRange: true,
        zoomMargin: [50, 50, 50, 50],
        duration: 400,
      });
    }

    const pendingClickTimers: Array<ReturnType<typeof setTimeout>> = [];

    // Ruxsat etilgan tuman chegaralari (DISTRICT_OFFICER uchun faqat biriktirilgan tumanlar)
    visibleDistrictFeatures.forEach((feat) => {
      const dName = feat.properties.name;
      const safeDName = escapeHtml(dName);
      const safeEntityLabel = escapeHtml(entityLabel);
      const isSelected = selectedDistrictName?.toLowerCase() === dName.toLowerCase();

      const stat: DistrictStat = districtStatsMap.get(dName) ||
        districtStatsMap.get(dName.toLowerCase().replace(/['`‘]/g, '')) || {
          id: '',
          name: dName,
          count: 0,
          totalLoss: 0,
        };

      const colors = getRiskBadgeColor(stat.count, maxDistrictCount);

      // GeoJSON [lng, lat] ni Yandex [lat, lng] formatiga o'tkazish
      const ymapsCoords = toYmapsPolygonCoords(feat.geometry.type, feat.geometry.coordinates);

      const defaultStroke = isSelected
        ? isDark
          ? '#f8fafc'
          : '#000000'
        : isDark
          ? '#60a5fa'
          : '#1e40af';
      const hoverStroke = isSelected
        ? isDark
          ? '#ffffff'
          : '#000000'
        : isDark
          ? '#38bdf8'
          : '#0284c7';

      // Shaffof poligon (Yuzasi bo'yalmaydi! Faqat nozik chegara chizig'i)
      const districtPolygon = new ymaps.Polygon(
        ymapsCoords,
        {
          hintContent: `<b>${safeDName}</b><br/>${safeEntityLabel}: ${Number(stat.count) || 0} ta<br/>Zarar: ${escapeHtml(formatUZS(stat.totalLoss))}`,
        },
        {
          fillColor: isDark ? '#38bdf8' : '#0284c7',
          fillOpacity: isSelected ? (isDark ? 0.14 : 0.08) : 0.001,
          strokeColor: defaultStroke,
          strokeWidth: isSelected ? 2.5 : 1.3,
          strokeOpacity: isZoomedIn && !isSelected ? 0.25 : 0.9,
          cursor: 'pointer',
        },
      );

      // Hover hodisalari
      districtPolygon.events.add('mouseenter', () => {
        setHoveredDistrict(dName);
        districtPolygon.options.set({
          strokeColor: hoverStroke,
          strokeWidth: 2.5,
          fillOpacity: isDark ? 0.2 : 0.15,
        });
      });

      districtPolygon.events.add('mouseleave', () => {
        setHoveredDistrict(null);
        districtPolygon.options.set({
          strokeColor: defaultStroke,
          strokeWidth: isSelected ? 2.5 : 1.3,
          fillOpacity: isSelected ? (isDark ? 0.14 : 0.08) : 0.001,
        });
      });

      districtPolygon.events.add('click', () => {
        handleSelectDistrict(dName);
      });

      map.geoObjects.add(districtPolygon);
      districtPolygonsRef.current.push(districtPolygon);

      // C. Tuman Ustida Arizalar Soni Nishoni (Bazadagi koordinata ustuvor, aks holda GeoJSON markazi)
      const dbCenter: [number, number] | null =
        stat.latitude != null && stat.longitude != null
          ? [Number(stat.latitude), Number(stat.longitude)]
          : null;
      const defaultCenter: [number, number] | undefined = dbCenter || feat.properties.center;
      if (!isZoomedIn && defaultCenter) {
        const currentCenter: [number, number] = customCenters[dName] || defaultCenter;
        const isCustom = Boolean(customCenters[dName]);

        const BadgeLayout = ymaps.templateLayoutFactory.createClass(`
          <div style="
            transform: translate(-50%, -50%);
            cursor: ${isMoveMode ? 'grab' : 'pointer'};
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            user-select: none;
            width: 36px;
            height: 36px;
          " title="${safeDName}: ${Number(stat.count) || 0} ta (Surish uchun 2 marta bosing)">
            <svg width="36" height="36" viewBox="0 0 36 36" style="overflow: visible; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="${colors.badgeBg}"
                stroke="${isCustom ? '#38bdf8' : '#ffffff'}"
                stroke-width="2.5"
              />
              <text
                x="18"
                y="22.5"
                text-anchor="middle"
                fill="#ffffff"
                font-size="13"
                font-weight="900"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              >${Number(stat.count) || 0}</text>
            </svg>
          </div>
        `);

        const placemark = new ymaps.Placemark(
          currentCenter,
          {},
          {
            iconLayout: BadgeLayout,
            iconPane: 'overlaps',
            hasBalloon: false,
            draggable: isMoveMode,
            cursor: isMoveMode ? 'grab' : 'pointer',
          },
        );

        // Kordinata surib yakunlanganda saqlash
        placemark.events.add('dragend', () => {
          const newCoords = placemark.geometry.getCoordinates();
          handleUpdateDistrictCenter(
            dName,
            [Number(newCoords[0].toFixed(5)), Number(newCoords[1].toFixed(5))],
            stat.id || undefined,
          );
        });

        // 2 marta bosganda surishni ochish (yoki bir marta bosganda yaqinlashish)
        let clickTimer: ReturnType<typeof setTimeout> | null = null;
        placemark.events.add('click', () => {
          if (isMoveMode) return;
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            placemark.options.set('draggable', true);
            setIsMoveMode(true);
            setLastMovedDistrict(dName);
            return;
          }
          clickTimer = setTimeout(() => {
            clickTimer = null;
            handleSelectDistrict(dName);
          }, 250);
          pendingClickTimers.push(clickTimer);
        });

        placemark.events.add('dblclick', (e) => {
          e.preventDefault();
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
          }
          placemark.options.set('draggable', true);
          setIsMoveMode(true);
          setLastMovedDistrict(dName);
        });

        placemark.events.add('mouseenter', () => {
          setHoveredDistrict(dName);
          districtPolygon.options.set({
            strokeColor: '#0284c7',
            strokeWidth: 2.5,
            fillOpacity: 0.15,
          });
        });

        placemark.events.add('mouseleave', () => {
          setHoveredDistrict(null);
          districtPolygon.options.set({
            strokeColor: isSelected ? '#000000' : '#1e40af',
            strokeWidth: isSelected ? 2.5 : 1.2,
            fillOpacity: isSelected ? 0.08 : 0.001,
          });
        });

        map.geoObjects.add(placemark);
        placemarksRef.current.push(placemark);
      }
    });

    return () => {
      pendingClickTimers.forEach((t) => clearTimeout(t));
    };
  }, [
    isYmapsReady,
    districtsData,
    districtStatsMap,
    maxDistrictCount,
    selectedDistrictName,
    handleSelectDistrict,
    customCenters,
    isMoveMode,
    handleUpdateDistrictCenter,
    visibleDistrictFeatures,
    allowedDistrictNames,
    defaultMapBounds,
    entityLabel,
    isDark,
    provinceBoundaryData,
  ]);

  // 6. TANLANGAN TUMAN ICHIDA MAHALLALARNI KO'RSATISH
  useEffect(() => {
    const map = mapInstanceRef.current;
    const ymaps = window.ymaps;
    if (!map || !ymaps) return;

    mahallaPlacemarksRef.current.forEach((pm) => map.geoObjects.remove(pm));
    mahallaPlacemarksRef.current = [];

    if (!selectedDistrictName) return;

    districtNeighborhoods.forEach((mahalla) => {
      const coordKey = `${selectedDistrictName}__${mahalla.name}`;
      const dbCoords: [number, number] | null =
        mahalla.latitude != null && mahalla.longitude != null
          ? [Number(mahalla.latitude), Number(mahalla.longitude)]
          : null;
      const defaultCoords = dbCoords || neighborhoodsCoordsData?.[coordKey];
      const currentCoords = customMahallaCenters[coordKey] || defaultCoords;
      if (!currentCoords) return;

      const isCustom = Boolean(customMahallaCenters[coordKey]);
      const safeMahallaName = escapeHtml(mahalla.name);
      const safeEntityLabel = escapeHtml(entityLabel);
      const safeCount = Number(mahalla.count) || 0;

      const MahallaBadgeLayout = ymaps.templateLayoutFactory.createClass(`
        <div style="
          transform: translate(-50%, -50%);
          cursor: ${isMoveMode ? 'grab' : 'pointer'};
          display: flex;
          flex-direction: column;
          align-items: center;
          user-select: none;
          pointer-events: auto;
        " title="${safeMahallaName}: ${safeCount} ta (Surish uchun 2 marta bosing)">
          <svg width="30" height="30" viewBox="0 0 30 30" style="overflow: visible; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
            <circle
              cx="15"
              cy="15"
              r="12.5"
              fill="#ef4444"
              stroke="${isCustom ? '#38bdf8' : '#ffffff'}"
              stroke-width="2"
            />
            <text
              x="15"
              y="19"
              text-anchor="middle"
              fill="#ffffff"
              font-size="11"
              font-weight="900"
              font-family="monospace"
            >${safeCount}</text>
          </svg>
          <div style="
            background: rgba(15, 23, 42, 0.95);
            color: #f1f5f9;
            border: ${isCustom ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.3)'};
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
            margin-top: 3px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.4);
          ">${safeMahallaName}</div>
        </div>
      `);

      const placemark = new ymaps.Placemark(
        currentCoords,
        {
          hintContent: `<b>${safeMahallaName}</b><br/>${safeEntityLabel}: ${safeCount} ta<br/>Zarar: ${escapeHtml(formatUZS(mahalla.totalLoss))}`,
        },
        {
          iconLayout: MahallaBadgeLayout,
          iconPane: 'overlaps',
          hasBalloon: false,
          draggable: isMoveMode,
          cursor: isMoveMode ? 'grab' : 'pointer',
        },
      );

      // Kordinata surib yakunlanganda saqlash
      placemark.events.add('dragend', () => {
        const newCoords = placemark.geometry.getCoordinates();
        handleUpdateMahallaCenter(
          coordKey,
          [Number(newCoords[0].toFixed(5)), Number(newCoords[1].toFixed(5))],
          mahalla.id || undefined,
        );
      });

      // 2 marta bosganda surishni ochish
      placemark.events.add('dblclick', (e) => {
        e.preventDefault();
        placemark.options.set('draggable', true);
        setIsMoveMode(true);
        setLastMovedMahalla(coordKey);
      });

      map.geoObjects.add(placemark);
      mahallaPlacemarksRef.current.push(placemark);
    });
  }, [
    isYmapsReady,
    selectedDistrictName,
    districtNeighborhoods,
    customMahallaCenters,
    isMoveMode,
    handleUpdateMahallaCenter,
    entityLabel,
    neighborhoodsCoordsData,
  ]);

  return (
    <div
      ref={outerWrapperRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] rounded-none h-screen w-screen'
          : 'h-[580px] md:h-[640px]'
      }`}
    >
      {/* 1. MAHALLA SOZLASH PANELI (Faqat tuman tanlanganda va "Surish" yoqilganda chiqadi) */}
      {selectedDistrictName && isMoveMode && (
        <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2 pointer-events-auto">
          {lastMovedMahalla && customMahallaCenters[lastMovedMahalla] && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleResetSingleMahalla(lastMovedMahalla)}
              className="h-9 px-2.5 text-[11px] bg-slate-900/95 text-amber-300 border-amber-500/40 hover:bg-slate-800 cursor-pointer gap-1 shadow-lg rounded-xl"
              title="Oxirgi ko'chirilgan mahallani asl o'rniga qaytarish"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>"{lastMovedMahalla.split('__')[1] || lastMovedMahalla}"ni qaytarish</span>
            </Button>
          )}

          {Object.keys(customMahallaCenters).length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetAllMahallas}
              className="h-9 px-2.5 text-[11px] bg-red-950/90 text-red-300 border-red-500/40 hover:bg-red-900 cursor-pointer gap-1 shadow-lg rounded-xl"
              title="Barcha surilgan mahallalarni default kordinatasiga qaytarish"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Mahallalarni dastlabki holatga qaytarish</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsMoveMode(false)}
            className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer gap-1 shadow-lg rounded-xl"
          >
            <Check className="h-4 w-4" />
            <span>Tayyor</span>
          </Button>
        </div>
      )}

      {/* 2. KORDINATALARNI SOZLASH VA TIKLASH PANELI (Faqat "Surish" bosilgandagina chiqadi!) */}
      {isMoveMode && !selectedDistrictName && (
        <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2 bg-slate-900/95 border border-sky-500/50 px-3 py-1.5 rounded-xl text-xs text-white shadow-2xl backdrop-blur-md animate-in fade-in max-w-[calc(100%-250px)] pointer-events-auto">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px]">
            <Move className="h-3.5 w-3.5 animate-pulse text-sky-400" />
            <span>Nishonlar surilishi:</span>
          </div>

          {lastMovedDistrict && customCenters[lastMovedDistrict] && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleResetSingleDistrict(lastMovedDistrict)}
              className="h-7 px-2 text-[11px] bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700 cursor-pointer gap-1"
              title="Oxirgi ko'chirilgan tuman nishonini o'z o'rniga qaytarish"
            >
              <RotateCcw className="h-3 w-3" />
              <span>"{lastMovedDistrict}"ni qaytarish</span>
            </Button>
          )}

          {Object.keys(customCenters).length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetAllDistricts}
              className="h-7 px-2 text-[11px] bg-red-950/80 text-red-300 border-red-500/40 hover:bg-red-900 cursor-pointer gap-1"
              title="Barcha nishonlarni default kordinatalariga qaytarish"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Barchasini dastlabki holatga qaytarish</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsMoveMode(false)}
            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Tayyor</span>
          </Button>
        </div>
      )}

      {/* 3. O'NG YUQORI TUGMALAR (Xarita turi, Surish, Zoom +, Zoom -, Reset, Fullscreen) */}
      <div className="absolute top-4 right-4 z-30 flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto">
        <div
          className="inline-flex items-center h-9 p-0.5 rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur-md"
          title="Xarita ko‘rinishini almashtirish"
        >
          {(
            [
              { id: 'yandex#map', label: 'Sxema' },
              { id: 'yandex#satellite', label: 'Sputnik' },
              { id: 'yandex#hybrid', label: 'Gibrid' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleChangeMapType(opt.id)}
              className={`h-full px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                mapType === opt.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsMoveMode((prev) => !prev)}
          className={`h-9 px-2.5 gap-1.5 text-xs shadow-lg backdrop-blur-md rounded-xl cursor-pointer border ${
            isMoveMode
              ? 'bg-sky-600 text-white border-sky-400 font-bold hover:bg-sky-700'
              : 'bg-card/95 text-foreground border-border hover:bg-muted'
          }`}
          title={
            isMoveMode
              ? 'Surish rejimini yakunlash'
              : selectedDistrictName
                ? "Mahallalar o'rnini surib sozlash"
                : "Aylana nishonlar o'rnini surib sozlash"
          }
        >
          <Move className="h-4 w-4" />
          <span className="hidden sm:inline">{isMoveMode ? 'Saqlash' : 'Surish'}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleZoomIn}
          className="h-9 w-9 p-0 bg-card/95 text-foreground border-border hover:bg-muted shadow-lg backdrop-blur-md rounded-xl cursor-pointer"
          title="Kattalashtirish (+)"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleZoomOut}
          className="h-9 w-9 p-0 bg-card/95 text-foreground border-border hover:bg-muted shadow-lg backdrop-blur-md rounded-xl cursor-pointer"
          title="Kichraytirish (-)"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSelectDistrict(null)}
          className="h-9 w-9 p-0 bg-card/95 text-foreground border-border hover:bg-muted shadow-lg backdrop-blur-md rounded-xl cursor-pointer"
          title="Markazga qaytarish"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={toggleFullscreen}
          className="h-9 w-9 p-0 bg-card/95 text-foreground border-border hover:bg-muted shadow-lg backdrop-blur-md rounded-xl cursor-pointer"
          title={isFullscreen ? 'Kichraytirish' : "To'liq ekranga (Full Screen)"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-amber-500" />
          ) : (
            <Expand className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 3. ASOSIY YANDEX XARITA DIVI */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${
          isDark && mapType === 'yandex#map' ? 'bg-[#0a0f1d] ymaps-dark-mode' : 'bg-slate-100'
        }`}
      />

      {/* 4. YUKLANISH HOLATI SKELETONI */}
      {(!isYmapsReady || isLoading) && (
        <div className="absolute inset-0 z-20">
          <MapCanvasSkeleton showControls={false} statusText="Xarita yuklanmoqda..." />
        </div>
      )}

      {/* 5. CHEGARA RANGLARI TAVSIFI (LEGEND) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-card/95 border border-border px-3.5 py-2 rounded-xl text-[11px] text-foreground shadow-lg backdrop-blur-md font-semibold pointer-events-auto">
        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Arizalar darajasi:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-white bg-red-600 shadow"></span>
          Ko'p
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow"></span>
          O'rtacha
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-white bg-emerald-600 shadow"></span>
          Kam
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-white bg-slate-500 shadow"></span>
          Tinch
        </span>
      </div>

      {/* 6. HOVER TOOLTIP (Sichqoncha tuman chegarasi ustiga kelganda) */}
      {hoveredDistrict && !selectedDistrictName && (
        <div className="absolute top-16 left-4 z-30 bg-card/95 text-foreground p-3 rounded-xl border border-border shadow-2xl pointer-events-none backdrop-blur-md animate-in fade-in duration-150 min-w-[210px]">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 mb-2">
            <span className="font-extrabold text-sm text-primary">{hoveredDistrict}</span>
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-mono">
              {districtStatsMap.get(hoveredDistrict)?.count || 0} ta ariza
            </Badge>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-muted-foreground">
              <span>Yetkazilgan zarar:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatUZS(districtStatsMap.get(hoveredDistrict)?.totalLoss)}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Bosganda ushbu tumanning mahallalari yaqinlashadi
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QashqadaryoYandexMap;
