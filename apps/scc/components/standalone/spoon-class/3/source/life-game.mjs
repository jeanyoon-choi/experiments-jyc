// Deliberately self-contained: this function is stringified into the isolated
// game document before the upstream bootstrap runs.
//
// `books` lists real spine photographs (data URI and pixel size, 수학의 정석
// first). When given, both obstacle sprites become a shelf of those spines
// standing upright, full height, in a random order per game: 수학의 정석 and
// other workbooks in place of tests and life blocks. Only the images change;
// obstacle sizes and collision boxes stay the source's.
export function installLifeGamePresentation(document, books) {
  const INK = "#535353";
  const PAPER = "#f7f7f7";

  function dataUri(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function human(x, pose) {
    const legs =
      pose === "run-left"
        ? '<rect x="16" y="35" width="5" height="10"/><rect x="24" y="35" width="5" height="6"/>'
        : pose === "run-right"
          ? '<rect x="16" y="35" width="5" height="6"/><rect x="24" y="35" width="5" height="10"/>'
          : pose === "crashed"
            ? '<rect x="7" y="39" width="18" height="5"/><rect x="3" y="34" width="8" height="5"/>'
            : '<rect x="16" y="35" width="5" height="10"/><rect x="24" y="35" width="5" height="10"/>';
    const torso = pose === "crashed" ? '<rect x="15" y="32" width="14" height="6"/>' : '<rect x="15" y="20" width="14" height="16"/>';
    const head = pose === "crashed" ? '<rect x="28" y="29" width="9" height="9"/>' : '<rect x="17" y="7" width="10" height="11"/>';
    const arms = pose === "crashed" ? "" : '<rect x="9" y="23" width="7" height="5"/><rect x="28" y="25" width="7" height="5"/>';
    return `<g transform="translate(${x} 0)" fill="${INK}">${head}${torso}${arms}${legs}</g>`;
  }

  function trexSprite(scale) {
    const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="${262 * scale}" height="${47 * scale}" viewBox="0 0 262 47" shape-rendering="crispEdges">${human(0, "jump")}${human(44, "still")}${human(88, "run-left")}${human(132, "run-right")}${human(220, "crashed")}</svg>`;
    return dataUri(sprite);
  }

  function examSprite(scale) {
    const papers = Array.from({ length: 6 }, (_, index) => {
      const x = index * 17;
      return `<g transform="translate(${x} 0)" fill="${INK}"><rect x="1" y="0" width="15" height="35"/><rect x="3" y="2" width="11" height="31" fill="${PAPER}"/><rect x="3" y="2" width="11" height="3"/><rect x="4" y="8" width="2" height="2"/><rect x="8" y="8" width="5" height="1"/><rect x="4" y="13" width="2" height="2"/><rect x="8" y="13" width="5" height="1"/><rect x="4" y="18" width="2" height="2"/><rect x="8" y="18" width="5" height="1"/><rect x="4" y="24" width="8" height="1"/><rect x="4" y="28" width="2" height="2"/><rect x="7" y="28" width="2" height="2"/><rect x="10" y="28" width="2" height="2"/></g>`;
    }).join("");
    return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${102 * scale}" height="${35 * scale}" viewBox="0 0 102 35" shape-rendering="crispEdges">${papers}</svg>`);
  }

  function lifeObstacleSprite(scale) {
    const blocks = Array.from({ length: 6 }, (_, index) => {
      const x = index * 25;
      return `<g transform="translate(${x} 0)" fill="${INK}"><rect x="2" y="2" width="21" height="48"/><rect x="5" y="5" width="15" height="42" fill="${PAPER}"/><rect x="8" y="9" width="9" height="5" fill="${INK}"/><rect x="8" y="20" width="9" height="3" fill="${INK}"/><rect x="8" y="29" width="9" height="3" fill="${INK}"/><rect x="8" y="38" width="9" height="3" fill="${INK}"/></g>`;
    }).join("");
    return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${150 * scale}" height="${50 * scale}" viewBox="0 0 150 50" shape-rendering="crispEdges">${blocks}</svg>`);
  }

  // Spines are drawn this much thicker than photographed so their titles
  // read at game size; height stays the obstacle's.
  const SPINE_WIDTH_SCALE = 2.2;

  function shelf(width, height, scale) {
    // 수학의 정석 is twice as likely as any other workbook.
    const choices = [books[0]].concat(books);
    let x = 0;
    let spines = "";
    while (x < width) {
      const book = choices[Math.floor(Math.random() * choices.length)];
      const bookWidth = (height * book.width * SPINE_WIDTH_SCALE) / book.height;
      spines += `<image x="${x}" y="0" width="${bookWidth}" height="${height}" preserveAspectRatio="none" href="${book.src}"/>`;
      x += bookWidth;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">${spines}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  const shelves = Array.isArray(books) && books.length > 0;
  const sprites = {
    "1x-trex": trexSprite(1),
    "2x-trex": trexSprite(2),
    "1x-obstacle-small": shelves ? shelf(102, 35, 1) : examSprite(1),
    "2x-obstacle-small": shelves ? shelf(102, 35, 2) : examSprite(2),
    "1x-obstacle-large": shelves ? shelf(150, 50, 1) : lifeObstacleSprite(1),
    "2x-obstacle-large": shelves ? shelf(150, 50, 2) : lifeObstacleSprite(2),
  };

  for (const [id, src] of Object.entries(sprites)) {
    const image = document.getElementById(id);
    if (image) image.src = src;
  }
}
