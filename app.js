import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFlUj6xQchbokr3yCbmF6U-VBSpoCx-YBw",
  authDomain: "taller-dashboard-firebase.firebaseapp.com",
  projectId: "taller-dashboard-firebase",
  storageBucket: "taller-dashboard-firebase.firebasestorage.app",
  messagingSenderId: "692721343518",
  appId: "1:592721343518:web:2d64a09a135859a7afaa0f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const formulario = document.getElementById('formularioRegistro');
const clienteIdInput = document.getElementById('clienteId');
const nombreInput = document.getElementById('nombre');
const correoInput = document.getElementById('correo');
const telefonoInput = document.getElementById('telefono');
const categoriaInput = document.getElementById('categoria');
const estadoInput = document.getElementById('estado');
const montoInput = document.getElementById('monto');

const btnGuardar = document.getElementById('btnGuardar');
const btnCancelar = document.getElementById('btnCancelar');
const tablaUsuarios = document.getElementById('tablaUsuarios');
const buscador = document.getElementById('buscador');
const filtroCategoria = document.getElementById('filtroCategoria');
const filtroEstado = document.getElementById('filtroEstado');
const btnExportar = document.getElementById('btnExportar');
const btnTheme = document.getElementById('btnTheme');
const feedActividad = document.getElementById('feedActividad');

const statTotal = document.getElementById('statTotal');
const statIngresos = document.getElementById('statIngresos');
const statVIP = document.getElementById('statVIP');
const statHoy = document.getElementById('statHoy');

let listaClientes = [];
let graficoPieChart = null;
let graficoBarChart = null;

// Modo Oscuro / Claro Toggle
btnTheme.addEventListener('click', () => {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  btnTheme.innerHTML = isDark ? `<i class="fas fa-moon me-2"></i> Modo Oscuro` : `<i class="fas fa-sun me-2"></i> Modo Claro`;
});

// Guardar o Actualizar
formulario.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = clienteIdInput.value;
  const clienteData = {
    nombre: nombreInput.value,
    correo: correoInput.value,
    telefono: telefonoInput.value,
    categoria: categoriaInput.value,
    estado: estadoInput.value,
    monto: parseFloat(montoInput.value) || 0,
    fecha: new Date().toISOString()
  };

  try {
    if (id) {
      await updateDoc(doc(db, "usuarios", id), clienteData);
      registrarActividad(`Cliente ${clienteData.nombre} actualizado`, 'warning');
    } else {
      await addDoc(collection(db, "usuarios"), clienteData);
      registrarActividad(`Nuevo cliente: ${clienteData.nombre}`, 'success');
    }
    limpiarFormulario();
  } catch (error) {
    console.error("Error al guardar:", error);
  }
});

// Firebase Snapshot
onSnapshot(collection(db, "usuarios"), (snapshot) => {
  listaClientes = [];
  let totalMonto = 0;
  let vipCount = 0;
  let hoyCount = 0;
  const hoyStr = new Date().toISOString().split('T')[0];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    listaClientes.push(data);

    totalMonto += (data.monto || 0);
    if (data.categoria === 'VIP') vipCount++;
    if (data.fecha && data.fecha.startsWith(hoyStr)) hoyCount++;
  });

  statTotal.textContent = listaClientes.length;
  statIngresos.textContent = `$${totalMonto.toLocaleString('es-CO')}`;
  statVIP.textContent = vipCount;
  statHoy.textContent = hoyCount;

  aplicarFiltros();
  actualizarGraficos();
});

function registrarActividad(mensaje, tipo) {
  const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const item = document.createElement('div');
  item.className = `list-group-item list-group-item-${tipo} border-0 rounded mb-1 py-1 px-2`;
  item.innerHTML = `<small class="fw-bold">${hora}</small> - ${mensaje}`;
  
  if (feedActividad.querySelector('.text-muted')) feedActividad.innerHTML = '';
  feedActividad.prepend(item);
}

// Filtros avanzados
function aplicarFiltros() {
  const texto = buscador.value.toLowerCase();
  const cat = filtroCategoria.value;
  const est = filtroEstado.value;

  const filtrados = listaClientes.filter(c => {
    const coincideTexto = c.nombre.toLowerCase().includes(texto) || c.correo.toLowerCase().includes(texto);
    const coincideCat = cat === 'TODAS' || c.categoria === cat;
    const coincideEst = est === 'TODOS' || c.estado === est;
    return coincideTexto && coincideCat && coincideEst;
  });

  renderTabla(filtrados);
}

