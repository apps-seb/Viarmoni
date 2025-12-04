import { getFirestore, collection, getDocs, doc, setDoc, query, where, orderBy, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class BookingWizard {
    constructor(db) {
        this.db = db;
        this.currentStep = 1;
        this.bookingData = {
            city: null,
            service: null, // {id, name, price, deposit, duration}
            staff: null,   // {id, name}
            date: null,
            slot: null,    // {id, time, timestamp}
            client: {}
        };

        this.init();
    }

    async init() {
        this.renderWizardStructure();
        await this.loadCities(); // Step 1
        this.attachEventListeners();
    }

    renderWizardStructure() {
        const container = document.getElementById('booking-section');
        container.innerHTML = `
            <button onclick="closeBooking()" style="position:absolute;top:20px;left:20px;z-index:20;padding:10px;border-radius:50%;border:none;background:#eee;cursor:pointer"><i class="fas fa-arrow-left"></i></button>
            <link rel="stylesheet" href="css/booking.css">
            <div id="booking-wizard">
                <div class="wizard-header">
                    <h2>Agenda tu Cita</h2>
                    <div class="progress-bar">
                        <div class="progress-line"></div>
                        <div class="progress-step active">1</div>
                        <div class="progress-step">2</div>
                        <div class="progress-step">3</div>
                        <div class="progress-step">4</div>
                        <div class="progress-step">5</div>
                    </div>
                </div>

                <!-- STEP 1: CITY -->
                <div class="wizard-step active" id="step-1">
                    <h3>Selecciona tu Ciudad</h3>
                    <div class="options-grid" id="city-options"><div class="loader"></div></div>
                </div>

                <!-- STEP 2: SERVICE -->
                <div class="wizard-step" id="step-2">
                    <h3>Selecciona el Procedimiento</h3>
                    <div class="options-grid" id="service-options"></div>
                </div>

                <!-- STEP 3: DATE & TIME -->
                <div class="wizard-step" id="step-3">
                    <h3>Selecciona Fecha y Hora</h3>
                    <div class="form-group">
                        <label>Especialista (Opcional)</label>
                        <select id="staff-select"><option value="any">Cualquiera disponible</option></select>
                    </div>
                    <div class="form-group">
                        <label>Fecha</label>
                        <input type="date" id="date-picker">
                    </div>
                    <div id="slots-container" class="slots-container">
                        <p style="color:#777; width:100%;">Selecciona una fecha para ver horarios.</p>
                    </div>
                </div>

                <!-- STEP 4: CLIENT DATA -->
                <div class="wizard-step" id="step-4">
                    <h3>Tus Datos</h3>
                    <div class="form-group"><label>Nombre Completo</label><input type="text" id="client-name"></div>
                    <div class="form-group"><label>Teléfono (WhatsApp)</label><input type="tel" id="client-phone"></div>
                    <div class="form-group"><label>Correo Electrónico</label><input type="email" id="client-email"></div>
                </div>

                <!-- STEP 5: SUMMARY & CONFIRM -->
                <div class="wizard-step" id="step-5">
                    <h3>Resumen de Reserva</h3>
                    <div id="booking-summary"></div>
                    <div style="margin-top:20px;">
                        <button class="btn btn-primary" style="width:100%; margin-bottom:10px;" id="btn-deposit">Pagar Depósito</button>
                        <a href="#" class="btn-whatsapp" id="btn-whatsapp" target="_blank"><i class="fab fa-whatsapp"></i> Confirmar por WhatsApp</a>
                    </div>
                </div>

                <div class="wizard-footer">
                    <button class="btn-prev" id="prev-btn" style="visibility:hidden">Atrás</button>
                    <button class="btn-next" id="next-btn" disabled>Siguiente</button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        document.getElementById('next-btn').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-btn').addEventListener('click', () => this.prevStep());

        // Step 3 Logic
        document.getElementById('date-picker').addEventListener('change', (e) => this.loadSlots(e.target.value));
        document.getElementById('staff-select').addEventListener('change', () => {
            const date = document.getElementById('date-picker').value;
            if(date) this.loadSlots(date);
        });

        // Payment Mock
        document.getElementById('btn-deposit').addEventListener('click', () => {
            alert(`Para asegurar tu cita, por favor realiza una transferencia a Bancolombia Ahorros: 123-456-7890 a nombre de Viarmoni SAS y envía el comprobante por WhatsApp.`);
        });
    }

    async nextStep() {
        if(!this.validateStep()) return;

        if(this.currentStep === 1) await this.loadServices();
        if(this.currentStep === 2) {
            await this.loadStaff();
            // Set min date to today
            document.getElementById('date-picker').min = new Date().toISOString().split('T')[0];
        }
        if(this.currentStep === 4) await this.finalizeBooking();

        this.changeStep(this.currentStep + 1);
    }

    prevStep() {
        this.changeStep(this.currentStep - 1);
    }

    changeStep(step) {
        // UI Updates
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        document.getElementById(`step-${step}`).classList.add('active');

        document.querySelectorAll('.progress-step').forEach((el, idx) => {
            if(idx + 1 <= step) el.classList.add('active');
            else el.classList.remove('active');
        });

        this.currentStep = step;

        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';

        if(step === 5) {
            nextBtn.style.display = 'none'; // Replaced by confirm buttons
            this.renderSummary();
        } else {
            nextBtn.style.display = 'block';
            nextBtn.innerText = 'Siguiente';
            nextBtn.disabled = true; // Disable until selection made
            // Re-enable if data already exists for this step
            if(this.currentStep === 1 && this.bookingData.city) nextBtn.disabled = false;
            if(this.currentStep === 2 && this.bookingData.service) nextBtn.disabled = false;
            if(this.currentStep === 3 && this.bookingData.slot) nextBtn.disabled = false;
            if(this.currentStep === 4) nextBtn.disabled = false; // Form validation handled in click
        }
    }

    validateStep() {
        const nextBtn = document.getElementById('next-btn');
        if(this.currentStep === 1 && !this.bookingData.city) { alert("Selecciona una ciudad"); return false; }
        if(this.currentStep === 2 && !this.bookingData.service) { alert("Selecciona un procedimiento"); return false; }
        if(this.currentStep === 3 && !this.bookingData.slot) { alert("Selecciona un horario"); return false; }
        if(this.currentStep === 4) {
            const name = document.getElementById('client-name').value;
            const phone = document.getElementById('client-phone').value;
            const email = document.getElementById('client-email').value;
            if(!name || !phone) { alert("Completa los campos obligatorios"); return false; }
            this.bookingData.client = { name, phone, email };
        }
        return true;
    }

    // --- DATA LOADERS ---

    async loadCities() {
        const container = document.getElementById('city-options');
        container.innerHTML = '<div class="loader"></div>';
        try {
            const snap = await getDocs(collection(this.db, 'locations'));
            container.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div');
                card.className = 'option-card';
                card.innerHTML = `<h4>${d.name}</h4><p>${d.address}</p>`;
                card.onclick = () => {
                    this.bookingData.city = d; // Store full object
                    this.bookingData.city.id = doc.id;
                    document.querySelectorAll('#city-options .option-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    document.getElementById('next-btn').disabled = false;
                };
                container.appendChild(card);
            });
        } catch(e) { console.error(e); }
    }

    async loadServices() {
        const container = document.getElementById('service-options');
        container.innerHTML = '<div class="loader"></div>';
        try {
            const snap = await getDocs(collection(this.db, 'services'));
            container.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div');
                card.className = 'option-card';
                card.innerHTML = `<h4>${d.name}</h4><p>$${d.price} | Depósito: $${d.deposit}</p>`;
                card.onclick = () => {
                    this.bookingData.service = d;
                    this.bookingData.service.id = doc.id;
                    document.querySelectorAll('#service-options .option-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    document.getElementById('next-btn').disabled = false;
                };
                container.appendChild(card);
            });
        } catch(e) { console.error(e); }
    }

    async loadStaff() {
        const select = document.getElementById('staff-select');
        select.innerHTML = '<option value="any">Cualquiera disponible</option>';
        const snap = await getDocs(collection(this.db, 'staff'));
        snap.forEach(doc => {
            const op = document.createElement('option');
            op.value = doc.data().name;
            op.innerText = doc.data().name + ` (${doc.data().role})`;
            select.appendChild(op);
        });
    }

    async loadSlots(date) {
        const container = document.getElementById('slots-container');
        container.innerHTML = '<div class="loader">Loading...</div>';
        const staffFilter = document.getElementById('staff-select').value;

        let q = query(
            collection(this.db, 'slots'),
            where('date', '==', date),
            where('city', '==', this.bookingData.city.name), // Assumes name match
            where('status', '==', 'free'),
            orderBy('time')
        );

        // Client-side filtering for staff if needed, or query improvement
        // Keeping it simple: Query all for date/city/free, then filter in JS if specific staff selected

        try {
            const snap = await getDocs(q);
            container.innerHTML = '';
            if(snap.empty) { container.innerHTML = '<p>No hay disponibilidad para esta fecha.</p>'; return; }

            snap.forEach(d => {
                const data = d.data();
                if(staffFilter !== 'any' && data.staff !== staffFilter) return;

                const slot = document.createElement('div');
                slot.className = 'time-slot';
                slot.innerText = data.time;
                slot.onclick = () => {
                    this.bookingData.slot = data;
                    this.bookingData.slot.id = d.id;
                    this.bookingData.staff = { name: data.staff }; // Capture staff from slot

                    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');
                    document.getElementById('next-btn').disabled = false;
                };
                container.appendChild(slot);
            });
        } catch(e) { console.error(e); container.innerHTML = 'Error cargando horarios.'; }
    }

    renderSummary() {
        const summary = document.getElementById('booking-summary');
        const { city, service, date, slot, client } = this.bookingData;

        summary.innerHTML = `
            <div class="summary-item"><span>Ciudad:</span> <strong>${city.name}</strong></div>
            <div class="summary-item"><span>Servicio:</span> <strong>${service.name}</strong></div>
            <div class="summary-item"><span>Fecha:</span> <strong>${date} a las ${slot.time}</strong></div>
            <div class="summary-item"><span>Especialista:</span> <strong>${slot.staff}</strong></div>
            <div class="summary-item"><span>Cliente:</span> <strong>${client.name}</strong></div>
            <div class="summary-total">Total a Pagar: $${service.price}<br><span style="font-size:0.9rem;color:#777">Depósito Requerido: $${service.deposit}</span></div>
        `;
    }

    async finalizeBooking() {
        // Here we reserve the slot and create the appointment
        try {
            // 1. Mark slot as booked
            await updateDoc(doc(this.db, 'slots', this.bookingData.slot.id), {
                status: 'booked'
            });

            // 2. Create appointment record
            await addDoc(collection(this.db, 'appointments'), {
                city: this.bookingData.city.name,
                serviceName: this.bookingData.service.name,
                servicePrice: this.bookingData.service.price,
                serviceDeposit: this.bookingData.service.deposit,
                date: this.bookingData.date, // Wait, this might be missing in bookingData root
                date: this.bookingData.slot.date,
                time: this.bookingData.slot.time,
                staffName: this.bookingData.slot.staff,
                clientName: this.bookingData.client.name,
                clientPhone: this.bookingData.client.phone,
                clientEmail: this.bookingData.client.email,
                status: 'pending_payment',
                timestamp: Date.now()
            });

            // 3. Generate WhatsApp Link
            const text = `Hola, quiero confirmar mi reserva en Viarmoni:%0A%0A` +
                         `📍 Ciudad: ${this.bookingData.city.name}%0A` +
                         `💆 Servicio: ${this.bookingData.service.name}%0A` +
                         `📅 Fecha: ${this.bookingData.slot.date} - ${this.bookingData.slot.time}%0A` +
                         `👤 Nombre: ${this.bookingData.client.name}%0A` +
                         `💰 Depósito Pendiente: $${this.bookingData.service.deposit}`;

            document.getElementById('btn-whatsapp').href = `https://wa.me/573001234567?text=${text}`; // Replace with actual number

        } catch(e) {
            console.error("Error finalizing booking:", e);
            alert("Hubo un error guardando tu reserva. Por favor intenta de nuevo.");
        }
    }
}
