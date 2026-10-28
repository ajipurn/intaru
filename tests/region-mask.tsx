// Browser regression fixture. Run Vite and open /tests/region-mask.html.
// Fit the region before each horizontal/vertical drag; all four corners must
// remain masked while the pointer is held, beyond Leaflet's default 10% buffer.
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { MapContainer, useMapEvents } from 'react-leaflet';
import { RegionMask } from '../src/components/map/RegionMask';
import { regionMaskQuery } from '../src/lib/data';
import { KEBUMEN_BOUNDS, REGION_FIT_OPTIONS } from '../src/lib/region-view';
import '../src/styles.css';

type Report = { samples: number; failures: number };

function DragAudit() {
  const { data } = useQuery(regionMaskQuery);
  const totals = useRef<Report>({ samples: 0, failures: 0 });
  const [report, setReport] = useState(totals.current);
  const map = useMapEvents({
    dragstart() { totals.current = { samples: 0, failures: 0 }; },
    drag() {
      const viewport = map.getContainer().getBoundingClientRect();
      const renderer = map.getPane('region-mask')?.querySelector('canvas, svg');
      if (!renderer) return;
      const bounds = renderer.getBoundingClientRect();
      const points = [
        [viewport.left + 12, viewport.top + 12], [viewport.right - 12, viewport.top + 12],
        [viewport.left + 12, viewport.bottom - 12], [viewport.right - 12, viewport.bottom - 12],
      ];
      const covered = points.every(([x, y]) => {
        const within = x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom;
        if (renderer instanceof HTMLCanvasElement) {
          if (!within) return false;
          const pixelX = Math.floor((x - bounds.left) * renderer.width / bounds.width);
          const pixelY = Math.floor((y - bounds.top) * renderer.height / bounds.height);
          return (renderer.getContext('2d')?.getImageData(pixelX, pixelY, 1, 1).data[3] ?? 0) > 0;
        }
        if (!within && getComputedStyle(renderer).overflow !== 'visible') return false;
        return [...renderer.querySelectorAll('path')].some((path) => {
          const matrix = path.getScreenCTM();
          return matrix && path.isPointInFill(new DOMPoint(x, y).matrixTransform(matrix.inverse()));
        });
      });
      totals.current = { samples: totals.current.samples + 1, failures: totals.current.failures + Number(!covered) };
      setReport(totals.current);
    },
  });
  const status = !data ? 'WAITING' : !report.samples ? 'READY' : report.failures ? 'FAIL' : 'PASS';
  return <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, padding: 16, border: '1px solid #ddd', borderRadius: 6, background: '#fff', maxWidth: 'calc(100% - 32px)', fontSize: 13 }}>
    <strong>Region mask drag regression</strong>
    <p style={{ marginBlock: 10 }}>Fit Kebumen, then drag horizontally or vertically. Check coverage before releasing the pointer.</p>
    <button onClick={() => {
      map.fitBounds(KEBUMEN_BOUNDS, REGION_FIT_OPTIONS);
      totals.current = { samples: 0, failures: 0 };
      setReport(totals.current);
    }} style={{ minHeight: 44, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}>Fit Kebumen</button>
    <output data-testid="mask-drag-result" data-status={status} data-samples={report.samples} data-failures={report.failures} style={{ display: 'block', marginTop: 10 }}>
      {status} · {report.samples} drag samples · {report.failures} gaps
    </output>
  </div>;
}

const client = new QueryClient();
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}>
  <MapContainer bounds={KEBUMEN_BOUNDS} boundsOptions={REGION_FIT_OPTIONS} zoomSnap={0.1} zoomDelta={0.5} minZoom={5} maxZoom={19} preferCanvas className="map-canvas">
    <RegionMask />
    <DragAudit />
  </MapContainer>
</QueryClientProvider>);
