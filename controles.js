/**
 * controles.js - Gestion des entrées Clavier, Souris (Pointer Lock), Hotbar et Écran Tactile Mobile
 */

class Controles {
    constructor(joueur, monde) {
        this.joueur = joueur;
        this.monde = monde;

        // États des touches de déplacement
        this.avant = false;
        this.arriere = false;
        this.gauche = false;
        this.droite = false;
        this.sauter = false;

        // Joystick virtuel mobile
        this.joystickVector = { x: 0, y: 0 };
        this.joystickActif = false;
        this.touchIdJoystick = null;

        // Tactile - Regard
        this.touchIdLook = null;
        this.dernierTouchX = 0;
        this.dernierTouchY = 0;

        // Callback au clic d'action (Casser / Poser)
        this.onActionBreak = null;
        this.onActionPlace = null;

        // Initialisation des écouteurs
        this.initClavier();
        this.initSouris();
        this.initHotbarUI();
        this.initTactileMobile();
    }

    /**
     * Écouteurs de touches clavier (AZERTY / QWERTY / Flèches / 1-5 / Espace)
     */
    initClavier() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW':
                case 'KeyZ':
                case 'ArrowUp':
                    this.avant = true;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.arriere = true;
                    break;
                case 'KeyA':
                case 'KeyQ':
                case 'ArrowLeft':
                    this.gauche = true;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.droite = true;
                    break;
                case 'Space':
                    this.sauter = true;
                    e.preventDefault();
                    break;
                case 'Digit1': this.selectionnerSlotHotbar(0); break;
                case 'Digit2': this.selectionnerSlotHotbar(1); break;
                case 'Digit3': this.selectionnerSlotHotbar(2); break;
                case 'Digit4': this.selectionnerSlotHotbar(3); break;
                case 'Digit5': this.selectionnerSlotHotbar(4); break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW':
                case 'KeyZ':
                case 'ArrowUp':
                    this.avant = false;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.arriere = false;
                    break;
                case 'KeyA':
                case 'KeyQ':
                case 'ArrowLeft':
                    this.gauche = false;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.droite = false;
                    break;
                case 'Space':
                    this.sauter = false;
                    break;
            }
        });
    }

    /**
     * Écouteurs de la souris et du Pointer Lock
     */
    initSouris() {
        document.addEventListener('mousemove', (e) => {
            // Uniquement si le Pointer Lock est actif
            if (document.pointerLockElement === document.body) {
                this.joueur.tournerVue(e.movementX, e.movementY);
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== document.body) return;

            if (e.button === 0) {
                // Clic gauche : Casser
                if (this.onActionBreak) this.onActionBreak();
            } else if (e.button === 2) {
                // Clic droit : Poser
                if (this.onActionPlace) this.onActionPlace();
            }
        });

        // Empêcher le menu contextuel du clic droit en jeu
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Écouteurs pour la hotbar en bas de l'écran
     */
    initHotbarUI() {
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectionnerSlotHotbar(index);
            });
        });
    }

    /**
     * Sélectionne un slot dans la Hotbar (index 0 à 4)
     */
    selectionnerSlotHotbar(index) {
        const slots = document.querySelectorAll('.hotbar-slot');
        if (index < 0 || index >= slots.length) return;

        slots.forEach(s => s.classList.remove('active'));
        const slotActif = slots[index];
        slotActif.classList.add('active');

        const typeBloc = parseInt(slotActif.getAttribute('data-block'), 10);
        this.joueur.blocSelectionne = typeBloc;
    }

    /**
     * Gestion du joystick virtuel, du glissé pour regarder, et des boutons sur mobile
     */
    initTactileMobile() {
        const joystickZone = document.getElementById('joystick-zone');
        const joystickStick = document.getElementById('joystick-stick');
        const touchLookZone = document.getElementById('touch-look-zone');

        const btnBreak = document.getElementById('btn-break');
        const btnPlace = document.getElementById('btn-place');
        const btnJump = document.getElementById('btn-jump');

        // Boutons d'action tactiles
        if (btnBreak) {
            btnBreak.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.onActionBreak) this.onActionBreak();
            });
        }

        if (btnPlace) {
            btnPlace.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.onActionPlace) this.onActionPlace();
            });
        }

        if (btnJump) {
            btnJump.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.sauter = true;
            });
            btnJump.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.sauter = false;
            });
        }

        // Joystick virtuel tactile
        if (joystickZone) {
            joystickZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                this.touchIdJoystick = touch.identifier;
                this.joystickActif = true;
                this.mettreAJourJoystick(touch, joystickZone, joystickStick);
            });

            joystickZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.touchIdJoystick) {
                        this.mettreAJourJoystick(e.changedTouches[i], joystickZone, joystickStick);
                        break;
                    }
                }
            });

            const finJoystick = (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.touchIdJoystick) {
                        this.joystickActif = false;
                        this.touchIdJoystick = null;
                        this.joystickVector = { x: 0, y: 0 };
                        if (joystickStick) {
                            joystickStick.style.transform = 'translate(-50%, -50%)';
                        }
                        break;
                    }
                }
            };

            joystickZone.addEventListener('touchend', finJoystick);
            joystickZone.addEventListener('touchcancel', finJoystick);
        }

        // Zone droite : Glisser le doigt pour regarder autour
        if (touchLookZone) {
            touchLookZone.addEventListener('touchstart', (e) => {
                const touch = e.changedTouches[0];
                this.touchIdLook = touch.identifier;
                this.dernierTouchX = touch.clientX;
                this.dernierTouchY = touch.clientY;
            });

            touchLookZone.addEventListener('touchmove', (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === this.touchIdLook) {
                        const deltaX = touch.clientX - this.dernierTouchX;
                        const deltaY = touch.clientY - this.dernierTouchY;

                        this.joueur.tournerVue(deltaX, deltaY);

                        this.dernierTouchX = touch.clientX;
                        this.dernierTouchY = touch.clientY;
                        break;
                    }
                }
            });

            const finLook = (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.touchIdLook) {
                        this.touchIdLook = null;
                        break;
                    }
                }
            };

            touchLookZone.addEventListener('touchend', finLook);
            touchLookZone.addEventListener('touchcancel', finLook);
        }
    }

    /**
     * Calcule le vecteur du joystick virtuel et déplace visuellement le manchon (stick)
     */
    mettreAJourJoystick(touch, baseEl, stickEl) {
        const rect = baseEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const maxRadius = rect.width / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;

        const dist = Math.hypot(dx, dy);
        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        // Normalisation entre -1 et 1
        this.joystickVector.x = dx / maxRadius;
        this.joystickVector.y = dy / maxRadius;

        // Déplacement visuel du stick
        if (stickEl) {
            stickEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
    }
}
