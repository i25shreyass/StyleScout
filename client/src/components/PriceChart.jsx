import React from 'react';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

export default function PriceChart({ points = [] }) {
  if (!points.length) {
    return (
      <div className="pricechart-empty">
        <span>♡</span>
        <b>no price history yet</b>
        <small>
          StyleScout starts building history when this product is searched.
        </small>
      </div>
    );
  }

  if (points.length === 1) {
    return (
      <div className="pricechart-empty">
        <span>✦</span>
        <b>not enough history yet</b>
        <small>
          we have one price so far. check again after another price snapshot.
        </small>
      </div>
    );
  }

  const width = 720;
  const height = 300;

  const padding = {
    top: 35,
    right: 45,
    bottom: 55,
    left: 65,
  };

  const prices = points.map((point) => Number(point.price));

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  /*
   * If every historical price is identical, the normal range would be 0.
   * Giving it a small artificial range keeps the SVG maths valid.
   */
  const range = maxPrice - minPrice || 1;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + chartWidth / 2
        : padding.left +
          (index / (points.length - 1)) * chartWidth;

    const y =
      padding.top +
      ((maxPrice - Number(point.price)) / range) * chartHeight;

    return {
      ...point,
      x,
      y,
      price: Number(point.price),
    };
  });

  const linePoints = coordinates
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const lowestPrice = Math.min(...prices);

  const lowestIndex = prices.lastIndexOf(lowestPrice);
  const lowestPoint = coordinates[lowestIndex];

  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <div className="pricechart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Product price history"
      >
        {/* horizontal guide lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const y = padding.top + step * chartHeight;

          return (
            <line
              key={step}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="pricechart-grid"
            />
          );
        })}

        {/* hand-drawn looking price line */}
        <polyline
          points={linePoints}
          className="pricechart-line pricechart-line-shadow"
        />

        <polyline
          points={linePoints}
          className="pricechart-line"
        />

        {/* each recorded price */}
        {coordinates.map((point, index) => (
          <g key={`${point.at}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              className={
                index === lowestIndex
                  ? 'pricechart-dot lowest'
                  : 'pricechart-dot'
              }
            />

            <title>
              {shortDate(point.at)} — {money(point.price)}
            </title>
          </g>
        ))}

        {/* maximum price */}
        <text
          x={padding.left}
          y={padding.top - 12}
          className="pricechart-label"
        >
          max {money(maxPrice)}
        </text>

        {/* minimum price */}
        <text
          x={padding.left}
          y={height - 16}
          className="pricechart-label"
        >
          min {money(minPrice)}
        </text>

        {/* first date */}
        <text
          x={firstPoint.x}
          y={height - 35}
          textAnchor="start"
          className="pricechart-date"
        >
          {shortDate(firstPoint.at)}
        </text>

        {/* latest date */}
        <text
          x={lastPoint.x}
          y={height - 35}
          textAnchor="end"
          className="pricechart-date"
        >
          {shortDate(lastPoint.at)}
        </text>

        {/* lowest-price marker */}
        <g className="pricechart-lowest">
          <line
            x1={lowestPoint.x}
            x2={lowestPoint.x}
            y1={lowestPoint.y - 8}
            y2={Math.max(20, lowestPoint.y - 38)}
          />

          <text
            x={lowestPoint.x}
            y={Math.max(16, lowestPoint.y - 44)}
            textAnchor="middle"
          >
            ★ lowest {money(lowestPrice)}
          </text>
        </g>
      </svg>
    </div>
  );
}