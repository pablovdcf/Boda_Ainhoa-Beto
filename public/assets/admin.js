// assets/admin.js
import { apiAdminList, CONFIG } from "./api.js";

const pinGate  = document.getElementById("pinGate");
const pinForm  = document.getElementById("pinForm");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const content  = document.getElementById("content");

const tbody   = document.getElementById("tbody");
const k_total = document.getElementById("k_total");
const k_si    = document.getElementById("k_si");
const k_no    = document.getElementById("k_no");
const k_acomp = document.getElementById("k_acomp");

const f_estado = document.getElementById("f_estado");
const f_grupo  = document.getElementById("f_grupo");
const btnExport= document.getElementById("btnExport");

let DATA = [];

function asCSV(rows){
  const esc = v => `"${String(v??"").replace(/"/g,'""')}"`;
  const head = ["token","nombre","grupo","status","acompanantes","menu","alergias","bus"];
  const lines = [head.map(esc).join(",")];
  rows.forEach(r=>{
    lines.push([
      r.token, r.nombre, r.grupo||"", r.status||"",
      r.acompanantes||0, r.menu||"", r.alergias||"", r.bus||""
    ].map(esc).join(","));
  });
  return lines.join("\r\n");
}
function download(name, text){
  const blob = new Blob([text], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}

function render(rows){
  tbody.innerHTML = "";
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2">${r.nombre||""}</td>
      <td class="p-2">${r.grupo||""}</td>
      <td class="p-2">${r.status||"pendiente"}</td>
      <td class="p-2 text-right">${r.acompanantes||0}</td>
      <td class="p-2">${r.menu||""}</td>
      <td class="p-2">${r.alergias||""}</td>
      <td class="p-2">${String(r.bus||"")}</td>
      <td class="p-2 text-slate-500">${r.token}</td>
    `;
    tbody.appendChild(tr);
  });
  // KPIs
  k_total.textContent = rows.length;
  k_si.textContent    = rows.filter(r=>String(r.status).toLowerCase()==="si").length;
  k_no.textContent    = rows.filter(r=>String(r.status).toLowerCase()==="no").length;
  k_acomp.textContent = rows.reduce((a,r)=>a+Number(r.acompanantes||0),0);
}

function applyFilters(){
  const st = (f_estado.value||"").toLowerCase();
  const g  = (f_grupo.value||"").toLowerCase();
  let rows = DATA.slice();
  if (st) rows = rows.filter(r => String(r.status||"").toLowerCase()===st);
  if (g)  rows = rows.filter(r => String(r.grupo||"").toLowerCase().includes(g));
  render(rows);
}

f_estado.addEventListener("change", applyFilters);
f_grupo.addEventListener("input", applyFilters);
btnExport.addEventListener("click", ()=> download("rsvps.csv", asCSV(DATA)));

async function load(){
  const { ok, data, error } = await apiAdminList();
  if (!ok) throw new Error(error||"admin_list error");
  DATA = data || [];
  applyFilters();
}

// --- PIN muy simple en cliente (oculta del público casual) ---
const saved = localStorage.getItem("admin_pin");
if (saved === CONFIG.ADMIN_PIN) { pinGate.classList.add("hidden"); content.classList.remove("hidden"); load(); }

pinForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  const pin = pinInput.value.trim();
  if (pin === CONFIG.ADMIN_PIN) {
    localStorage.setItem("admin_pin", pin);
    pinGate.classList.add("hidden");
    content.classList.remove("hidden");
    load();
  } else {
    pinError.classList.remove("hidden");
  }
});
