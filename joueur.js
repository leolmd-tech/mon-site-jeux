/**
 * joueur.js - Gestion du joueur, de la caméra à la première personne et des collisions AABB
 */

class Joueur {
    constructor(camera, monde) {
        this.camera = camera;
        this.monde = monde;

        // Dimensions du joueur (Boîte AABB)
        this.hauteur = 1.8;
        this.largeur = 0.6;
        this.profondeur = 0.6;
        this.hauteurYeux = 1.62;

        // Position et vitesse
        this.position = new THREE.Vector3(32, 15, 32);
        this.vitesse = new THREE.Vector3(0, 0, 0);

        // Orientation de la caméra (angles en radians)
        this.pitch = 0; // Rotation verticale (regarder haut/bas)
        this.yaw = 0;   // Rotation horizontale (regarder gauche/droite)

        // Constantes physiques
        this.gravite = 28.0;
        this.vitesseDeplacement = 6.0;
        this.forceSaut = 9.0;
        this.auSol = false;

        // Type de bloc sélectionné dans la hotbar
        this.blocSelectionne = BLOCS.HERBE;

        // Positionnement initial de la caméra
        this.actualiserCamera();
    }

    /**
     * Re-positionne le joueur sur la surface du terrain
     */
    reinitialiserPosition() {
        const x = Math.floor(this.monde.tailleX / 2);
        const z = Math.floor(this.monde.tailleZ / 2);
        const y = this.monde.trouverHauteurMaxSol(x, z) + 2;

        this.position.set(x + 0.5, y, z + 0.5);
        this.vitesse.set(0, 0, 0);
        this.pitch = 0;
        this.yaw = 0;
        this.actualiserCamera();
    }

    /**
     * Orientations de la caméra d'après le mouvement de la souris / tactile
     */
    tournerVue(deltaX, deltaY) {
        const sensibilite = 0.0022;
        this.yaw -= deltaX * sensibilite;
        this.pitch -= deltaY * sensibilite;

        // Limiter le regard vertical à -89° et +89° pour éviter de retourner la caméra
        const maxPitch = Math.PI / 2 - 0.01;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

        this.actualiserCamera();
    }

    /**
     * Met à jour la matrice de la caméra Three.js d'après position et orientation
     */
    actualiserCamera() {
        // Position de la caméra au niveau des yeux du joueur
        this.camera.position.set(
            this.position.x,
            this.position.y + this.hauteurYeux,
            this.position.z
        );

        // Calcul du vecteur directionnel de regard
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    /**
     * Mise à jour physique (déplacements, gravité, collisions AABB)
     */
    mettreAJour(dt, controles) {
        if (dt > 0.1) dt = 0.1; // Empêcher les sauts temporels si lag

        // 1. Calcul du mouvement souhaité sur le plan X/Z
        const dirMouvement = new THREE.Vector3();

        if (controles.avant) dirMouvement.z -= 1;
        if (controles.arriere) dirMouvement.z += 1;
        if (controles.gauche) dirMouvement.x -= 1;
        if (controles.droite) dirMouvement.x += 1;

        // Prise en compte de la direction du joystick mobile s'il est utilisé
        if (controles.joystickVector.x !== 0 || controles.joystickVector.y !== 0) {
            dirMouvement.x = controles.joystickVector.x;
            dirMouvement.z = controles.joystickVector.y;
        }

        if (dirMouvement.lengthSq() > 0) {
            dirMouvement.normalize();
        }

        // Orienter le vecteur de déplacement selon l'angle yaw de la caméra
        const cosYaw = Math.cos(this.yaw);
        const sinYaw = Math.sin(this.yaw);

        const vxLocal = dirMouvement.x;
        const vzLocal = dirMouvement.z;

        const vxWorld = vxLocal * cosYaw + vzLocal * sinYaw;
        const vzWorld = -vxLocal * sinYaw + vzLocal * cosYaw;

        this.vitesse.x = vxWorld * this.vitesseDeplacement;
        this.vitesse.z = vzWorld * this.vitesseDeplacement;

        // 2. Saut et gravité
        if (controles.sauter && this.auSol) {
            this.vitesse.y = this.forceSaut;
            this.auSol = false;
        }

        this.vitesse.y -= this.gravite * dt;

        // 3. Application de la vitesse et résolution des collisions axe par axe (AABB)
        this.deplacerAvecCollision(dt);

        // 4. Mettre à jour la position réelle de la caméra
        this.actualiserCamera();
    }

    /**
     * Déplacement avec collision Axis-Aligned Bounding Box (AABB) contre les blocs
     */
    deplacerAvecCollision(dt) {
        // Tester X
        this.position.x += this.vitesse.x * dt;
        if (this.verifierCollisionMonde()) {
            this.position.x -= this.vitesse.x * dt;
            this.vitesse.x = 0;
        }

        // Tester Z
        this.position.z += this.vitesse.z * dt;
        if (this.verifierCollisionMonde()) {
            this.position.z -= this.vitesse.z * dt;
            this.vitesse.z = 0;
        }

        // Tester Y
        this.position.y += this.vitesse.y * dt;
        if (this.verifierCollisionMonde()) {
            if (this.vitesse.y < 0) {
                // Atterrissage au sol
                this.auSol = true;
            }
            this.position.y -= this.vitesse.y * dt;
            this.vitesse.y = 0;
        } else {
            // En l'air
            this.auSol = false;
        }

        // Garder le joueur dans les limites X/Z du terrain 64x64
        this.position.x = Math.max(0.3, Math.min(this.monde.tailleX - 0.3, this.position.x));
        this.position.z = Math.max(0.3, Math.min(this.monde.tailleZ - 0.3, this.position.z));

        // Empêcher de tomber indéfiniment sous la carte
        if (this.position.y < -5) {
            this.reinitialiserPosition();
        }
    }

    /**
     * Vérifie si la boite AABB du joueur intersecte un bloc solide du monde
     */
    verifierCollisionMonde() {
        const halfWidth = this.largeur / 2;
        const halfDepth = this.profondeur / 2;

        const minX = Math.floor(this.position.x - halfWidth);
        const maxX = Math.floor(this.position.x + halfWidth);
        const minY = Math.floor(this.position.y);
        const maxY = Math.floor(this.position.y + this.hauteur);
        const minZ = Math.floor(this.position.z - halfDepth);
        const maxZ = Math.floor(this.position.z + halfDepth);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (this.monde.estSolide(x, y, z)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
