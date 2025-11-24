// Data Structure
let data = {
    cuartos: [],
    departamentos: [],
    servicios: {
        agua: [],
        luz: [],
        internet: [],
        otros: []
    }
};

// Initialize data
function initializeData() {
    const savedData = localStorage.getItem('rentasData');

    if (savedData) {
        data = JSON.parse(savedData);
        // Add ocupado field to existing data if it doesn't exist
        data.cuartos.forEach(c => {
            if (c.ocupado === undefined) c.ocupado = true;
        });
        data.departamentos.forEach(d => {
            if (d.ocupado === undefined) d.ocupado = true;
        });
    } else {
        // Create default data for 4 rooms and 4 apartments
        for (let i = 1; i <= 4; i++) {
            data.cuartos.push({
                id: i,
                inquilino: `Cuarto ${i}`,
                renta: 1500,
                ocupado: true,
                pagos: {}
            });

            data.departamentos.push({
                id: i,
                inquilino: `Departamento ${i}`,
                renta: 4500,
                ocupado: true,
                pagos: {}
            });
        }
        saveData();
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('rentasData', JSON.stringify(data));
}

// Get current month key (YYYY-MM format)
function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get month name in Spanish
function getMonthName(monthKey) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [year, month] = monthKey.split('-');
    return `${months[parseInt(month) - 1]} ${year}`;
}

