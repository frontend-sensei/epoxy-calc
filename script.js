function saveState() {
    const state = {
        shape: document.querySelector('.shape-card.selected').dataset.shape,
        rectLength: document.getElementById('rectLength').value,
        rectWidth: document.getElementById('rectWidth').value,
        rectHeight: document.getElementById('rectHeight').value,
        circleDiameter: document.getElementById('circleDiameter').value,
        circleHeight: document.getElementById('circleHeight').value,
        partA: document.getElementById('partA').value,
        partB: document.getElementById('partB').value
    };
    localStorage.setItem('epoxyCalcState', JSON.stringify(state));
}

function loadState() {
    const state = JSON.parse(localStorage.getItem('epoxyCalcState') || '{}');
    if (state.shape) {
        document.querySelectorAll('.shape-card').forEach(card => {
            if (card.dataset.shape === state.shape) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        updateShapeFields();
    }
    if (state.rectLength) document.getElementById('rectLength').value = state.rectLength;
    if (state.rectWidth) document.getElementById('rectWidth').value = state.rectWidth;
    if (state.rectHeight) document.getElementById('rectHeight').value = state.rectHeight;
    if (state.circleDiameter) document.getElementById('circleDiameter').value = state.circleDiameter;
    if (state.circleHeight) document.getElementById('circleHeight').value = state.circleHeight;
    if (state.partA) document.getElementById('partA').value = state.partA;
    if (state.partB) document.getElementById('partB').value = state.partB;
}

function isValidState() {
    const isRect = document.querySelector('.shape-card.selected').dataset.shape === 'rect';
    if (isRect) {
        return (
            parseFloat(document.getElementById('rectLength').value) > 0 &&
            parseFloat(document.getElementById('rectWidth').value) > 0 &&
            parseFloat(document.getElementById('rectHeight').value) > 0
        );
    } else {
        return (
            parseFloat(document.getElementById('circleDiameter').value) > 0 &&
            parseFloat(document.getElementById('circleHeight').value) > 0
        );
    }
}

function calculate() {
    // Определяем выбранную форму
    const isRect = document.querySelector('.shape-card.selected').dataset.shape === 'rect';
    let volumeCm3 = 0;
    if (isRect) {
        const length = parseFloat(document.getElementById('rectLength').value) || 0;
        const width = parseFloat(document.getElementById('rectWidth').value) || 0;
        const height = parseFloat(document.getElementById('rectHeight').value) || 0;
        volumeCm3 = length * width * height;
    } else {
        const diameter = parseFloat(document.getElementById('circleDiameter').value) || 0;
        const height = parseFloat(document.getElementById('circleHeight').value) || 0;
        volumeCm3 = Math.PI * Math.pow(diameter / 2, 2) * height;
    }
    const density = 1.1;
    const totalMass = volumeCm3 * density;
    const totalMassKg = totalMass / 1000;
    const partA = parseFloat(document.getElementById('partA').value) || 0;
    const partB = parseFloat(document.getElementById('partB').value) || 0;
    const sum = partA + partB;
    let amountA = 0, amountB = 0;
    if (sum > 0 && totalMass > 0) {
        amountA = totalMass * partA / sum;
        amountB = totalMass * partB / sum;
    }
    document.getElementById('totalMass').textContent = totalMass > 0 ? totalMass.toFixed(2) : '0';
    document.getElementById('totalMassKg').textContent = totalMass > 0 ? totalMassKg.toFixed(2) : '0';
    document.getElementById('amountA').textContent = amountA > 0 ? amountA.toFixed(2) : '0';
    document.getElementById('amountB').textContent = amountB > 0 ? amountB.toFixed(2) : '0';
    saveState();
}

function updateShapeFields() {
    const isRect = document.querySelector('.shape-card.selected').dataset.shape === 'rect';
    document.getElementById('rectFields').style.display = isRect ? '' : 'none';
    document.getElementById('circleFields').style.display = isRect ? 'none' : '';
    calculate();
}

if (document.querySelectorAll('.shape-card').length) {
    document.querySelectorAll('.shape-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.shape-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            updateShapeFields();
        });
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                this.click();
            }
        });
    });
}

['formInputs'].forEach(formId => {
    const form = document.getElementById(formId);
    if (form) {
        form.addEventListener('input', function() {
            calculate();
        });
    }
});

// При загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    loadState();
    if (isValidState()) {
        calculate();
    }
});
