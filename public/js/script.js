console.log('Tourizio Loaded');

//Mobile menu toggle
const navbarToggler = document.querySelector('.navbar-toggler');
const navbarCollapse = document.querySelector('.navbar-collapse');

if (navbarToggler) {
    navbarToggler.addEventListener('click', () => {
        navbarCollapse.classList.toggle('show');
    });
}

//Handle Contact Form
// ---------------------------------------------------------
// STRICT INPUT VALIDATION UTILITIES
// ---------------------------------------------------------
function restrictToDigits(el) {
    if (!el) return;
    el.addEventListener('keydown', (e) => {
        if (['e', 'E', '.', '+', '-', ' '].includes(e.key)) e.preventDefault();
    });
    el.addEventListener('input', () => {
        el.value = el.value.replace(/[^0-9]/g, '');
    });
}

function blockInvalidNumberKeys(el) {
    if (!el) return;
    el.addEventListener('keydown', (e) => {
        if (['e', 'E', '.', '+', '-'].includes(e.key)) e.preventDefault();
    });
}

function restrictToLetters(el) {
    if (!el) return;
    el.addEventListener('input', () => {
        el.value = el.value.replace(/[^a-zA-Z\s]/g, '');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Numeric Fields (Block e, ., +, -)
    restrictToDigits(document.getElementById('guestsCount')); // Booking
    restrictToDigits(document.getElementById('ageInput'));    // Profile
    restrictToDigits(document.getElementById('otpInput'));    // OTP
    restrictToDigits(document.getElementById('cardCvv'));     // Payment

    // 2. Formatted Number Fields (Block keys only, let custom logic handle formatting)
    blockInvalidNumberKeys(document.getElementById('cardNumber'));
    blockInvalidNumberKeys(document.getElementById('cardExpiry'));

    // 3. Name Fields (Letters Only)
    // Booking Guest Names are dynamic, handled in their generation loop
    // Auth Form Names + Contact Form Name
    document.querySelectorAll('input[name="firstName"], input[name="lastName"], input[name="name"]').forEach(el => {
        restrictToLetters(el);
    });
});


// ---------------------------------------------------------
// EXISTING CONTACT LOGIC
// ---------------------------------------------------------
const contactForm = document.querySelector('form[action="/contact"]');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        //collect data
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());

        //send to server
        await fetch('/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        //show custom popup
        const successModalElement = document.getElementById('successModal');
        if (successModalElement) {
            const successMessage = document.getElementById('successMessage');
            successMessage.textContent = 'Message Sent Successfully!';
            const modal = new bootstrap.Modal(successModalElement);
            modal.show();
        }
        contactForm.reset();
    });
}

// ---------------------------------------------------------
// BOOKING LOGIC
// ---------------------------------------------------------

const destSelect = document.getElementById('destinationSelect');
const checkin = document.getElementById('checkinDate');
const checkout = document.getElementById('checkoutDate');
const guests = document.getElementById('guestsCount');
const totalDisplay = document.getElementById('totalCost');
const guestDetailsContainer = document.getElementById('guestDetailsContainer');

// Set Date Constraints
const today = new Date().toISOString().split('T')[0];
if (checkin) checkin.setAttribute('min', today);

checkin.addEventListener('change', () => {
    if (checkin.value) {
        checkout.removeAttribute('disabled');
        checkout.setAttribute('min', checkin.value);
        if (checkout.value && checkout.value < checkin.value) {
            checkout.value = checkin.value;
        }
    }
});

function generateGuestFields() {
    if (!guestDetailsContainer) return;
    guestDetailsContainer.innerHTML = '';
    const count = parseInt(guests.value) || 1;

    for (let i = 1; i <= count; i++) {
        const row = document.createElement('div');
        row.className = 'row g-2 mb-2 p-2 border rounded bg-light';
        row.innerHTML = `
            <h6 class="mb-2 text-primary-custom fw-bold">Guest ${i}</h6>
            <div class="col-md-6">
                <label class="form-label small text-muted">First Name</label>
                <input type="text" class="form-control form-control-sm guest-first-name" placeholder="First Name" required>
            </div>
            <div class="col-md-6">
                <label class="form-label small text-muted">Last Name</label>
                <input type="text" class="form-control form-control-sm guest-last-name" placeholder="Last Name" required>
            </div>
            <div class="col-md-6">
                <label class="form-label small text-muted">Age</label>
                <input type="number" class="form-control form-control-sm guest-age" placeholder="Age" min="1" max="150" required>
                <div class="invalid-feedback">Age must be 1-150.</div>
            </div>
             <div class="col-md-6">
                <label class="form-label small text-muted">Gender</label>
                <select class="form-select form-select-sm guest-gender">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>
        `;
        guestDetailsContainer.appendChild(row);

        // Apply strict validation to new dynamic fields
        restrictToLetters(row.querySelector('.guest-first-name'));
        restrictToLetters(row.querySelector('.guest-last-name'));
        restrictToDigits(row.querySelector('.guest-age'));
    }
}

