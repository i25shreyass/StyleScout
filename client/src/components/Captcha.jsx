import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

// Loads Google's reCAPTCHA script once for the whole app.
let scriptPromise = null;
function loadRecaptcha() {
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      window.__onRecaptchaLoad = () => resolve(window.grecaptcha);
      const s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit';
      s.async = true;
      s.defer = true;
      s.onerror = () => { scriptPromise = null; reject(new Error('Could not load the CAPTCHA. Check your internet connection.')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/* Real Google reCAPTCHA v2 checkbox.
   onChange(token) fires with a token when solved and with null when it expires/resets.
   A token works for ONE server check, so call ref.current.reset() after every submit. */
const Captcha = forwardRef(function Captcha({ onChange }, ref) {
  const box = useRef(null);
  const widgetId = useRef(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  const [error, setError] = useState('');

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current !== null && window.grecaptcha?.reset) window.grecaptcha.reset(widgetId.current);
      cb.current(null);
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let dead = false;
    loadRecaptcha()
      .then((g) => {
        if (dead || !box.current) return;
        box.current.innerHTML = '';
        widgetId.current = g.render(box.current, {
          sitekey: SITE_KEY,
          callback: (token) => cb.current(token),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        });
      })
      .catch((e) => setError(e.message));
    return () => { dead = true; widgetId.current = null; };
  }, []);

  if (!SITE_KEY) {
    return <div className="lg-error">CAPTCHA is not configured. Add VITE_RECAPTCHA_SITE_KEY to client/.env and restart the client.</div>;
  }
  return (
    <div className="lg-captchabox">
      <div ref={box} />
      {error && <div className="lg-error">{error}</div>}
    </div>
  );
});

export default Captcha;
