// ==========================================
// SUPABASE SYNC FUNCTIONS
// ==========================================

// Initialize Supabase and load data
async function initializeDataWithSupabase() {
    // First, initialize Supabase client
    const supabaseInit = initSupabase();

    if (!supabaseInit) {
        console.warn('Supabase not available, using localStorage only');
        initializeDataLocal();
        return;
    }

    try {
        // Try to load from Supabase
        const loaded = await loadFromSupabase();

        if (loaded) {
            console.log('✅ Data loaded from Supabase');
        } else {
            // No data in Supabase, check localStorage
            const localData = localStorage.getItem('rentasData');
            if (localData) {
                console.log('📦 Found local data, will sync to Supabase');
                data = JSON.parse(localData);
                ensureDataStructure();
                // Sync to Supabase
                await saveToSupabase();
            } else {
                // No data anywhere, create default
                initializeDefaultData();
                await saveToSupabase();
            }
        }
    } catch (error) {
        console.error('Error loading from Supabase:', error);
        initializeDataLocal();
    }
}

// Load data from Supabase
async function loadFromSupabase() {
    try {
        // Load rentals
        const { data: rentalsData, error: rentalsError } = await supabaseClient
            .from('rentals')
            .select('*');

        if (rentalsError) throw rentalsError;

        // Load payments
        const { data: paymentsData, error: paymentsError } = await supabaseClient
            .from('payments')
            .select('*');

        if (paymentsError) throw paymentsError;

        // Load services
        const { data: servicesData, error: servicesError } = await supabaseClient
            .from('services')
            .select('*');

        if (servicesError) throw servicesError;

        // Check if we have any data
        if (!rentalsData || rentalsData.length === 0) {
            return false;
        }

        // Transform Supabase data to app format
        data.cuartos = [];
        data.departamentos = [];
        data.servicios = { agua: [], luz: [], internet: [], otros: [] };

        // Process rentals
        rentalsData.forEach(rental => {
            const rentalObj = {
                id: rental.rental_id,
                inquilino: rental.inquilino,
                renta: parseFloat(rental.renta),
                ocupado: rental.ocupado,
                pagos: {}
            };

            if (rental.rental_type === 'cuartos') {
                data.cuartos.push(rentalObj);
            } else {
                data.departamentos.push(rentalObj);
            }
        });

        // Process payments
        paymentsData.forEach(payment => {
            const rentalArray = payment.rental_type === 'cuartos' ? data.cuartos : data.departamentos;
            const rental = rentalArray.find(r => r.id === payment.rental_id);

            if (rental) {
                rental.pagos[payment.month_key] = {
                    pagado: payment.pagado,
                    fecha: payment.fecha,
                    notas: ''
                };
            }
        });

        // Process services
        servicesData.forEach(service => {
            data.servicios[service.tipo].push({
                fecha: service.fecha,
                costo: parseFloat(service.costo),
                cantidad: service.cantidad,
                notas: service.notas
            });
        });

        // Sort arrays
        data.cuartos.sort((a, b) => a.id - b.id);
        data.departamentos.sort((a, b) => a.id - b.id);

        // Save to localStorage as backup
        localStorage.setItem('rentasData', JSON.stringify(data));

        return true;
    } catch (error) {
        console.error('Error loading from Supabase:', error);
        return false;
    }
}

// Save data to Supabase
async function saveToSupabase() {
    if (!supabaseClient) {
        console.warn('Supabase client not initialized');
        return false;
    }

    try {
        // Save rentals (cuartos y departamentos)
        for (const type of ['cuartos', 'departamentos']) {
            for (const rental of data[type]) {
                const { error } = await supabaseClient
                    .from('rentals')
                    .upsert({
                        user_id: null,
                        rental_type: type,
                        rental_id: rental.id,
                        inquilino: rental.inquilino,
                        renta: rental.renta,
                        ocupado: rental.ocupado
                    }, {
                        onConflict: 'user_id,rental_type,rental_id'
                    });

                if (error) console.error('Error saving rental:', error);

                // Save payments for this rental
                for (const [monthKey, payment] of Object.entries(rental.pagos)) {
                    const { error: payError } = await supabaseClient
                        .from('payments')
                        .upsert({
                            user_id: null,
                            rental_type: type,
                            rental_id: rental.id,
                            month_key: monthKey,
                            pagado: payment.pagado,
                            fecha: payment.fecha
                        }, {
                            onConflict: 'user_id,rental_type,rental_id,month_key'
                        });

                    if (payError) console.error('Error saving payment:', payError);
                }
            }
        }

        // Delete all existing services and re-insert
        await supabaseClient.from('services').delete().is('user_id', null);

        // Save services
        const allServices = [];
        for (const [tipo, services] of Object.entries(data.servicios)) {
            services.forEach((service, index) => {
                allServices.push({
                    user_id: null,
                    tipo: tipo,
                    fecha: service.fecha,
                    costo: service.costo,
                    cantidad: service.cantidad || null,
                    notas: service.notas || null
                });
            });
        }

        if (allServices.length > 0) {
            const { error } = await supabaseClient
                .from('services')
                .insert(allServices);

            if (error) console.error('Error saving services:', error);
        }

        console.log('✅ Data synced to Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        return false;
    }
}

// Helper: Ensure data structure is complete
function ensureDataStructure() {
    // Add ocupado field to existing data if it doesn't exist
    data.cuartos = data.cuartos || [];
    data.departamentos = data.departamentos || [];

    data.cuartos.forEach(c => {
        if (c.ocupado === undefined) c.ocupado = true;
    });
    data.departamentos.forEach(d => {
        if (d.ocupado === undefined) d.ocupado = true;
    });

    if (!data.servicios) {
        data.servicios = { agua: [], luz: [], internet: [], otros: [] };
    }
}

// Helper: Initialize default data
function initializeDefaultData() {
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
}

// Helper: Initialize from localStorage only
function initializeDataLocal() {
    const savedData = localStorage.getItem('rentasData');

    if (savedData) {
        data = JSON.parse(savedData);
        ensureDataStructure();
    } else {
        initializeDefaultData();
        saveDataLocal();
    }
}

// Save to localStorage only
function saveDataLocal() {
    localStorage.setItem('rentasData', JSON.stringify(data));
}

// Combined save function
async function saveData() {
    // Save to localStorage immediately
    saveDataLocal();

    // Save to Supabase asynchronously
    if (supabaseClient) {
        await saveToSupabase();
    }
}
