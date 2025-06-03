class PomodoroTimer {
    constructor() {
        // Timer state
        this.isRunning = false;
        this.isPaused = false;
        this.isBreak = false;
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.totalTime = 25 * 60;
        this.timerInterval = null;
        this.sessionsCompleted = 0;

        // Settings
        this.focusDuration = 25; // minutes
        this.breakDuration = 5;  // minutes
        this.soundEnabled = true;

        // DOM elements
        this.timeDisplay = document.getElementById('timeDisplay');
        this.sessionType = document.getElementById('sessionType');
        this.sessionCount = document.getElementById('sessionCount');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.overlay = document.getElementById('overlay');
        this.closeBtn = document.getElementById('closeBtn');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.focusDurationInput = document.getElementById('focusDuration');
        this.breakDurationInput = document.getElementById('breakDuration');
        this.soundEnabledInput = document.getElementById('soundEnabled');
        this.progressRing = document.querySelector('.progress-ring-fill');
        this.timerCircle = document.querySelector('.timer-circle');
        this.container = document.querySelector('.container');

        // Initialize
        this.init();
    }

    init() {
        this.loadSettings();
        this.updateDisplay();
        this.updateProgress();
        this.bindEvents();
        this.requestNotificationPermission();
    }

    bindEvents() {
        // Timer controls
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());

        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeBtn.addEventListener('click', () => this.closeSettings());
        this.overlay.addEventListener('click', () => this.closeSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

        // Input validation
        this.focusDurationInput.addEventListener('input', () => this.validateInput(this.focusDurationInput, 1, 60));
        this.breakDurationInput.addEventListener('input', () => this.validateInput(this.breakDurationInput, 1, 30));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSettingsOpen()) {
                e.preventDefault();
                this.toggleTimer();
            }
            if (e.code === 'Escape') {
                this.closeSettings();
            }
        });
    }

    validateInput(input, min, max) {
        let value = parseInt(input.value);
        if (isNaN(value) || value < min) {
            input.value = min;
        } else if (value > max) {
            input.value = max;
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.isPaused = false;
        this.startBtn.textContent = 'Pause';
        this.timerCircle.classList.add('active');

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.updateProgress();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        this.isPaused = true;
        this.startBtn.textContent = 'Resume';
        this.timerCircle.classList.remove('active');
        clearInterval(this.timerInterval);
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.startBtn.textContent = 'Start';
        this.timerCircle.classList.remove('active');
        clearInterval(this.timerInterval);

        // Reset to current session type duration
        if (this.isBreak) {
            this.timeLeft = this.breakDuration * 60;
            this.totalTime = this.breakDuration * 60;
        } else {
            this.timeLeft = this.focusDuration * 60;
            this.totalTime = this.focusDuration * 60;
        }

        this.updateDisplay();
        this.updateProgress();
    }

    completeSession() {
        this.isRunning = false;
        this.startBtn.textContent = 'Start';
        this.timerCircle.classList.remove('active');
        clearInterval(this.timerInterval);

        if (this.isBreak) {
            // Break completed, switch to focus
            this.isBreak = false;
            this.timeLeft = this.focusDuration * 60;
            this.totalTime = this.focusDuration * 60;
            this.container.classList.remove('break-mode');
        } else {
            // Focus session completed, switch to break
            this.sessionsCompleted++;
            this.sessionCount.textContent = this.sessionsCompleted;
            this.isBreak = true;
            this.timeLeft = this.breakDuration * 60;
            this.totalTime = this.breakDuration * 60;
            this.container.classList.add('break-mode');
        }

        this.updateDisplay();
        this.updateProgress();
        this.playNotificationSound();
        this.showNotification();
        this.saveProgress();
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        
        this.timeDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.sessionType.textContent = this.isBreak ? 'Break Time' : 'Focus Time';
        
        // Update document title
        document.title = `${this.timeDisplay.textContent} - ${this.sessionType.textContent} | 🍅 Pomodoro`;
    }

    updateProgress() {
        const progress = (this.totalTime - this.timeLeft) / this.totalTime;
        const circumference = 2 * Math.PI * 120; // radius = 120
        const offset = circumference - (progress * circumference);
        this.progressRing.style.strokeDashoffset = offset;
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different tones for focus vs break completion
            if (this.isBreak) {
                // Higher, more energetic tone for break start
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);
            } else {
                // Lower, calming tone for focus start
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            }

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio notification not available:', error);
        }
    }

    showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = '🍅 Pomodoro Timer';
            const body = this.isBreak 
                ? `Time for a ${this.breakDuration} minute break! You've completed ${this.sessionsCompleted} focus session${this.sessionsCompleted !== 1 ? 's' : ''}.`
                : `Break's over! Time for a ${this.focusDuration} minute focus session.`;

            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>',
                silent: !this.soundEnabled
            });
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    openSettings() {
        this.settingsPanel.classList.add('active');
        this.overlay.classList.add('active');
        
        // Update inputs with current values
        this.focusDurationInput.value = this.focusDuration;
        this.breakDurationInput.value = this.breakDuration;
        this.soundEnabledInput.checked = this.soundEnabled;
        
        // Focus first input for accessibility
        setTimeout(() => this.focusDurationInput.focus(), 100);
    }

    closeSettings() {
        this.settingsPanel.classList.remove('active');
        this.overlay.classList.remove('active');
    }

    isSettingsOpen() {
        return this.settingsPanel.classList.contains('active');
    }

    saveSettings() {
        // Get values from inputs
        const newFocusDuration = parseInt(this.focusDurationInput.value);
        const newBreakDuration = parseInt(this.breakDurationInput.value);
        const newSoundEnabled = this.soundEnabledInput.checked;

        // Validate and update settings
        this.focusDuration = Math.max(1, Math.min(60, newFocusDuration));
        this.breakDuration = Math.max(1, Math.min(30, newBreakDuration));
        this.soundEnabled = newSoundEnabled;

        // Update inputs with validated values
        this.focusDurationInput.value = this.focusDuration;
        this.breakDurationInput.value = this.breakDuration;

        // If timer is not running, update current session
        if (!this.isRunning) {
            if (this.isBreak) {
                this.timeLeft = this.breakDuration * 60;
                this.totalTime = this.breakDuration * 60;
            } else {
                this.timeLeft = this.focusDuration * 60;
                this.totalTime = this.focusDuration * 60;
            }
            this.updateDisplay();
            this.updateProgress();
        }

        // Save to localStorage
        this.saveToStorage();
        
        // Show feedback
        this.showSaveConfirmation();
        
        // Close settings
        setTimeout(() => this.closeSettings(), 1000);
    }

    showSaveConfirmation() {
        const originalText = this.saveSettingsBtn.textContent;
        this.saveSettingsBtn.textContent = 'Saved!';
        this.saveSettingsBtn.style.background = 'var(--break-color)';
        
        setTimeout(() => {
            this.saveSettingsBtn.textContent = originalText;
            this.saveSettingsBtn.style.background = '';
        }, 1000);
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('pomodoroSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.focusDuration = settings.focusDuration || 25;
                this.breakDuration = settings.breakDuration || 5;
                this.soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
            }

            const savedProgress = localStorage.getItem('pomodoroProgress');
            if (savedProgress) {
                const progress = JSON.parse(savedProgress);
                this.sessionsCompleted = progress.sessionsCompleted || 0;
                this.sessionCount.textContent = this.sessionsCompleted;
            }
        } catch (error) {
            console.log('Error loading settings:', error);
        }

        // Set initial timer values
        this.timeLeft = this.focusDuration * 60;
        this.totalTime = this.focusDuration * 60;
    }

    saveToStorage() {
        try {
            const settings = {
                focusDuration: this.focusDuration,
                breakDuration: this.breakDuration,
                soundEnabled: this.soundEnabled
            };
            localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        } catch (error) {
            console.log('Error saving settings:', error);
        }
    }

    saveProgress() {
        try {
            const progress = {
                sessionsCompleted: this.sessionsCompleted,
                lastSession: new Date().toISOString()
            };
            localStorage.setItem('pomodoroProgress', JSON.stringify(progress));
        } catch (error) {
            console.log('Error saving progress:', error);
        }
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});

// Service Worker registration for better offline experience (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
} 