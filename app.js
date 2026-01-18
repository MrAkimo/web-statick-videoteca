console.log("JS cargado ✅", new Date().toISOString());
const RATINGS_KEY = "dance_ratings_v1";
let VIDEOS = [];

const $ = s => document.querySelector(s);

async function loadVideos(){
  const res = await fetch("./data/videos.json", { cache: "no-store" });
  return await res.json();
}

function unique(list){
  return [...new Set(list)].sort();
}

function loadRatings(){
  return JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}");
}

function saveRatings(r){
  localStorage.setItem(RATINGS_KEY, JSON.stringify(r));
}

function buildSelect(id, values, label){
  const sel = $(id);
  sel.innerHTML = `<option value="">${label}</option>`;
  values.forEach(v=>{
    sel.innerHTML += `<option value="${v}">${v}</option>`;
  });
}

function formatDate(iso){
      const [y,m,d] = iso.split("-").map(Number);
      const dt = new Date(y, m-1, d);
      return dt.toLocaleDateString("es-ES", { year:"numeric", month:"short", day:"2-digit" });
    }

function render(){
  const q = $("#q").value.toLowerCase();
  const type = $("#type").value;
  const style = $("#style").value;
  const teacher = $("#teacher").value;
  const level = $("#level").value;
  const minRating = +$("#minRating").value;
  const sort = $("#sort").value;

  const ratings = loadRatings();

  let list = VIDEOS.map(v=>({
    ...v,
    _rating: ratings[v.id] ?? v.rating ?? 0
  }));

  if(q){
    list = list.filter(v =>
      (v.title + v.description).toLowerCase().includes(q)
    );
  }
  if(type) list = list.filter(v => v.type === type);
  if(style) list = list.filter(v => v.style === style);
  if(teacher) list = list.filter(v => v.teacher === teacher);
  if(level) list = list.filter(v => v.level === level);
  list = list.filter(v => v._rating >= minRating);

  if(sort === "date_desc") list.sort((a,b)=>b.date.localeCompare(a.date));
  if(sort === "date_asc") list.sort((a,b)=>a.date.localeCompare(b.date));
  if(sort === "rating_desc") list.sort((a,b)=>b._rating - a._rating);
  if(sort === "rating_asc") list.sort((a,b)=>a._rating - b._rating);

  $("#grid").innerHTML = list.map(v=>`
    <article class="card" data-id="${v.id}">
      <div class="thumb">
        <img src="${v.thumb}">
        <div class="badge">${v.style}</div>
        <a class="play" href="${v.videoUrl}" target="_blank">Abrir en Drive</a>
      </div>
      <div class="body">
        <h3>${v.title}</h3>
        <div class="row">
          <span class="pill">${v.type}</span>
          <span class="pill">${v.level}</span>
          <span class="pill">${v.teacher}</span>
          <span>📅 ${formatDate(v.date)}</span>
        </div>

        <div class="rating">
          ${[1,2,3,4,5].map(i=>`
            <button class="star ${i<=v._rating?'on':''}" data-star="${i}">★</button>
          `).join("")}
          <span class="pill">${v._rating}/5</span>
        </div>

        <div class="desc">${v.description}</div>
      </div>
      <div class="footer">
        <span>${"ID: " + v.id}</span>
        <span>${v.date}</span>
      </div>
    </article>
  `).join("");

  $("#empty").style.display = list.length ? "none" : "block";
  $("#countMeta").textContent = `${list.length} de ${VIDEOS.length} vídeos`;

  $("#activeFilters").textContent =
    [type && `tipo:${type}`, style && `estilo:${style}`, teacher && `profe:${teacher}`, level && `nivel:${level}`, minRating && `★≥${minRating}`]
      .filter(Boolean).join(" · ") || "Sin filtros";
}

$("#grid").addEventListener("click", e=>{
  const star = e.target.closest(".star");
  if(!star) return;
  const card = e.target.closest(".card");
  const id = card.dataset.id;
  const value = +star.dataset.star;
  const r = loadRatings();
  r[id] = value;
  saveRatings(r);
  render();
});

["q","type","style","teacher","level","minRating","sort"]
  .forEach(id=>{
    $("#"+id).addEventListener("input", render);
    $("#"+id).addEventListener("change", render);
  });

$("#reset").onclick = ()=>{
  document.querySelectorAll("input,select").forEach(e=>e.value="");
  $("#minRating").value = "0";
  $("#sort").value = "date_desc";
  render();
};

(async function init(){
  VIDEOS = await loadVideos();
  buildSelect("#type", unique(VIDEOS.map(v=>v.type)), "Todos");
  buildSelect("#style", unique(VIDEOS.map(v=>v.style)), "Todos");
  buildSelect("#teacher", unique(VIDEOS.map(v=>v.teacher)), "Todos");
  buildSelect("#level", unique(VIDEOS.map(v=>v.level)), "Todos");

  setupFiltersToggle();
  render();
})();

function setupFiltersToggle(){
  const btn = document.getElementById("toggleFilters");
  const panel = document.getElementById("filtersPanel");
  if (!btn || !panel) return;

  const setOpen = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    panel.classList.toggle("open", open);
  };

  const applyByViewport = () => setOpen(window.innerWidth >= 900);

  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    setOpen(!open);
  });

  applyByViewport();
  window.addEventListener("resize", applyByViewport);
}
