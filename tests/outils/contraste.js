// Contraste WCAG : luminance relative et rapport de contraste (fonctions pures), lecture des couleurs calculées (« rgb(…) », « rgba(…) »).
export function analyserCouleur(texte) {
  const m = String(texte).match(/^rgba?\(\s*(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)(?:[ ,/]+(\d*\.?\d+))?\s*\)$/);
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) };
  const h = String(texte).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!h) return null;
  const hex = h[1].length === 3 ? [...h[1]].map((c) => c + c).join('') : h[1];
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
}

export function luminance({ r, g, b }) {
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function rapportContraste(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Superpose une couleur translucide sur un fond opaque.
export function composer(dessus, fond) {
  const a = dessus.a ?? 1;
  return { r: dessus.r * a + fond.r * (1 - a), g: dessus.g * a + fond.g * (1 - a), b: dessus.b * a + fond.b * (1 - a), a: 1 };
}
