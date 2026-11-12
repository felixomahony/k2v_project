const baselineVideo = document.querySelector("#baseline-video");
const keyframeVideo = document.querySelector("#keyframe-video");
const videos = [baselineVideo, keyframeVideo];
const dials = document.querySelectorAll("[data-dial]");
const keyframeCards = document.querySelectorAll("[data-keyframe]");
const startFrames = document.querySelectorAll("[data-start-frame]");
const keyframeVideoShell = document.querySelector('[data-video-shell="keyframe"]');
const sceneButtons = document.querySelectorAll("[data-scene]");
const keyframeGenerator = document.querySelector(".keyframe-generator");
// One arrow per keyframe card; cards the current scene does not use are hidden.
const generatorArrows = document.querySelectorAll(".generator-arrow");

const scenes = {
  "duck-and-dominos": {
    name: "Duck and Dominos",
    stem: "duck-dominos",
    keyframes: [
      { time: 1.25, image: "assets/duck-dominos-keyframe-01.jpg" },
      { time: 5, image: "assets/duck-dominos-keyframe-02.jpg" },
    ],
  },
  "weight-protects-duck": {
    name: "Weight Protects Duck",
    stem: "weight-protects-duck",
    // Physics-IQ run 1, LEFT view (ours and the vanilla clip alike). Every keyframe in the
    // plan is shown: 5.0s re-uses 3.25s's image, holding the scene still to the end.
    keyframes: [
      { time: 0.5, image: "assets/weight-protects-duck-keyframe-01.jpg" },
      { time: 3.25, image: "assets/weight-protects-duck-keyframe-02.jpg" },
      { time: 5, image: "assets/weight-protects-duck-keyframe-02.jpg", held: true },
    ],
  },
  "weight-on-paper": {
    name: "Weight on Paper",
    stem: "weight-on-paper",
    keyframes: [
      { time: 1.5, image: "assets/weight-on-paper-keyframe-01.jpg" },
      { time: 5, image: "assets/weight-on-paper-keyframe-02.jpg" },
    ],
  },
};

const duration = 5;
let keyframeTimes = [1.25, 5];
const highlightDuration = 0.3;
const keyframePauseDuration = 1400;
let isHolding = false;
let heldTime = null;
let pauseTimer;
let pausedKeyframes = new Set();
let sceneLoadToken = 0;
let generatorPosition = 62.5;

function formatKeyframeTime(time) {
  return `${Number.isInteger(time) ? time.toFixed(1) : String(time)}s`;
}

function updateInterface(time) {
  const progress = Math.min(1, Math.max(0, time / duration));
  dials.forEach((dial) => dial.style.setProperty("--progress", progress));

  startFrames.forEach((frame) => {
    frame.classList.toggle("is-current", time <= highlightDuration);
  });

  let isNearKeyframe = false;
  keyframeCards.forEach((card) => {
    if (card.hidden) {
      card.classList.remove("is-matching");
      return;
    }
    const keyframeTime = Number(card.dataset.keyframe);
    const matches = time >= keyframeTime && time <= keyframeTime + highlightDuration;
    card.classList.toggle("is-matching", matches);
    isNearKeyframe ||= matches;
  });
  keyframeVideoShell.classList.toggle("is-matching", isNearKeyframe);
}

function pauseAtKeyframe(keyframeTime) {
  if (isHolding) return;
  isHolding = true;
  heldTime = keyframeTime;
  videos.forEach((video) => video.pause());
  updateInterface(keyframeTime);

  window.clearTimeout(pauseTimer);
  pauseTimer = window.setTimeout(() => {
    const isFinalKeyframe = keyframeTime >= duration - 0.05;
    if (isFinalKeyframe) {
      videos.forEach((video) => { video.currentTime = 0; });
      pausedKeyframes.clear();
      heldTime = 0;
      updateInterface(0);
      heldTime = null;
    } else {
      heldTime = null;
    }

    isHolding = false;
    if (!document.hidden) videos.forEach((video) => video.play().catch(() => {}));
  }, keyframePauseDuration);
}

function pauseAtFinalKeyframe() {
  if (pausedKeyframes.has(duration)) return;
  pausedKeyframes.add(duration);
  pauseAtKeyframe(duration);
}

function waitUntilLoaded(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 2) resolve();
    else video.addEventListener("loadeddata", resolve, { once: true });
  });
}

// A keyframe close to 0s would sit on top of the Start card, since both are placed at
// their true times. Shift the K2V strip's Start card left just enough to clear it; its
// pointer stays on 0s (see --nudge in styles.css), so the timeline stays exact.
function nudgeStartFrame() {
  const start = document.querySelector(".signal-strip-k2v [data-start-frame]");
  const first = [...keyframeCards].find((card) => !card.hidden);
  if (!start || !first) return;
  const area = start.parentElement;
  const firstX = (Number(first.dataset.keyframe) / duration) * area.clientWidth;
  const needed = start.offsetWidth + 10 - firstX;
  // Never push the card off the page: on narrow screens it may still overlap a little.
  const room = area.getBoundingClientRect().left - start.offsetWidth / 2 - 6;
  start.style.setProperty("--nudge", `${Math.max(0, Math.min(needed, room))}px`);
}