buscador.addEventListener('input', aplicarFiltros);
filtroCategoria.addEventListener('change', aplicarFiltros);
filtroEstado.addEventListener('change', aplicarFiltros);

function renderTabla(datos) {
  tablaUsuarios.innerHTML = "";

  if (datos.length === 0) {
    tablaUsuarios.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">Sin registros encontrados</td></tr>`;
    return;
  }

  datos.forEach((item) => {
    const badgeCat = item.categoria === 'VIP' ? 'bg-warning text-dark' : (item.categoria === 'Frecuente' ? 'bg-info' : 'bg-secondary');
    const badgeEst = item.estado === 'Activo' ? 'bg-success' : (item.estado === 'En Negociación' ? 'bg-primary' : 'bg-danger');

    const fila = `
      <tr>
        <td class="fw-bold">${item.nombre}</td>
        <td><small>${item.correo}</small></td>
        <td><span class="badge ${badgeCat}">${item.categoria || 'Nuevo'}</span></td>
        <td><span class="badge ${badgeEst}">${item.estado || 'Activo'}</span></td>
        <td class="fw-bold text-success">$${(item.monto || 0).toLocaleString('es-CO')}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary py-0 px-1 me-1" onclick="prepararEdicion('${item.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="eliminarCliente('${item.id}')"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
    tablaUsuarios.innerHTML += fila;
  });
}

window.prepararEdicion = (id) => {
  const c = listaClientes.find(x => x.id === id);
  if (c) {
    clienteIdInput.value = c.id;
    nombreInput.value = c.nombre;
    correoInput.value = c.correo;
    telefonoInput.value = c.telefono;
    categoriaInput.value = c.categoria || 'Nuevo';
    estadoInput.value = c.estado || 'Activo';
    montoInput.value = c.monto || 0;

    btnGuardar.textContent = "Actualizar Cliente";
    btnGuardar.className = "btn btn-warning w-100 fw-bold btn-sm mb-2";
    btnCancelar.classList.remove('d-none');
  }
};

window.limpiarFormulario = () => {
  clienteIdInput.value = "";
  formulario.reset();
  btnGuardar.textContent = "Guardar Cliente";
  btnGuardar.className = "btn btn-primary w-100 fw-bold btn-sm mb-2";
  btnCancelar.classList.add('d-none');
};

window.eliminarCliente = async (id) => {
  if (confirm("¿Deseas borrar este registro de Firebase?")) {
    try {
      const c = listaClientes.find(x => x.id === id);
      await deleteDoc(doc(db, "usuarios", id));
      if (c) registrarActividad(`Cliente ${c.nombre} eliminado`, 'danger');
    } catch (error) {
      console.error("Error:", error);
    }
  }
};

function actualizarGraficos() {
  const montosPorCat = { VIP: 0, Frecuente: 0, Nuevo: 0 };
  const conteoCat = { VIP: 0, Frecuente: 0, Nuevo: 0 };

  listaClientes.forEach(c => {
    const cat = c.categoria || 'Nuevo';
    if (conteoCat[cat] !== undefined) {
      conteoCat[cat]++;
      montosPorCat[cat] += (c.monto || 0);
    }
  });

  const ctxPie = document.getElementById('graficoCategorias').getContext('2d');
  const ctxBar = document.getElementById('graficoBarras').getContext('2d');

  if (graficoPieChart) graficoPieChart.destroy();
  if (graficoBarChart) graficoBarChart.destroy();

  graficoPieChart = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: ['VIP', 'Frecuente', 'Nuevo'],
      datasets: [{ data: [conteoCat.VIP, conteoCat.Frecuente, conteoCat.Nuevo], backgroundColor: ['#ffc107', '#0dcaf0', '#6c757d'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  graficoBarChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['VIP', 'Frecuente', 'Nuevo'],
      datasets: [{ label: 'Ventas ($)', data: [montosPorCat.VIP, montosPorCat.Frecuente, montosPorCat.Nuevo], backgroundColor: ['#ffc107', '#0dcaf0', '#6c757d'] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

btnExportar.addEventListener('click', () => {
  if (listaClientes.length === 0) return alert("Sin datos");
  let csv = "data:text/csv;charset=utf-8,Nombre,Correo,Telefono,Categoria,Estado,Monto\n";
  listaClientes.forEach(c => {
    csv += `"${c.nombre}","${c.correo}","${c.telefono}","${c.categoria || 'Nuevo'}","${c.estado || 'Activo'}","${c.monto || 0}"\n`;
  });
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csv));
  link.setAttribute("download", "reporte_crm.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});