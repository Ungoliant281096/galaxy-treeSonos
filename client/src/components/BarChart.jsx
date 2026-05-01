import { useEffect, useRef } from 'react';

/**
 * Gráfica de barras simple sin dependencias externas.
 * data: [{ label, value, color? }]
 */
export default function BarChart({ data = [], height = 180 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.offsetWidth;
    canvas.width  = W;
    canvas.height = height;

    ctx.clearRect(0, 0, W, height);

    const maxVal  = Math.max(...data.map((d) => d.value), 1);
    const pad     = { top: 20, bottom: 36, left: 8, right: 8 };
    const barW    = (W - pad.left - pad.right) / data.length;
    const barGap  = barW * 0.25;
    const chartH  = height - pad.top - pad.bottom;

    data.forEach((d, i) => {
      const x   = pad.left + i * barW + barGap / 2;
      const bw  = barW - barGap;
      const bh  = (d.value / maxVal) * chartH;
      const y   = pad.top + chartH - bh;

      // Barra
      ctx.fillStyle = d.color || '#1a73e8';
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, [4, 4, 0, 0]);
      ctx.fill();

      // Valor encima
      ctx.fillStyle = '#202124';
      ctx.font = `bold 11px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(d.value, x + bw / 2, y - 4);

      // Etiqueta abajo
      ctx.fillStyle = '#5f6368';
      ctx.font = `10px system-ui`;
      const label = d.label?.length > 10 ? d.label.slice(0, 9) + '…' : (d.label ?? '');
      ctx.fillText(label, x + bw / 2, height - pad.bottom + 14);
    });
  }, [data, height]);

  return <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} height={height} />;
}