// Format currency
function formatCurrency(amount) {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Render rental cards
function renderRentals() {
    renderRentalSection('cuartos', data.cuartos, 'cuartos-grid');
    renderRentalSection('departamentos', data.departamentos, 'departamentos-grid');
    updateSummary();
    renderMonthlyRevenue();
}

// Render monthly revenue history
function renderMonthlyRevenue() {
    const container = document.getElementById('monthly-revenue-list');

    // Get all unique months from payment history
    const monthsSet = new Set();
    [...data.cuartos, ...data.departamentos].forEach(rental => {
        Object.keys(rental.pagos).forEach(month => {
            monthsSet.add(month);
        });
    });

    // Sort months descending (most recent first)
    const months = Array.from(monthsSet).sort().reverse();

    if (months.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No hay historial de recaudación aún.</p>';
        return;
    }

    let html = '<div class="revenue-history-grid">';

    months.forEach(monthKey => {
        const monthName = getMonthName(monthKey);
        let metaMes = 0;
        let recaudado = 0;

        // Calculate meta and collected for this month
        [...data.cuartos, ...data.departamentos].forEach(rental => {
            // Note: We use current ocupado status as proxy (ideally we'd track historical ocupado)
            if (rental.ocupado) {
                metaMes += rental.renta;
            }

            const payment = rental.pagos[monthKey];
            if (payment && payment.pagado) {
                recaudado += rental.renta;
            }
        });

        const pendiente = metaMes - recaudado;
        const porcentaje = metaMes > 0 ? ((recaudado / metaMes) * 100).toFixed(0) : 0;

        html += `
        <div class="revenue-month-card">
          <div class="revenue-month-header">
            <h3>${monthName}</h3>
            <div class="revenue-percentage ${porcentaje >= 100 ? 'complete' : ''}">${porcentaje}%</div>
          </div>
          <div class="revenue-month-details">
            <div class="revenue-row">
              <span>Meta:</span>
              <span class="revenue-amount">${formatCurrency(metaMes)}</span>
            </div>
            <div class="revenue-row">
              <span>Recaudado:</span>
              <span class="revenue-amount success">${formatCurrency(recaudado)}</span>
            </div>
            <div class="revenue-row">
              <span>Pendiente:</span>
              <span class="revenue-amount ${pendiente > 0 ? 'warning' : 'success'}">${formatCurrency(pendiente)}</span>
            </div>
          </div>
          <div class="revenue-progress-bar">
            <div class="revenue-progress-fill" style="width: ${Math.min(porcentaje, 100)}%"></div>
          </div>
        </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderRentalSection(type, rentals, containerId) {
    const container = document.getElementById(containerId);
    const currentMonth = getCurrentMonthKey();

    container.innerHTML = rentals.map(rental => {
        const payment = rental.pagos[currentMonth] || { pagado: false, fecha: null, notas: '' };

        return `
      <div class="rental-card ${!rental.ocupado ? 'desocupado' : ''}">
        <div class="rental-header">
          <div class="rental-title">${type === 'cuartos' ? '🚪' : '🏠'} ${rental.inquilino}</div>
          <div class="rental-price">${formatCurrency(rental.renta)}</div>
        </div>
        
        <div class="occupancy-selector">
          <button class="occupancy-btn occupied ${rental.ocupado ? 'active' : ''}" 
                  onclick="toggleOcupado('${type}', ${rental.id}, true)">
            🟢 Ocupado
          </button>
          <button class="occupancy-btn vacant ${!rental.ocupado ? 'active' : ''}" 
                  onclick="toggleOcupado('${type}', ${rental.id}, false)">
            ⚪ Desocupado
          </button>
        </div>
        
        <div class="rental-info">
          <div class="input-group">
            <label>Nombre del Inquilino</label>
            <input type="text" value="${rental.inquilino}" 
                   onchange="updateInquilino('${type}', ${rental.id}, this.value)">
          </div>
          
          <div class="input-group">
            <label>Fecha de Pago</label>
            <input type="date" 
                   value="${payment.fecha || ''}" 
                   onchange="updateFechaPago('${type}', ${rental.id}, this.value)"
                   ${!payment.pagado ? 'disabled' : ''}>
          </div>
        </div>
        
        <div class="payment-status">
          <button class="status-btn paid ${payment.pagado ? 'active' : ''}" 
                  onclick="togglePayment('${type}', ${rental.id}, true)">
            ✓ Pagado
          </button>
          <button class="status-btn pending ${!payment.pagado ? 'active' : ''}" 
                  onclick="togglePayment('${type}', ${rental.id}, false)">
            ⏱ Pendiente
          </button>
        </div>
        
        <button class="btn btn-secondary btn-block btn-small" 
                onclick="showHistory('${type}', ${rental.id})" 
                style="margin-top: 1rem;">
          Ver Historial
        </button>
      </div>
    `;
    }).join('');
}

// Toggle ocupado status
function toggleOcupado(type, id, ocupado) {
    const rental = data[type].find(r => r.id === id);
    if (rental) {
        rental.ocupado = ocupado;
        saveData();
        renderRentals();
    }
}

// Update inquilino name
function updateInquilino(type, id, value) {
    const rental = data[type].find(r => r.id === id);
    if (rental) {
        rental.inquilino = value;
        saveData();
    }
}

// Update payment notes
function updateNotas(type, id, value) {
    const rental = data[type].find(r => r.id === id);
    const currentMonth = getCurrentMonthKey();

    if (rental) {
        if (!rental.pagos[currentMonth]) {
            rental.pagos[currentMonth] = { pagado: false, fecha: null, notas: '' };
        }
        rental.pagos[currentMonth].notas = value;
        saveData();
    }
}

// Update payment date
function updateFechaPago(type, id, value) {
    const rental = data[type].find(r => r.id === id);
    const currentMonth = getCurrentMonthKey();

    if (rental) {
        if (!rental.pagos[currentMonth]) {
            rental.pagos[currentMonth] = { pagado: false, fecha: null, notas: '' };
        }
        rental.pagos[currentMonth].fecha = value;
        saveData();
        renderRentals();
    }
}

// Toggle payment status
function togglePayment(type, id, isPaid) {
    const rental = data[type].find(r => r.id === id);
    const currentMonth = getCurrentMonthKey();

    if (rental) {
        if (!rental.pagos[currentMonth]) {
            rental.pagos[currentMonth] = { pagado: false, fecha: null, notas: '' };
        }

        rental.pagos[currentMonth].pagado = isPaid;

        // Only set date to today if marking as paid AND there's no existing date
        if (isPaid && !rental.pagos[currentMonth].fecha) {
            rental.pagos[currentMonth].fecha = new Date().toISOString().split('T')[0];
        }
        // Clear date if marking as pending
        if (!isPaid) {
            rental.pagos[currentMonth].fecha = null;
        }

        saveData();
        renderRentals();
    }
}

// Update summary
function updateSummary() {
    const currentMonth = getCurrentMonthKey();
    let ingresoMes = 0;
    let totalEsperado = 0;

    [...data.cuartos, ...data.departamentos].forEach(rental => {
        // Only count occupied units for the expected total (meta)
        if (rental.ocupado) {
            totalEsperado += rental.renta;
        }

        const payment = rental.pagos[currentMonth];
        if (payment && payment.pagado) {
            ingresoMes += rental.renta;
        }
    });

    const pendiente = totalEsperado - ingresoMes;

    document.getElementById('ingreso-mes').textContent = formatCurrency(ingresoMes);
    document.getElementById('total-esperado').textContent = formatCurrency(totalEsperado);
    document.getElementById('total-pendiente').textContent = formatCurrency(pendiente);
}

// Show payment history
function showHistory(type, id) {
    const rental = data[type].find(r => r.id === id);
    const modal = document.getElementById('modal-historial');
    const content = document.getElementById('historial-content');

    if (!rental) return;

    const sortedMonths = Object.keys(rental.pagos).sort().reverse();

    // Count paid and pending
    let totalPagados = 0;
    let totalPendientes = 0;
    sortedMonths.forEach(monthKey => {
        if (rental.pagos[monthKey].pagado) {
            totalPagados++;
        } else {
            totalPendientes++;
        }
    });

    let html = `<h3 style="margin-bottom: 1rem;">${rental.inquilino}</h3>`;

    // Add summary
    if (sortedMonths.length > 0) {
        html += `
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${totalPagados}</div>
            <div style="color: var(--text-secondary); font-size: 0.875rem;">Pagados</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: var(--warning);">${totalPendientes}</div>
            <div style="color: var(--text-secondary); font-size: 0.875rem;">Pendientes</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: var(--text-primary);">${sortedMonths.length}</div>
            <div style="color: var(--text-secondary); font-size: 0.875rem;">Total Meses</div>
          </div>
        </div>
        `;
    }

    if (sortedMonths.length === 0) {
        html += '<p style="color: var(--text-secondary);">No hay historial de pagos registrado.</p>';
    } else {
        html += sortedMonths.map(monthKey => {
            const payment = rental.pagos[monthKey];
            return `
        <div class="history-item">
          <div class="history-item-header">
            <div class="history-month">${getMonthName(monthKey)}</div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="history-status ${payment.pagado ? 'paid' : 'pending'}">
                ${payment.pagado ? '✓ Pagado' : '⏱ Pendiente'}
              </div>
              <button onclick="deletePaymentRecord('${type}', ${id}, '${monthKey}')" 
                      class="btn-delete-history"
                      title="Eliminar registro">
                ✕
              </button>
            </div>
          </div>
          ${payment.pagado ? `
            <div class="history-details">
              Fecha de pago: ${formatDate(payment.fecha)}<br>
              Monto: ${formatCurrency(rental.renta)}
            </div>
          ` : ''}
        </div>
      `;
        }).join('');
    }

    content.innerHTML = html;
    modal.classList.add('active');
}

// Delete payment record from history
function deletePaymentRecord(type, id, monthKey) {
    const rental = data[type].find(r => r.id === id);

    if (rental && rental.pagos[monthKey]) {
        delete rental.pagos[monthKey];
        saveData();
        showHistory(type, id); // Refresh the modal
        renderRentals(); // Refresh the main view
    }
}

// Services functions
function renderServices() {
    const container = document.getElementById('servicios-list');

    // Get ALL services
    let allServices = [];

    Object.keys(data.servicios).forEach(tipo => {
        data.servicios[tipo].forEach((servicio, index) => {
            if (servicio.fecha) {
                allServices.push({
                    ...servicio,
                    tipo,
                    index
                });
            }
        });
    });

    if (allServices.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No hay registros.</p>';
        updateServicesSummary();
        return;
    }

    // Group services by month
    const servicesByMonth = {};
    allServices.forEach(servicio => {
        const [year, month] = servicio.fecha.split('-');
        const monthKey = `${year}-${month}`;
        if (!servicesByMonth[monthKey]) {
            servicesByMonth[monthKey] = {
                agua: [],
                luz: [],
                internet: [],
                otros: []
            };
        }
        servicesByMonth[monthKey][servicio.tipo].push(servicio);
    });

    // Sort months descending (most recent first)
    const sortedMonths = Object.keys(servicesByMonth).sort().reverse();

    const icons = {
        agua: '💧',
        luz: '⚡',
        internet: '🌐',
        otros: '📝'
    };

    const typeNames = {
        agua: 'Agua',
        luz: 'Luz',
        internet: 'Internet',
        otros: 'Otros'
    };

    // Build HTML grouped by month
    let html = '';

    sortedMonths.forEach(monthKey => {
        const monthName = getMonthName(monthKey);
        const monthServices = servicesByMonth[monthKey];

        // Calculate month total
        let monthTotal = 0;
        Object.keys(monthServices).forEach(tipo => {
            monthServices[tipo].forEach(s => monthTotal += s.costo);
        });

        html += `
        <div class="month-group">
          <div class="month-header">
            <h3>📅 ${monthName}</h3>
            <div class="month-total">${formatCurrency(monthTotal)}</div>
          </div>
          <div class="services-by-type">
        `;

        // Show each service type
        ['agua', 'luz', 'internet', 'otros'].forEach(tipo => {
            const services = monthServices[tipo];
            if (services.length > 0) {
                html += `
                <div class="service-type-section">
                  <div class="service-type-header">
                    ${icons[tipo]} <strong>${typeNames[tipo]}</strong>
                  </div>
                `;

                services.forEach(servicio => {
                    html += `
                    <div class="service-item-compact">
                      <div class="service-item-details">
                        <div>${formatDate(servicio.fecha)}</div>
                        ${servicio.cantidad ? `<div class="service-quantity">${servicio.cantidad.toLocaleString()} L</div>` : ''}
                        ${servicio.notas ? `<div class="service-notes">${servicio.notas}</div>` : ''}
                      </div>
                      <div class="service-item-actions">
                        <div class="service-cost">${formatCurrency(servicio.costo)}</div>
                        <button onclick="deleteService('${servicio.tipo}', ${servicio.index})" 
                                class="btn-delete-history"
                                title="Eliminar registro">
                          ✕
                        </button>
                      </div>
                    </div>
                    `;
                });

                html += `</div>`;
            }
        });

        html += `
          </div>
        </div>
        `;
    });

    container.innerHTML = html;
    updateServicesSummary();
}

// Delete service record
function deleteService(tipo, index) {
    if (data.servicios[tipo] && data.servicios[tipo][index]) {
        data.servicios[tipo].splice(index, 1);
        saveData();
        renderServices();
    }
}

function updateServicesSummary() {
    let totalAgua = 0;
    let totalServicios = 0;

    // Calculate water total (ALL records)
    data.servicios.agua.forEach(servicio => {
        if (servicio.fecha) {
            totalAgua += servicio.costo;
        }
    });

    // Calculate other services total (ALL records)
    ['luz', 'internet', 'otros'].forEach(tipo => {
        data.servicios[tipo].forEach(servicio => {
            if (servicio.fecha) {
                totalServicios += servicio.costo;
            }
        });
    });

    const totalGastos = totalAgua + totalServicios;

    document.getElementById('total-agua').textContent = formatCurrency(totalAgua);
    document.getElementById('total-servicios').textContent = formatCurrency(totalServicios);
    document.getElementById('total-gastos').textContent = formatCurrency(totalGastos);
}

// Tab navigation
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });
}

// Modal controls
function initModal() {
    const modal = document.getElementById('modal-historial');
    const closeBtn = modal.querySelector('.close-modal');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Form handlers
function initForms() {
    // Water form
    const formAgua = document.getElementById('form-agua');
    formAgua.addEventListener('submit', (e) => {
        e.preventDefault();

        const fecha = document.getElementById('agua-fecha').value;
        const cantidad = parseFloat(document.getElementById('agua-cantidad').value);
        const costo = parseFloat(document.getElementById('agua-costo').value);

        data.servicios.agua.push({ fecha, cantidad, costo });
        saveData();
        renderServices();
        formAgua.reset();

        // Set today's date as default
        document.getElementById('agua-fecha').valueAsDate = new Date();
    });

    // Service form
    const formServicio = document.getElementById('form-servicio');
    formServicio.addEventListener('submit', (e) => {
        e.preventDefault();

        const tipo = document.getElementById('servicio-tipo').value;
        const fecha = document.getElementById('servicio-fecha').value;
        const costo = parseFloat(document.getElementById('servicio-costo').value);
        const notas = document.getElementById('servicio-notas').value;

        data.servicios[tipo].push({ fecha, costo, notas });
        saveData();
        renderServices();
        formServicio.reset();

        // Set today's date as default
        document.getElementById('servicio-fecha').valueAsDate = new Date();
    });

    // Set today's date as default
    document.getElementById('agua-fecha').valueAsDate = new Date();
    document.getElementById('servicio-fecha').valueAsDate = new Date();
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize data from Supabase (falls back to localStorage if needed)
    await initializeDataWithSupabase();

    // Initialize UI
    initTabs();
    initModal();
    initForms();

    // Render everything
    renderRentals();
    renderServices();
});
