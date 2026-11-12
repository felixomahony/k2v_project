// Benchmark charts: one horizontal bar chart per results section, ours highlighted.
// The bars grow together and the values count up the first time a chart scrolls into
// view; with reduced motion they are simply drawn at their final length.
//
// Physics-IQ Verified (image-to-video): ten rows of the leaderboard's image-to-video track --
// our two rows as in the paper's table (mean of four runs), the vanilla Wan2.2 backbones,
// and the best entry of each of the six highest-scoring other labs. PhyGenBench (text-to-video):
// the official-protocol rows of the paper's table. Keep in step with tables/leaderboard.tex
// and tables/phygenbench.tex.

(function () {
  const CHARTS = {
    "physics-iq": {
      title: "Physics-IQ score, image-to-video (higher is better)",
      max: 60,
      digits: 1,
      rows: [
        ["K2V+Wan2.2-14B", 55.0, true],
        ["K2V+Wan2.2-5B", 50.0, true],
        ["Cosmos3-Super", 42.7],
        ["MiniMax H3 (FL2VA)", 39.8],
        ["Grok Imagine Video", 34.8],
        ["Magi-1 24B + GeoPhys (BoN)", 33.7],
        ["Hunyuan Video 1.5", 33.4],
        ["Wan2.2-14B", 32.2],
        ["CogVideoX-5B", 31.8],
        ["Wan2.2-TI2V-5B", 27.7],
      ],
    },
    phygenbench: {
      title: "PhyGenBench score (higher is better)",
      max: 0.7,
      digits: 3,
      rows: [
        ["K2V+Wan2.2-14B", 0.633, true],
        ["K2V+Wan2.2-5B", 0.633, true],
        ["Wan2.2-T2V-A14B", 0.527],
        ["Gen-3", 0.51],
        ["Kling", 0.49],
        ["Wan2.2-TI2V-5B", 0.462],
        ["Vchitect 2.0", 0.45],
        ["CogVideoX-5B", 0.45],
        ["Open-Sora V1.2", 0.44],
        ["Pika", 0.44],
      ],
    },
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DURATION = 1600;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function build(host, spec) {
    const figure = el("figure", "chart");
    figure.append(el("figcaption", "chart-title", spec.title));
    const list = el("div", "chart-rows");
    const bars = [];
    for (const [label, value, ours] of spec.rows) {
      const row = el("div", ours ? "chart-row is-ours" : "chart-row");
      row.append(el("span", "chart-label", label));
      const track = el("span", "chart-track");
      const bar = el("span", "chart-bar");
      const num = el("span", "chart-value", (0).toFixed(spec.digits));
      track.append(bar, num);
      row.append(track);
      list.append(row);
      bars.push({ bar, num, value });
    }
    figure.append(list);
    host.append(figure);
    return bars;
  }

  function draw(bars, spec, u) {
    for (const { bar, num, value } of bars) {
      const w = (100 * value * u) / spec.max;
      bar.style.width = `${w}%`;
      num.style.left = `calc(${w}% + 10px)`;
      num.textContent = (value * u).toFixed(spec.digits);
    }
  }

  function animate(bars, spec) {
    if (reduced) return draw(bars, spec, 1);
    const start = performance.now();
    function step(now) {
      const x = Math.min(1, (now - start) / DURATION);
      draw(bars, spec, 1 - Math.pow(1 - x, 3));       // ease out
      if (x < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll("[data-chart]").forEach((host) => {
    const spec = CHARTS[host.dataset.chart];
    if (!spec) return;
    const bars = build(host, spec);
    draw(bars, spec, 0);
    if (!("IntersectionObserver" in window)) return animate(bars, spec);
    const seen = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          seen.disconnect();
          animate(bars, spec);
        }
      },
      { threshold: 0.35 },
    );
    seen.observe(host);
  });
})();