//Validation Event Delegation for Guests
if (guestDetailsContainer) {
    guestDetailsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('guest-age')) {
            const val = parseInt(e.target.value);
            const feedback = e.target.nextElementSibling;

            if (val === 0) {
                feedback.textContent = "Age cannot be 0. Enter between 1 and 150.";
                e.target.classList.add('is-invalid');
            } else if (val > 150) {
                feedback.textContent = "Age cannot be more than 150. Enter between 1 and 150.";
                e.target.classList.add('is-invalid');
            } else {
                e.target.classList.remove('is-invalid');
            }
        }
    });
}

// Initial Generation
if (guests) {
    guests.addEventListener('input', () => {
        //Prevent 'e' or non-numbers in main guest count
        guests.value = guests.value.replace(/[^0-9]/g, '');
        if (guests.value === '' || parseInt(guests.value) < 1) guests.value = 1;

        generateGuestFields();
        calculatePrice();
    });
    //Run once on load
    generateGuestFields();
}

function calculatePrice() {
    if (!destSelect || !checkin || !checkout || !guests) return;

    const pricePerNight = parseInt(destSelect.selectedOptions[0].getAttribute('data-price')) || 0;
    const guestCount = parseInt(guests.value) || 1;

    const d1 = new Date(checkin.value);
    const d2 = new Date(checkout.value);

    //Valid Calculation only if dates are picked
    if (checkin.value && checkout.value && d2 > d1) {
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const total = pricePerNight * diffDays * guestCount;
        totalDisplay.value = '₹' + total.toLocaleString('en-IN');
        return { total, diffDays, guestCount, pricePerNight };
    } else {
        totalDisplay.value = '₹0';
        return null;
    }
}

//Auto-Calculate on changes
if (destSelect) {
    [destSelect, checkin, checkout, guests].forEach(el => {
        el.addEventListener('change', calculatePrice);
        el.addEventListener('input', calculatePrice);
    });
}

//Navigation Functions
//Navigation Functions
function validateStep1() {
    // 1. Basic Fields
    if (!destSelect.value) {
        alert("Please select a destination.");
        destSelect.focus();
        return false;
    }
    if (!checkin.value) {
        alert("Please select a check-in date.");
        checkin.focus();
        return false;
    }
    if (!checkout.value) {
        alert("Please select a check-out date.");
        checkout.focus();
        return false;
    }

    // 2. Guest Details Validation
    const fNames = document.querySelectorAll('.guest-first-name');
    const lNames = document.querySelectorAll('.guest-last-name');
    const ages = document.querySelectorAll('.guest-age');
    let isValid = true;

    for (let i = 0; i < fNames.length; i++) {
        if (!fNames[i].value.trim()) {
            alert(`Please enter First Name for Guest ${i + 1}`);
            fNames[i].focus();
            isValid = false;
            break;
        }
        if (!lNames[i].value.trim()) {
            alert(`Please enter Last Name for Guest ${i + 1}`);
            lNames[i].focus();
            isValid = false;
            break;
        }
        if (!ages[i].value || parseInt(ages[i].value) < 1 || parseInt(ages[i].value) > 150) {
            alert(`Please enter a valid Age (1-150) for Guest ${i + 1}`);
            ages[i].focus();
            isValid = false;
            break;
        }
    }
    return isValid;
}

function showReview() {
    // STRICT VALIDATION BEFORE PROCEEDING
    if (!validateStep1()) return;

    const calc = calculatePrice();
    if (!calc || calc.total === 0) {
        alert("Please select valid dates and destination.");
        return;
    }

    document.getElementById('reviewDest').textContent = destSelect.value;
    document.getElementById('reviewDates').textContent = `${checkin.value} to ${checkout.value}`;
    document.getElementById('reviewNights').textContent = calc.diffDays;
    document.getElementById('reviewGuests').textContent = calc.guestCount;
    document.getElementById('reviewTotal').textContent = totalDisplay.value;

    // Show Guest Names in Review
    const guestListDiv = document.getElementById('reviewGuestList');
    const firstNames = document.querySelectorAll('.guest-first-name');
    const lastNames = document.querySelectorAll('.guest-last-name');
    let namesHtml = '<ul class="list-unstyled mb-0">';
    firstNames.forEach((input, index) => {
        namesHtml += `<li><i class="fas fa-user-check text-success small"></i> ${input.value} ${lastNames[index].value}</li>`;
    });
    namesHtml += '</ul>';
    guestListDiv.innerHTML = namesHtml;

    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
}

