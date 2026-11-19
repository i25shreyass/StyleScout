import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Window } from '../components/Ui';

const STORAGE_KEY = 'ss_compare';

const money = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const readCompare = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.slice(0, 4) : [];
  } catch {
    return [];
  }
};

const finalPriceFor = (product) => {
  /*
   * Prefer finalPrice when StyleScout already knows it.
   *
   * Otherwise:
   * known delivery → price + delivery
   * unknown delivery → price only, but the UI clearly says delivery is unknown.
   */
  if (Number.isFinite(Number(product.finalPrice))) {
    return Number(product.finalPrice);
  }

  if (
    Number.isFinite(Number(product.price)) &&
    product.delivery !== null &&
    product.delivery !== undefined &&
    Number.isFinite(Number(product.delivery))
  ) {
    return Number(product.price) + Number(product.delivery);
  }

  return Number.isFinite(Number(product.price))
    ? Number(product.price)
    : null;
};

export default function Compare() {
  const [products, setProducts] = useState(readCompare);
  const [history, setHistory] = useState({});

  /*
   * Keep this page updated if the comparison list changes.
   */
  useEffect(() => {
    const update = () => setProducts(readCompare());

    window.addEventListener('ss-compare-change', update);
    window.addEventListener('storage', update);

    return () => {
      window.removeEventListener('ss-compare-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  /*
   * Ask our new history API for each product's historical minimum.
   */
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const next = {};

      await Promise.all(
        products.map(async (product) => {
          if (!product.productKey) return;

          try {
            const response = await fetch(
              `/api/history/${encodeURIComponent(product.productKey)}`
            );

            if (!response.ok) {
              next[product.productKey] = null;
              return;
            }

            const data = await response.json();

            next[product.productKey] = data;
          } catch {
            next[product.productKey] = null;
          }
        })
      );

      if (!cancelled) {
        setHistory(next);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [products]);

  /*
   * Find the lowest known final payable price.
   */
  const cheapest = useMemo(() => {
    const known = products
      .map((product) => ({
        productKey: product.productKey,
        value: finalPriceFor(product),
      }))
      .filter((item) => Number.isFinite(item.value));

    if (!known.length) return null;

    return Math.min(...known.map((item) => item.value));
  }, [products]);

  const remove = (productKey) => {
    const next = products.filter(
      (product) => product.productKey !== productKey
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setProducts(next);

    window.dispatchEvent(new Event('ss-compare-change'));
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProducts([]);

    window.dispatchEvent(new Event('ss-compare-change'));
  };

  if (!products.length) {
    return (
      <main className="page compare-page">
        <Window title="compare.exe" tone="pink" icon="↔">
          <div className="compare-empty">
            <span>↔</span>

            <h2>nothing to compare yet</h2>

            <p>
              add up to 4 live offers using the “+ compare” button.
            </p>

            <Link className="btn" to="/search">
              start scouting →
            </Link>
          </div>
        </Window>
      </main>
    );
  }

  return (
    <main className="page compare-page">
      <Window title="compare prices" tone="pink" icon="↔">
        <div className="compare-heading">
          <div>
            <h2>compare your picks</h2>

            <p>
              {products.length} of 4 items selected
            </p>
          </div>

          <button
            type="button"
            className="btn blue tiny"
            onClick={clearAll}
          >
            clear all
          </button>
        </div>

        <div className="compare-table-wrap">
          <table className="live-compare-table">
            <thead>
              <tr>
                <th>product</th>
                <th>you pay</th>
                <th>item price</th>
                <th>delivery</th>
                <th>store</th>
                <th>rating</th>
                <th>discount</th>
                <th>history min</th>
                <th>store link</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const finalPrice = finalPriceFor(product);

                const isCheapest =
                  cheapest !== null &&
                  finalPrice !== null &&
                  finalPrice === cheapest;

                const historyData =
                  history[product.productKey];

                return (
                  <tr
                    key={product.productKey}
                    className={isCheapest ? 'compare-winner' : ''}
                  >
                    <td>
                      <div className="compare-product">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                          />
                        ) : null}

                        <div>
                          {isCheapest && (
                            <span className="cheapest-badge">
                              ★ cheapest
                            </span>
                          )}

                          <b>{product.title}</b>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>
                        {money(finalPrice)}
                      </strong>

                      {product.delivery === null ||
                      product.delivery === undefined ? (
                        <small>
                          + delivery unknown
                        </small>
                      ) : null}
                    </td>

                    <td>
                      {money(product.price)}
                    </td>

                    <td>
                      {product.delivery === null ||
                      product.delivery === undefined
                        ? 'check store'
                        : Number(product.delivery) === 0
                          ? 'free'
                          : money(product.delivery)}
                    </td>

                    <td>
                      <b>{product.store}</b>
                    </td>

                    <td>
                      {product.rating
                        ? `★ ${product.rating}`
                        : '—'}
                    </td>

                    <td>
                      {product.discount > 0
                        ? `${product.discount}% off`
                        : '—'}
                    </td>

                    <td>
                      {historyData
                        ? money(historyData.min)
                        : '—'}
                    </td>

                    <td>
                      {product.url ? (
                        <a
                          className="btn tiny"
                          href={product.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          view ↗
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn blue tiny"
                        onClick={() =>
                          remove(product.productKey)
                        }
                        aria-label={`remove ${product.title} from comparison`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="compare-note">
          “you pay” includes delivery when the store provides a
          delivery price. unknown delivery costs are clearly marked.
        </p>
      </Window>
    </main>
  );
}