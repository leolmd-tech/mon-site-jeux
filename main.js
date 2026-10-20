/**
 * main.js - Initialisation de la scène Three.js, raycasting, menu et boucle principale
 */

let scene, camera, renderer, raycaster;
let monde, joueur, controles;
let tempsPrecedent = performance.now();
let jeuEnCours = false;

// Cible du raycast (bloc visé)
let blocVisé = null; // { x, y, z }
let faceProcheVisée = null; // { x, y, z } position du bloc adjacent où poser un nouveau bloc

/**
 * Initialisation au chargement de la page
 */
window.addEventListener('DOMContentLoaded', () => {
    initScene();
    initJeu();
    initMenuEtEvents();
    animer();
});

/**
 * Configure la scène Three.js (Lumières, brouillard, renderer)
 */
function initScene() {
    const container = document.getElementById('canvas-container');

    // Scène
    scene = new THREE.Scene();
    const couleurCiel = 0x87ceeb; // Bleu ciel Minecraft
    scene.background = new THREE.Color(couleurCiel);

    // Brouillard de distance pour masquer les bordures du monde 64x64
    scene.fog = new THREE.FogExp2(couleurCiel, 0.035);

    // Caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Éclairage : Soleil (Lumière directionnelle) + Lumière ambiante douce
    const lumièreAmbiante = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(lumièreAmbiante);

    const soleil = new THREE.DirectionalLight(0xffffff, 0.8);
    soleil.position.set(40, 60, 20);
    soleil.castShadow = true;
    soleil.shadow.mapSize.width = 1024;
    soleil.shadow.mapSize.height = 1024;
    soleil.shadow.camera.near = 0.5;
    soleil.shadow.camera.far = 150;
    const d = 40;
    soleil.shadow.camera.left = -d;
    soleil.shadow.camera.right = d;
    soleil.shadow.camera.top = d;
    soleil.shadow.camera.bottom = -d;
    scene.add(soleil);

    // Raycaster pour détecter les blocs visés au centre de l'écran
    raycaster = new THREE.Raycaster();
    raycaster.far = 8; // Portée d'interaction max : 8 blocs
}

/**
 * Instancie le monde, le joueur et les contrôles
 */
function initJeu() {
    monde = new Monde(scene, 64, 64, 32);
    monde.generer();

    joueur = new Joueur(camera, monde);
    joueur.reinitialiserPosition();

    controles = new Controles(joueur, monde);

    // Lier les actions Casser et Poser
    controles.onActionBreak = casserBloc;
    controles.onActionPlace = poserBloc;
}

/**
 * Gestion du menu principal, bouton Jouer, Nouveau monde et redimensionnement
 */
function initMenuEtEvents() {
    const menuOverlay = document.getElementById('menu-overlay');
    const btnPlay = document.getElementById('btn-play');
    const btnNewWorld = document.getElementById('btn-new-world');

    // Lancer ou reprendre le jeu
    const demarrerJeu = () => {
        menuOverlay.classList.add('hidden');
        jeuEnCours = true;

        // Tenter le Pointer Lock uniquement sur ordinateur (non-tactile)
        if (!window.matchMedia('(max-pointer: coarse)').matches) {
            document.body.requestPointerLock();
        }
    };

    btnPlay.addEventListener('click', demarrerJeu);

    // Bouton "Nouveau monde" : régénérer le monde et repositionner le joueur
    btnNewWorld.addEventListener('click', () => {
        monde.generer();
        joueur.reinitialiserPosition();
        demarrerJeu();
    });

    // Pause si l'utilisateur quitte le Pointer Lock avec Échap sur PC
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== document.body && jeuEnCours) {
            // Seulement sur PC
            if (!window.matchMedia('(max-pointer: coarse)').matches) {
                jeuEnCours = false;
                menuOverlay.classList.remove('hidden');
            }
        }
    });

    // Adapter le rendu au redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/**
 * Effectue un Raycast depuis le centre de l'écran (0,0) pour cibler un bloc
 */
function mettreAJourRaycast() {
    if (!jeuEnCours) {
        monde.mettreAJourSurbrillance(null);
        blocVisé = null;
        faceProcheVisée = null;
        return;
    }

    // Le rayon part du centre exact de l'écran (0,0 en coordonnées NDC)
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Obtenir tous les objets maillés de blocs
    const objetsInteractifs = Object.values(monde.instancedMeshes);
    const intersections = raycaster.intersectObjects(objetsInteractifs, false);

    if (intersections.length > 0) {
        const hit = intersections[0];

        // Calcul du bloc ciblé d'après le point d'impact et la normale de la face
        const normal = hit.face.normal;
        const pointImpact = hit.point.clone().sub(normal.clone().multiplyScalar(0.01));

        const bx = Math.floor(pointImpact.x);
        const by = Math.floor(pointImpact.y);
        const bz = Math.floor(pointImpact.z);

        // Vérifier si un bloc valide est touché (non Air et non Eau)
        const typeBloc = monde.getBloc(bx, by, bz);
        if (typeBloc !== BLOCS.AIR && typeBloc !== BLOCS.EAU) {
            blocVisé = { x: bx, y: by, z: bz };
            faceProcheVisée = {
                x: bx + Math.round(normal.x),
                y: by + Math.round(normal.y),
                z: bz + Math.round(normal.z)
            };

            monde.mettreAJourSurbrillance(blocVisé);
            return;
        }
    }

    // Aucun bloc ciblé
    blocVisé = null;
    faceProcheVisée = null;
    monde.mettreAJourSurbrillance(null);
}

/**
 * Action : Casser le bloc actuellement ciblé
 */
function casserBloc() {
    if (blocVisé) {
        monde.setBloc(blocVisé.x, blocVisé.y, blocVisé.z, BLOCS.AIR);
        monde.mettreAJourMesh();
        mettreAJourRaycast();
    }
}

/**
 * Action : Poser le bloc sélectionné sur la face adjacente du bloc ciblé
 */
function poserBloc() {
    if (!faceProcheVisée) return;

    const { x, y, z } = faceProcheVisée;

    // Vérifier que l'emplacement est vide (Air ou Eau)
    const typeActuel = monde.getBloc(x, y, z);
    if (typeActuel !== BLOCS.AIR && typeActuel !== BLOCS.EAU) return;

    // Empecher de poser un bloc à l'intérieur du corps du joueur (collision)
    const px = Math.floor(joueur.position.x);
    const py1 = Math.floor(joueur.position.y);
    const py2 = Math.floor(joueur.position.y + 0.9);
    const py3 = Math.floor(joueur.position.y + joueur.hauteur - 0.1);
    const pz = Math.floor(joueur.position.z);

    if (x === px && z === pz && (y === py1 || y === py2 || y === py3)) {
        return; // Le joueur est sur ce bloc !
    }

    // Poser le bloc
    monde.setBloc(x, y, z, joueur.blocSelectionne);
    monde.mettreAJourMesh();
    mettreAJourRaycast();
}

/**
 * Boucle d'animation principale (60 FPS)
 */
function animer() {
    requestAnimationFrame(animer);

    const tempsActuel = performance.now();
    const dt = (tempsActuel - tempsPrecedent) / 1000;
    tempsPrecedent = tempsActuel;

    if (jeuEnCours) {
        // Mise à jour de la physique et de la position du joueur
        joueur.mettreAJour(dt, controles);

        // Raycast pour détecter le bloc au viseur
        mettreAJourRaycast();
    }

    // Rendu de la scène Three.js
    renderer.render(scene, camera);
}
