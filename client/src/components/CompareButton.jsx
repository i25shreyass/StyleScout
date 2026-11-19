import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'ss_compare';
const MAX_ITEMS = 4;

const readCompare = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export default function CompareButton({ product }) {
  const productKey = product.id;

  const [selected, setSelected] = useState(false);

  useEffect(() => {
    const items = readCompare();

    setSelected(
      items.some((item) => item.productKey === productKey)
    );
  }, [productKey]);

  const toggleCompare = () => {
    const items = readCompare();

    const alreadySelected = items.some(
      (item) => item.productKey === productKey
    );

    /*
     * Clicking an already-selected product removes it.
     */
    if (alreadySelected) {
      const next = items.filter(
        (item) => item.productKey !== productKey
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setSelected(false);

      window.dispatchEvent(
        new Event('ss-compare-change')
      );

      return;
    }

    /*
     * StyleScout allows a maximum of four
     * live offers in the comparison page.
     */
    if (items.length >= MAX_ITEMS) {
      window.alert('you can compare up to 4 items ♡');
      return;
    }

    /*
     * shopping.js calls this value "id".
     *
     * PriceSnapshot stores the same value as "productKey".
     * We therefore save product.id as productKey here.
     */
    const savedProduct = {
      productKey,
      title: product.title,
      store: product.store,

      price: product.price,
      delivery: product.delivery ?? null,
      finalPrice: product.finalPrice ?? null,

      rating: product.rating ?? null,
      reviews: product.reviews ?? null,

      discount: product.discount ?? 0,
      originalPrice: product.originalPrice ?? null,

      url: product.url ?? '',
      image: product.image ?? '',
    };

    const next = [
      ...items,
      savedProduct,
    ];

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next)
    );

    setSelected(true);

    window.dispatchEvent(
      new Event('ss-compare-change')
    );
  };

  return (
    <button
      type="button"
      className={`btn block compare-toggle${
        selected ? ' selected' : ''
      }`}
      onClick={toggleCompare}
      aria-pressed={selected}
    >
      {selected ? '✓ comparing' : '+ compare'}
    </button>
  );
}