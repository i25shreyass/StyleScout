import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Window } from '../components/Ui';
import PriceChart from '../components/PriceChart';

const money = (value) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export default function ProductHistory() {
  /*
   * The URL will look like:
   *
   * /history/abc123
   *
   * useParams() gives us:
   *
   * productKey = "abc123"
   */
  const { productKey } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/history/${encodeURIComponent(productKey)}`
        );

        const body = await response.json();

        if (!response.ok) {
          throw new Error(
            body.error || 'Could not load price history.'
          );
        }

        if (!cancelled) {
          setData(body);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [productKey]);

  return (
    <main className="page history-page">
      <Window
        title="PRICE_HISTORY.exe"
        tone="pink"
        icon="★"
        className="history-window"
      >
        {loading ? (
          <div className="history-message">
            <span>✦</span>
            <b>loading price history…</b>
            <small>checking StyleScout snapshots</small>
          </div>
        ) : error ? (
          <div className="history-message">
            <span>♡</span>
            <b>no price history yet</b>
            <small>{error}</small>

            <Link className="btn" to="/search">
              back to search
            </Link>
          </div>
        ) : (
          <>
            <div className="history-heading">
              <div>
                <small>price history for</small>
                <h2>{data.title || 'Product'}</h2>
                <p>{data.store || 'store'}</p>
              </div>

              <div className="history-current">
                <small>current</small>
                <strong>{money(data.current)}</strong>
              </div>
            </div>

            <PriceChart points={data.points || []} />

            <div className="history-stats">
              <div>
                <span>current</span>
                <b>{money(data.current)}</b>
              </div>

              <div className="history-low">
                <span>★ lowest</span>
                <b>{money(data.min)}</b>
              </div>

              <div>
                <span>average</span>
                <b>{money(data.avg)}</b>
              </div>

              <div>
                <span>highest</span>
                <b>{money(data.max)}</b>
              </div>
            </div>

            <div className="history-footer">
              <small>
                based on prices recorded during earlier StyleScout
                searches. store prices can change at any time.
              </small>

              <Link className="btn blue" to="/search">
                ← back to search
              </Link>
            </div>
          </>
        )}
      </Window>
    </main>
  );
}