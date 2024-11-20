const randomColor = Math.floor(Math.random() * 16777215).toString(16);
export const setTheme = () => {
  const randomColor = Math.floor(Math.random() * 2 ** 24).toString(16).padStart(6, "0");
  return randomColor;
};

function randomInteger(max) {
  return Math.floor(Math.random() * (max + 1));
}

function randomRgbColor() {
  let r = randomInteger(255);
  let g = randomInteger(255);
  let b = randomInteger(255);
  r.toString() == 'FA' && (r = randomInteger(255));
  g.toString() == '69' && (g = randomInteger(255));
  b.toString() == '3B' && (b = randomInteger(255));

  return [r, g, b];
}
export const setTheme2 = () => {
  const [r, g, b] = randomRgbColor();

  let hr = r.toString(16).padStart(2, '0');
  let hg = g.toString(16).padStart(2, '0');
  let hb = b.toString(16).padStart(2, '0');

  return '#' + hr + hg + hb;
};
