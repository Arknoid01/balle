// Récupération des éléments du DOM
const timerInput = document.getElementById('timer-input');
const durationSelect = document.getElementById('duration-select');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pausebtn');
const display = document.getElementById('display');

// Variable pour gérer la pause
let isPaused = false;
let timerInterval = null;

// Fonction pour démarrer le minuteur
function startTimer() {
    const inputText = timerInput.value || 'Programme sans nom';
    const selectedDuration = parseInt(durationSelect.value);
    
    // Effacer l'affichage précédent
    display.textContent = '';

    // Calcul du temps restant
    let timeLeft = selectedDuration;

    // Afficher le nom du programme
    display.textContent = `Programme : ${inputText}\n`;

    // Mise à jour de l'affichage toutes les secondes
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            display.textContent += "Temps écoulé !";
            pauseButton.disabled = true;
            return;
        }

        // Affichage du temps restant au format mm:ss
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        display.textContent = `Programme : ${inputText}\n${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}\n`;

        timeLeft--;
    }, 1000);
    
    // Activer le bouton pause et désactiver le bouton start
    pauseButton.disabled = false;
    startButton.disabled = true;
}

// Gestion du bouton Pause/Reprendre
pauseButton.addEventListener('click', function() {
    if (!isPaused) {
        // Pause
        clearInterval(timerInterval);
        isPaused = true;
        pauseButton.textContent = "Reprendre";
    } else {
        // Reprendre
        startTimer();
        pauseButton.textContent = "Pause";
    }
});

// Ajout de l'événement au bouton "Lancer"
startButton.addEventListener('click', startTimer);