function updateGeneratorConnectors() {
  const timeArea = keyframeGenerator.parentElement;
  const boxHalfWidth = (keyframeGenerator.offsetWidth / 2 / timeArea.clientWidth) * 100;
  const boxCenterY = ((keyframeGenerator.offsetTop + keyframeGenerator.offsetHeight / 2) / timeArea.clientHeight) * 100;
  const keyframeTopY = (keyframeCards[0].offsetTop / timeArea.clientHeight) * 100;
  const horizontalGap = (7 / timeArea.clientWidth) * 100;
  const verticalGap = (7 / timeArea.clientHeight) * 100;

  const boxBottomY = ((keyframeGenerator.offsetTop + keyframeGenerator.offsetHeight) / timeArea.clientHeight) * 100;
  const boxLeft = generatorPosition - boxHalfWidth - horizontalGap;
  const boxRight = generatorPosition + boxHalfWidth + horizontalGap;
  const end = keyframeTopY - verticalGap;

  // Left of the box: leave its left side and turn down. Right: its right side. A card
  // sitting under the box gets a straight arrow down from the box's bottom edge.
  keyframeCards.forEach((card, index) => {
    const arrow = generatorArrows[index];
    if (!arrow) return;
    arrow.style.display = card.hidden ? "none" : "";
    if (card.hidden) return;
    const x = (Number(card.dataset.keyframe) / duration) * 100;
    let d;
    if (x < boxLeft) d = `M ${boxLeft} ${boxCenterY} H${x} V${end}`;
    else if (x > boxRight) d = `M ${boxRight} ${boxCenterY} H${x} V${end}`;
    else d = `M ${x} ${boxBottomY + verticalGap} V${end}`;
    arrow.setAttribute("d", d);
  });
}

async function selectScene(sceneId) {
  const scene = scenes[sceneId];
  const loadToken = ++sceneLoadToken;

  window.clearTimeout(pauseTimer);
  isHolding = false;
  heldTime = null;
  pausedKeyframes.clear();
  videos.forEach((video) => video.pause());

  keyframeTimes = scene.keyframes.map((keyframe) => keyframe.time);

  startFrames.forEach((frame) => {
    const image = frame.querySelector("img");
    image.src = `assets/${scene.stem}-start.jpg`;
    image.alt = `${scene.name} initial frame`;
  });

  keyframeCards.forEach((card, index) => {
    const keyframe = scene.keyframes[index];
    card.hidden = !keyframe;
    card.classList.remove("is-matching");
    if (!keyframe) return;

    card.dataset.keyframe = String(keyframe.time);
    card.style.left = `${(keyframe.time / duration) * 100}%`;
    card.querySelector("img").src = keyframe.image;
    card.querySelector("img").alt = `${scene.name} generated keyframe at ${keyframe.time} seconds`;
    const caption = card.querySelector("figcaption");
    caption.textContent = formatKeyframeTime(keyframe.time);
    // A keyframe that re-uses an earlier image: the scene is held still from there.
    if (keyframe.held) {
      const note = document.createElement("span");
      note.className = "keyframe-reused";
      note.textContent = " reused";
      caption.append(note);
    }
  });

  const positions = scene.keyframes.map((keyframe) => (keyframe.time / duration) * 100);
  generatorPosition = positions.length === 1
    ? Math.max(50, positions[0] - 25)
    : (positions[0] + positions[positions.length - 1]) / 2;
  keyframeGenerator.style.left = `${generatorPosition}%`;
  window.requestAnimationFrame(updateGeneratorConnectors);
  window.requestAnimationFrame(nudgeStartFrame);

  baselineVideo.poster = `assets/${scene.stem}-baseline-poster.jpg`;
  keyframeVideo.poster = `assets/${scene.stem}-k2v-poster.jpg`;
  baselineVideo.querySelector("source").src = `assets/${scene.stem}-baseline.mp4`;
  keyframeVideo.querySelector("source").src = `assets/${scene.stem}-k2v.mp4`;
  baselineVideo.setAttribute("aria-label", `Vanilla Wan2.2 generation of ${scene.name}`);
  keyframeVideo.setAttribute("aria-label", `K2V-conditioned Wan2.2 generation of ${scene.name}`);

  sceneButtons.forEach((button) => {
    const active = button.dataset.scene === sceneId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  videos.forEach((video) => video.load());
  updateInterface(0);
  await Promise.all(videos.map(waitUntilLoaded));

  if (loadToken !== sceneLoadToken) return;
  videos.forEach((video) => video.play().catch(() => {}));
}

function animate() {
  const time = Math.min(duration, baselineVideo.currentTime || 0);

  if (!isHolding) {
    videos.forEach((video) => { video.playbackRate = 1; });

    if (Math.abs(keyframeVideo.currentTime - baselineVideo.currentTime) > 0.08) {
      keyframeVideo.currentTime = baselineVideo.currentTime;
    }

    const reachedKeyframe = keyframeTimes.find(
      (keyframeTime) => !pausedKeyframes.has(keyframeTime) && time >= keyframeTime - 0.025,
    );
    if (reachedKeyframe !== undefined) {
      pausedKeyframes.add(reachedKeyframe);
      pauseAtKeyframe(reachedKeyframe);
    }
  }

  updateInterface(heldTime ?? time);
  window.requestAnimationFrame(animate);
}

videos.forEach((video) => {
  video.addEventListener("ended", pauseAtFinalKeyframe);
});

sceneButtons.forEach((button) => {
  button.addEventListener("click", () => selectScene(button.dataset.scene));
});

window.addEventListener("resize", () => {
  updateGeneratorConnectors();
  nudgeStartFrame();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    videos.forEach((video) => video.pause());
  } else if (!isHolding) {
    videos.forEach((video) => video.play().catch(() => {}));
  }
});

Promise.all(
  videos.map(waitUntilLoaded),
).then(() => {
  videos.forEach((video) => video.play().catch(() => {}));
});

updateInterface(0);
window.requestAnimationFrame(updateGeneratorConnectors);
window.requestAnimationFrame(nudgeStartFrame);
window.requestAnimationFrame(animate);
