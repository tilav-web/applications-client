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
import mahallasCoordsData from '@/data/qashqadaryo-mahallas-coords.json';
import provinceBoundaryData from '@/data/qashqadaryo-province-boundary.json';
import realDistrictsData from '@/data/qashqadaryo-real-districts.json';

declare global {
  interface Window {
    ymaps: any;
  }
}

export interface DistrictStat {
  id: string;
  name: string;
  count: number;
  totalLoss: number;
  percent?: number;
}

export interface MahallaStat {
  id: string;
  name: string;
  district_id: string;
  district_name: string | null;
  count: number;
  totalLoss: number;
  percent?: number;
}

interface Props {
  districtsData: DistrictStat[];
  mahallasData?: MahallaStat[];
  allowedDistrictNames?: string[];
  isLoading?: boolean;
  periodLabel?: string;
  onDistrictSelect?: (districtName: string | null) => void;
}

const YANDEX_API_KEY = '0faa0d3b-2049-4fbc-b77e-437de12c50a3';
const PROVINCE_BOUNDS: [[number, number], [number, number]] = [
  [38.0075, 64.3777],
  [39.57, 67.6851],
];
const DEFAULT_CENTER: [number, number] = [38.7888, 66.0314];
const DEFAULT_ZOOM = 8;

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
  mahallasData = [],
  allowedDistrictNames,
  isLoading = false,
  onDistrictSelect,
}) => {
  const outerWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const districtPolygonsRef = useRef<any[]>([]);
  const placemarksRef = useRef<any[]>([]);
  const mahallaPlacemarksRef = useRef<any[]>([]);

  const [isYmapsReady, setIsYmapsReady] = useState(false);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(null);
  const selectedDistrictNameRef = useRef<string | null>(null);
  useEffect(() => {
    selectedDistrictNameRef.current = selectedDistrictName;
  }, [selectedDistrictName]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

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

  // Bitta tumanning yangi koordinatasini saqlash
  const handleUpdateDistrictCenter = useCallback((dName: string, newCoords: [number, number]) => {
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
  }, []);

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
  const handleResetAllDistricts = useCallback(() => {
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
  }, []);

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

  const handleUpdateMahallaCenter = useCallback((coordKey: string, newCoords: [number, number]) => {
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
  }, []);

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

  const handleResetAllMahallas = useCallback(() => {
    try {
      localStorage.removeItem('uvd_mahalla_badge_centers');
    } catch {
      /* ignore */
    }
    setCustomMahallaCenters({});
    setLastMovedMahalla(null);
    setIsMoveMode(false);
  }, []);

  // Eng yuqori arizalar soni (badge nisbati uchun)
  const maxDistrictCount = useMemo(() => {
    if (!districtsData || districtsData.length === 0) return 1;
    return Math.max(...districtsData.map((d) => d.count), 1);
  }, [districtsData]);

  // Tuman xodimi (DISTRICT_OFFICER) uchun faqat ruxsat etilgan tumanlar chegaralari
  const visibleDistrictFeatures = useMemo(() => {
    const allFeatures = (realDistrictsData as any).features as any[];
    if (!allowedDistrictNames) return allFeatures;
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/['`‘’]/g, '')
        .trim();
    const allowedSet = new Set(allowedDistrictNames.map(normalize));
    return allFeatures.filter((feat: any) => allowedSet.has(normalize(feat.properties.name || '')));
  }, [allowedDistrictNames]);

  // Xarita uchun standart chegaralar (DISTRICT_OFFICER bo'lsa biriktirilgan tumanlarga yaqinlashadi)
  const defaultMapBounds = useMemo<[[number, number], [number, number]]>(() => {
    if (!allowedDistrictNames || visibleDistrictFeatures.length === 0) {
      return PROVINCE_BOUNDS;
    }
    let minLat = 999,
      maxLat = -999,
      minLng = 999,
      maxLng = -999;
    const walk = (c: any) => {
      if (typeof c[0] === 'number') {
        const lat = c[0] > 50 ? c[1] : c[0];
        const lng = c[0] > 50 ? c[0] : c[1];
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      } else if (Array.isArray(c)) {
        c.forEach(walk);
      }
    };
    visibleDistrictFeatures.forEach((feat: any) => walk(feat.geometry.coordinates));
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
  const districtMahallas = useMemo(() => {
    if (!selectedDistrictName) return [];
    return mahallasData
      .filter((m) => {
        if (!m.district_name) return false;
        return (
          m.district_name.toLowerCase() === selectedDistrictName.toLowerCase() ||
          m.district_name.replace(/['`‘]/g, '').toLowerCase() ===
            selectedDistrictName.replace(/['`‘]/g, '').toLowerCase()
        );
      })
      .sort((a, b) => b.count - a.count);
  }, [selectedDistrictName, mahallasData]);

  // 1. Fullscreen hodisasini kuzatish
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (mapInstanceRef.current) {
        setTimeout(() => mapInstanceRef.current?.container?.fitToViewport(), 200);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
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

  // 2. Yandex Maps SDK yuklash
  useEffect(() => {
    if (window.ymaps) {
      window.ymaps.ready(() => setIsYmapsReady(true));
      return;
    }

    const scriptId = 'yandex-maps-script-tag';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=uz_UZ`;
      script.async = true;
      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => setIsYmapsReady(true));
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  // 3. Tuman tanlash va yaqinlashish (Zoom in)
  const handleSelectDistrict = useCallback(
    (districtName: string | null) => {
      setSelectedDistrictName(districtName);
      if (onDistrictSelect) {
        onDistrictSelect(districtName);
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
        (f: any) => f.properties.name.toLowerCase() === districtName.toLowerCase(),
      );

      if (feat) {
        let minLat = 999,
          maxLat = -999,
          minLng = 999,
          maxLng = -999;
        const walk = (c: any) => {
          if (typeof c[0] === 'number') {
            const lat = c[0] > 50 ? c[1] : c[0];
            const lng = c[0] > 50 ? c[0] : c[1];
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
          } else {
            c.forEach(walk);
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
    [onDistrictSelect, defaultMapBounds, allowedDistrictNames, visibleDistrictFeatures],
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
      const map = new ymaps.Map(
        mapContainerRef.current,
        {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          controls: ['zoomControl', 'typeSelector'],
          type: 'yandex#map',
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
      map.events.add('click', (e: any) => {
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
      const rawProvinceCoords = (provinceBoundaryData as any).geometry.coordinates;
      let provinceYmapsCoords: any;
      if ((provinceBoundaryData as any).geometry.type === 'Polygon') {
        provinceYmapsCoords = rawProvinceCoords.map((ring: any[]) =>
          ring.map((pt: any[]) => (pt[0] > 50 ? [pt[1], pt[0]] : [pt[0], pt[1]])),
        );
      } else if ((provinceBoundaryData as any).geometry.type === 'MultiPolygon') {
        provinceYmapsCoords = rawProvinceCoords.map((poly: any[]) =>
          poly.map((ring: any[]) =>
            ring.map((pt: any[]) => (pt[0] > 50 ? [pt[1], pt[0]] : [pt[0], pt[1]])),
          ),
        );
      }

      const provincePolygon = new ymaps.Polygon(
        provinceYmapsCoords,
        {
          hintContent: '<b>Qashqadaryo Viloyati chegarasi</b>',
        },
        {
          fill: false,
          strokeColor: '#000000', // Qora rangda viloyat borderi
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

    // Ruxsat etilgan tuman chegaralari (DISTRICT_OFFICER uchun faqat biriktirilgan tumanlar)
    visibleDistrictFeatures.forEach((feat: any) => {
      const dName = feat.properties.name;
      const isSelected = selectedDistrictName?.toLowerCase() === dName.toLowerCase();

      const stat = districtStatsMap.get(dName) ||
        districtStatsMap.get(dName.toLowerCase().replace(/['`‘]/g, '')) || {
          count: 0,
          totalLoss: 0,
        };

      const colors = getRiskBadgeColor(stat.count, maxDistrictCount);

      // GeoJSON [lng, lat] ni Yandex [lat, lng] formatiga o'tkazish
      const rawCoords = feat.geometry.coordinates;
      let ymapsCoords: any;
      if (feat.geometry.type === 'Polygon') {
        ymapsCoords = rawCoords.map((ring: any[]) =>
          ring.map((pt: any[]) => (pt[0] > 50 ? [pt[1], pt[0]] : [pt[0], pt[1]])),
        );
      } else if (feat.geometry.type === 'MultiPolygon') {
        ymapsCoords = rawCoords.map((poly: any[]) =>
          poly.map((ring: any[]) =>
            ring.map((pt: any[]) => (pt[0] > 50 ? [pt[1], pt[0]] : [pt[0], pt[1]])),
          ),
        );
      }

      // Shaffof poligon (Yuzasi bo'yalmaydi! Faqat nozik 1px to'q ko'k chegara chizig'i)
      const districtPolygon = new ymaps.Polygon(
        ymapsCoords,
        {
          hintContent: `<b>${dName}</b><br/>Arizalar: ${stat.count} ta<br/>Zarar: ${formatUZS(stat.totalLoss)}`,
        },
        {
          fillColor: '#0284c7',
          fillOpacity: isSelected ? 0.08 : 0.001, // 100% shaffof, xarita to'liq ko'rinadi
          strokeColor: isSelected ? '#000000' : '#1e40af', // Tanlanganda qora rangda aniq chegara
          strokeWidth: isSelected ? 2.5 : 1.2, // Yagona nozik 1px border
          strokeOpacity: isZoomedIn && !isSelected ? 0.25 : 0.85,
          cursor: 'pointer',
        },
      );

      // Hover hodisalari: ko'zga yaqqol tashlanadigan toza chegara va yengil shaffof yorug'lik
      districtPolygon.events.add('mouseenter', () => {
        setHoveredDistrict(dName);
        districtPolygon.options.set({
          strokeColor: isSelected ? '#000000' : '#0284c7', // Yorqin neon ko'k chegara
          strokeWidth: 2.5,
          fillOpacity: 0.15, // Tumanning butun yuzasi yengil ajralib ko'rinadi
        });
      });

      districtPolygon.events.add('mouseleave', () => {
        setHoveredDistrict(null);
        districtPolygon.options.set({
          strokeColor: isSelected ? '#000000' : '#1e40af',
          strokeWidth: isSelected ? 2.5 : 1.2,
          fillOpacity: isSelected ? 0.08 : 0.001,
        });
      });

      districtPolygon.events.add('click', () => {
        handleSelectDistrict(dName);
      });

      map.geoObjects.add(districtPolygon);
      districtPolygonsRef.current.push(districtPolygon);

      // C. Tuman Ustida Arizalar Soni Nishoni (To'liq doira/aylana - Kordinatasi erkin suriladi!)
      if (!isZoomedIn && feat.properties.center) {
        const defaultCenter: [number, number] = feat.properties.center;
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
          " title="${dName}: ${stat.count} ta ariza (Surish uchun 2 marta bosing)">
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
              >${stat.count}</text>
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
          handleUpdateDistrictCenter(dName, [
            Number(newCoords[0].toFixed(5)),
            Number(newCoords[1].toFixed(5)),
          ]);
        });

        // 2 marta bosganda surishni ochish (yoki bir marta bosganda yaqinlashish)
        let clickTimer: any = null;
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
        });

        placemark.events.add('dblclick', (e: any) => {
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
  ]);

  // 6. TANLANGAN TUMAN ICHIDA MAHALLALARNI KO'RSATISH
  useEffect(() => {
    const map = mapInstanceRef.current;
    const ymaps = window.ymaps;
    if (!map || !ymaps) return;

    mahallaPlacemarksRef.current.forEach((pm) => map.geoObjects.remove(pm));
    mahallaPlacemarksRef.current = [];

    if (!selectedDistrictName) return;

    districtMahallas.forEach((mahalla) => {
      const coordKey = `${selectedDistrictName}__${mahalla.name}`;
      const defaultCoords = (mahallasCoordsData as unknown as Record<string, [number, number]>)[
        coordKey
      ];
      const currentCoords = customMahallaCenters[coordKey] || defaultCoords;
      if (!currentCoords) return;

      const isCustom = Boolean(customMahallaCenters[coordKey]);

      const MahallaBadgeLayout = ymaps.templateLayoutFactory.createClass(`
        <div style="
          transform: translate(-50%, -50%);
          cursor: ${isMoveMode ? 'grab' : 'pointer'};
          display: flex;
          flex-direction: column;
          align-items: center;
          user-select: none;
          pointer-events: auto;
        " title="${mahalla.name}: ${mahalla.count} ta ariza (Surish uchun 2 marta bosing)">
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
            >${mahalla.count}</text>
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
          ">${mahalla.name}</div>
        </div>
      `);

      const placemark = new ymaps.Placemark(
        currentCoords,
        {
          hintContent: `<b>${mahalla.name}</b><br/>Arizalar: ${mahalla.count} ta<br/>Zarar: ${formatUZS(mahalla.totalLoss)}`,
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
        handleUpdateMahallaCenter(coordKey, [
          Number(newCoords[0].toFixed(5)),
          Number(newCoords[1].toFixed(5)),
        ]);
      });

      // 2 marta bosganda surishni ochish
      placemark.events.add('dblclick', (e: any) => {
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
    districtMahallas,
    customMahallaCenters,
    isMoveMode,
    handleUpdateMahallaCenter,
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

      {/* 3. O'NG YUQORI TUGMALAR (Surish, Zoom +, Zoom -, Reset, Fullscreen) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 pointer-events-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsMoveMode((prev) => !prev)}
          className={`h-9 px-2.5 gap-1.5 text-xs shadow-xl backdrop-blur-md rounded-xl cursor-pointer border ${
            isMoveMode
              ? 'bg-sky-600 text-white border-sky-400 font-bold'
              : 'bg-slate-900/95 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
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
          className="h-9 w-9 p-0 bg-slate-900/95 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md rounded-xl cursor-pointer"
          title="Kattalashtirish (+)"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleZoomOut}
          className="h-9 w-9 p-0 bg-slate-900/95 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md rounded-xl cursor-pointer"
          title="Kichraytirish (-)"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSelectDistrict(null)}
          className="h-9 w-9 p-0 bg-slate-900/95 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md rounded-xl cursor-pointer"
          title="Markazga qaytarish"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={toggleFullscreen}
          className="h-9 w-9 p-0 bg-slate-900/95 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md rounded-xl cursor-pointer"
          title={isFullscreen ? 'Kichraytirish' : "To'liq ekranga (Full Screen)"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-amber-400" />
          ) : (
            <Expand className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 3. ASOSIY YANDEX XARITA DIVI */}
      <div
        ref={mapContainerRef}
        className="w-full h-full bg-[#0a0f1d] cursor-grab active:cursor-grabbing"
      />

      {/* 4. YUKLANISH HOLATI INDIKATORI */}
      {(!isYmapsReady || isLoading) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white">
          <RefreshCw className="h-7 w-7 text-sky-400 animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-300">Yandex Map xaritasi yuklanmoqda...</p>
        </div>
      )}

      {/* 5. CHEGARA RANGLARI TAVSIFI (LEGEND) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-slate-900/95 border border-slate-700 px-3.5 py-2 rounded-xl text-[11px] text-slate-300 shadow-xl backdrop-blur-md font-semibold pointer-events-auto">
        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-sky-400" />
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
        <div className="absolute top-16 left-4 z-30 bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-2xl pointer-events-none backdrop-blur-md animate-in fade-in duration-150 min-w-[210px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-extrabold text-sm text-sky-400">{hoveredDistrict}</span>
            <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-[10px] font-mono">
              {districtStatsMap.get(hoveredDistrict)?.count || 0} ta ariza
            </Badge>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>Yetkazilgan zarar:</span>
              <span className="font-mono font-bold text-amber-300">
                {formatUZS(districtStatsMap.get(hoveredDistrict)?.totalLoss)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Bosganda ushbu tumanning mahallalari yaqinlashadi
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QashqadaryoYandexMap;