function editBooking() {
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step1').classList.add('active');
}

//Payment Formatting
const cardNumInput = document.getElementById('cardNumber');
const cardExpInput = document.getElementById('cardExpiry');
const cardCvvInput = document.getElementById('cardCvv');

if (cardNumInput) {
    cardNumInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '').substring(0, 16); //Only numbers, max 16
        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += '-';
            formatted += value[i];
        }
        e.target.value = formatted;
    });
}

if (cardExpInput) {
    cardExpInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '').substring(0, 4);

        //Validate Month
        if (value.length >= 2) {
            const month = parseInt(value.substring(0, 2));
            const feedback = cardExpInput.nextElementSibling;

            if (month === 0) {
                feedback.textContent = "Month cannot be 0. Enter between 1 and 12.";
                cardExpInput.classList.add('is-invalid');
            } else if (month > 12) {
                feedback.textContent = "Month cannot be more than 12. Enter between 1 and 12.";
                cardExpInput.classList.add('is-invalid');
            } else {
                cardExpInput.classList.remove('is-invalid');
            }
            //Add formatting slash
            e.target.value = value.substring(0, 2) + '/' + value.substring(2);
        } else {
            cardExpInput.classList.remove('is-invalid');
            e.target.value = value;
        }
    });
}

if (cardCvvInput) {
    cardCvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3); //Only numbers
    });
}

function showPayment() {
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.add('active');
}

async function submitFinalBooking(e) {
    e.preventDefault();

    // STRICT VALIDATION CHECKS
    const cardNum = document.getElementById('cardNumber');
    const cardExp = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');

    // 1. Validate Card Number (16 digits = 19 chars with hyphens)
    if (cardNum.value.length < 19) {
        alert("Card Number must be 16 digits.");
        cardNum.focus();
        return;
    }

    // 2. Validate Expiry (Format MM/YY -> 5 chars) & Logic
    if (cardExp.value.length < 5) {
        alert("Expiry Date must be in MM/YY format.");
        cardExp.focus();
        return;
    }
    const expParts = cardExp.value.split('/');
    const expMonth = parseInt(expParts[0]);
    if (expMonth === 0 || expMonth > 12) {
        alert("Expiry Month must be between 01 and 12.");
        cardExp.focus();
        return;
    }

    // Check if card is expired
    const currentYear = new Date().getFullYear() % 100; // Last 2 digits
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const expYear = parseInt(expParts[1]);

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        alert("Card has expired.");
        cardExp.focus();
        return;
    }

    // 3. Validate CVV (3 Digits)
    if (cardCvv.value.length < 3) {
        alert("CVV must be 3 digits.");
        cardCvv.focus();
        return;
    }

    // ... Proceed if all valid ...

    //Collect Guest Details
    const guestDetails = [];
    const fNames = document.querySelectorAll('.guest-first-name');
    const lNames = document.querySelectorAll('.guest-last-name');
    const ages = document.querySelectorAll('.guest-age');
    const genders = document.querySelectorAll('.guest-gender');

    fNames.forEach((fn, i) => {
        guestDetails.push({
            firstName: fn.value,
            lastName: lNames[i].value,
            age: ages[i].value,
            gender: genders[i].value
        });
    });

    //Here we would send data to backend...
    const bookingData = {
        destination: destSelect.value,
        checkin: checkin.value,
        checkout: checkout.value,
        guestsCount: guests.value,
        guests: guestDetails,
        total: totalDisplay.value
    };

    //Simulate API call
    const response = await fetch('/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    });

    if (response.ok) {
        //Show Success Modal
        const successModalElement = document.getElementById('successModal');
        if (successModalElement) {
            const successMessage = document.getElementById('successMessage');
            successMessage.textContent = 'Booking Paid & Confirmed!';
            const modal = new bootstrap.Modal(successModalElement);
            modal.show();

            //Redirect after a moment
            setTimeout(() => {
                window.location.href = '/my-bookings'; // Redirect to bookings page to see it
            }, 2000);
        } else {
            alert("Booking Successful!");
            window.location.href = '/my-bookings';
        }
    } else {
        const errorText = await response.text();
        alert("Booking Failed: " + errorText);
    }
}
