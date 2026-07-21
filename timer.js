// Récupération des éléments du DOM
const timerInput = document.getElementById('timer-input');
const durationSelect = document.getElementById('duration-select');
const startButton = document.getElementById('start-button');
const display = document.getElementById('display');

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
    const timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            display.textContent += "Temps écoulé !";
            return;
        }

        // Affichage du temps restant au format mm:ss
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        display.textContent += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}\n`;

        timeLeft--;
    }, 1000);
}

// Ajout de l'événement au bouton "Lancer"
startButton.addEventListener('click', startTimer);