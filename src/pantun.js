/* A pantun rhymes by its last sound: lines 1 & 3 share one, lines 2 & 4 share another.
   The "rime" is everything from the last vowel to the end of the last word: dulang -> ang, dimakan -> an. */
export function rime(line) {
  const word = (line.match(/([A-Za-zÀ-ÿ']+)[^A-Za-zÀ-ÿ']*$/) || [])[1]
  if (!word) return ''
  const m = word.toLowerCase().match(/[aeiou][^aeiou]*$/)
  return m ? m[0] : ''
}

export function pair(a, b) {
  const ra = rime(a)
  const rb = rime(b)
  if (!ra || !rb) return { state: 'empty', ra, rb }
  return { state: ra === rb ? 'match' : 'miss', ra, rb }
}
