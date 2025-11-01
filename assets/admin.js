import { apiAdminList } from "./api.js";


const tbody = document.querySelector('#tbl tbody');


async function load() {
    const { ok, data } = await apiAdminList();
    if (!ok) return;
    tbody.innerHTML = '';
    data.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
<td class="py-2 pr-4">${r.nombre}</td>
<td class="py-2 pr-4">${r.status}</td>
<td class="py-2 pr-4">${r.acompanantes ?? ''}</td>
<td class="py-2 pr-4">${r.menu ?? ''}</td>
<td class="py-2 pr-4">${r.alergias ?? ''}</td>
<td class="py-2 pr-4">${r.bus ?? ''}</td>
`;
        tbody.appendChild(tr);
    });
}


load();