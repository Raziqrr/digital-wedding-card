/* Shared by the page cloth and the tirai: the songket motifs as GLSL.
   A motif is a set of thread cells; its edges step like real songket because
   it is evaluated per thread, not per pixel. */
export const MOTIF_GLSL = `
const vec2 S = vec2(34.0, 38.0);   // one tile of scattered flowers, counted in threads

float h11(float n){ return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}

// 1 where gold weft floats over the silk. c is the thread cell.
float motifAt(vec2 c, out float rnd){
  float row = floor(c.y / S.y);
  vec2 cc = c + vec2(mod(row, 2.0) * S.x * 0.5, 0.0);
  vec2 tid = floor(cc / S);
  vec2 lc = cc - tid * S;
  vec2 q = lc - S * 0.5 + 0.5;
  rnd = h21(tid + 3.7);
  vec2 a = abs(q);
  float kind = floor(rnd * 3.0);
  // bintang: eight-point star with an open eye
  float dStar = min(a.x + a.y - 7.5, max(a.x, a.y) - 4.5);
  dStar = max(dStar, -(a.x + a.y - 1.6));
  // tampuk: four round petals round a heart
  float dFlower = min(min(length(a - vec2(4.6, 0.0)) - 3.1, length(a - vec2(0.0, 4.6)) - 3.1), length(q) - 2.5);
  dFlower = max(dFlower, -(length(q) - 1.3));
  // pucuk rebung: the bamboo shoot, hollow below a solid tip
  float tt = (q.y + 8.0) / 16.0;
  float hw = (1.0 - tt) * 6.8;
  float dOuter = max(a.x - hw, abs(q.y) - 8.0);
  float dInner = max(max(a.x - (hw - 2.1), q.y - 3.5), -q.y - 6.0);
  float dTri = max(dOuter, -dInner);
  float d = mix(mix(dStar, dFlower, step(0.5, kind)), dTri, step(1.5, kind));
  float keep = step(0.12, fract(rnd * 7.31));                                      // some tiles stay bare
  float dotM = step(lc.x, 1.5) * step(lc.y, 1.5) * step(0.3, fract(rnd * 13.7));   // a few sprinkled dots
  return max(step(d, 0.0) * keep, dotM);
}
`
