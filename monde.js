/**
 * monde.js - Gestion du monde voxel 3D et génération procédurale
 */

// Types de blocs disponibles
const BLOCS = {
    AIR: 0,
    HERBE: 1,
    TERRE: 2,
    PIERRE: 3,
    BOIS: 4,
    FEUILLES: 5,
    EAU: 6
};

// Noms des blocs
const NOMS_BLOCS = {
    [BLOCS.HERBE]: 'Herbe',
    [BLOCS.TERRE]: 'Terre',
    [BLOCS.PIERRE]: 'Pierre',
    [BLOCS.BOIS]: 'Bois',
    [BLOCS.FEUILLES]: 'Feuilles'
};

class Monde {
    constructor(scene, tailleX = 64, tailleZ = 64, hauteurMax = 32) {
        this.scene = scene;
        this.tailleX = tailleX; // 64 blocs de large
        this.tailleZ = tailleZ; // 64 blocs de long
        this.hauteurMax = hauteurMax; // Hauteur max de la grille
        this.niveauEau = 6; // Hauteur de l'eau

        // Grille 3D plate [x][y][z]
        this.grille = new Uint8Array(tailleX * hauteurMax * tailleZ);

        // InstanceMesh par type de bloc pour des performances optimales (FPS très élevé)
        this.instancedMeshes = {};

        // Géométrie commune pour tous les blocs (cubes 1x1x1)
        this.cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

        // Matériaux colorés avec ombrage et textures procédurales légères
        this.matériaux = this.creerMateriaux();

        // Surbrillance du bloc ciblé par le joueur
        this.surbrillanceMesh = this.creerSurbrillanceMesh();
        this.scene.add(this.surbrillanceMesh);

        // Maillages d'eau transparents
        this.eauMesh = null;
    }

    /**
     * Crée des textures simples générées dynamiquement par Canvas HTML5 pour embellir les blocs
     */
    creerMateriaux() {
        // Fonction utilitaire pour créer une texture Canvas
        const creerCanvasTexture = (couleurFond, couleurDetail, type) => {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = couleurFond;
            ctx.fillRect(0, 0, 32, 32);

            // Bruit léger pour donner un aspect pixelisé style Minecraft
            for (let i = 0; i < 64; i++) {
                const x = Math.floor(Math.random() * 32);
                const y = Math.floor(Math.random() * 32);
                ctx.fillStyle = couleurDetail;
                ctx.fillRect(x, y, 2, 2);
            }

            // Spécificités selon le type de bloc
            if (type === 'HERBE') {
                // Dessiner une bande verte supérieure sur les côtés
                ctx.fillStyle = '#55aa55';
                ctx.fillRect(0, 0, 32, 8);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            return texture;
        };

        // Texture spécifique Herbe (Haut vert, Côtés avec herbe + terre, Bas terre)
        const texGrassTop = creerCanvasTexture('#55aa55', '#449944', 'TOP');
        const texGrassSide = creerCanvasTexture('#8b5a2b', '#55aa55', 'HERBE');
        const texDirt = creerCanvasTexture('#8b5a2b', '#6d421e', 'DIRT');
        const texStone = creerCanvasTexture('#888888', '#666666', 'STONE');
        const texWood = creerCanvasTexture('#a0522d', '#663300', 'WOOD');
        const texLeaves = creerCanvasTexture('#2e8b57', '#1f603c', 'LEAVES');

        // Matériau Herbe multi-faces (Haut vert, Côtés mixtes, Bas terre)
        const matGrassSide = new THREE.MeshLambertMaterial({ map: texGrassSide });
        const matGrassTop = new THREE.MeshLambertMaterial({ map: texGrassTop });
        const matDirt = new THREE.MeshLambertMaterial({ map: texDirt });

        const matHerbeMulti = [
            matGrassSide, // Right
            matGrassSide, // Left
            matGrassTop,  // Top
            matDirt,      // Bottom
            matGrassSide, // Front
            matGrassSide  // Back
        ];

        return {
            [BLOCS.HERBE]: matHerbeMulti,
            [BLOCS.TERRE]: matDirt,
            [BLOCS.PIERRE]: new THREE.MeshLambertMaterial({ map: texStone }),
            [BLOCS.BOIS]: new THREE.MeshLambertMaterial({ map: texWood }),
            [BLOCS.FEUILLES]: new THREE.MeshLambertMaterial({ map: texLeaves, transparent: true, opacity: 0.95 }),
            [BLOCS.EAU]: new THREE.MeshLambertMaterial({ color: 0x3388ff, transparent: true, opacity: 0.6 })
        };
    }

    /**
     * Crée la boîte englobante pour la surbrillance du bloc ciblé
     */
    creerSurbrillanceMesh() {
        const geo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, mat);
        wireframe.visible = false;
        return wireframe;
    }

    /**
     * Convertit les coordonnées (x, y, z) en index plat dans le tableau
     */
    getIdx(x, y, z) {
        if (x < 0 || x >= this.tailleX || y < 0 || y >= this.hauteurMax || z < 0 || z >= this.tailleZ) {
            return -1;
        }
        return x + y * this.tailleX + z * this.tailleX * this.hauteurMax;
    }

    /**
     * Obtient la valeur du bloc à la position (x, y, z)
     */
    getBloc(x, y, z) {
        const idx = this.getIdx(x, y, z);
        if (idx === -1) return BLOCS.AIR;
        return this.grille[idx];
    }

    /**
     * Définit le type de bloc à la position (x, y, z)
     */
    setBloc(x, y, z, type) {
        const idx = this.getIdx(x, y, z);
        if (idx !== -1) {
            this.grille[idx] = type;
        }
    }

    /**
     * Vérifie si un bloc est solide pour la physique et les collisions
     */
    estSolide(x, y, z) {
        const type = this.getBloc(Math.floor(x), Math.floor(y), Math.floor(z));
        return type !== BLOCS.AIR && type !== BLOCS.EAU;
    }

    /**
     * Bruit 2D simple et rapide pour génération de collines lissées
     */
    bruitForme(x, z, seed = 12345) {
        // Combinaison de sinus/cosinus à plusieurs fréquences (octaves)
        const scale1 = 0.05;
        const scale2 = 0.1;
        const v1 = Math.sin((x + seed) * scale1) * Math.cos((z + seed) * scale1) * 6;
        const v2 = Math.sin((x - seed) * scale2) * Math.sin((z + seed) * scale2) * 3;
        const v3 = Math.cos((x + z) * 0.15) * 1.5;
        return Math.floor(8 + v1 + v2 + v3);
    }

    /**
     * Génère un nouveau terrain procédural 64x64 avec collines, couches sol, eau et arbres
     */
    generer() {
        // Réinitialiser la grille
        this.grille.fill(BLOCS.AIR);
        const seed = Math.random() * 10000;

        // 1. Terrain de base (Herbe, Terre, Pierre, Eau)
        for (let x = 0; x < this.tailleX; x++) {
            for (let z = 0; z < this.tailleZ; z++) {
                const hauteurHauteur = Math.max(3, Math.min(this.hauteurMax - 6, this.bruitForme(x, z, seed)));

                for (let y = 0; y <= hauteurHauteur; y++) {
                    if (y === hauteurHauteur) {
                        // Couche de surface
                        if (y <= this.niveauEau) {
                            // En dessous du niveau de l'eau : terre/sable
                            this.setBloc(x, y, z, BLOCS.TERRE);
                        } else {
                            this.setBloc(x, y, z, BLOCS.HERBE);
                        }
                    } else if (y >= hauteurHauteur - 3) {
                        // 3 couches sous la surface : Terre
                        this.setBloc(x, y, z, BLOCS.TERRE);
                    } else {
                        // Couches inférieures : Pierre
                        this.setBloc(x, y, z, BLOCS.PIERRE);
                    }
                }

                // Remplir d'eau si en dessous du niveau de l'eau
                for (let y = hauteurHauteur + 1; y <= this.niveauEau; y++) {
                    this.setBloc(x, y, z, BLOCS.EAU);
                }
            }
        }

        // 2. Génération des arbres
        for (let x = 3; x < this.tailleX - 3; x += 4) {
            for (let z = 3; z < this.tailleZ - 3; z += 4) {
                // Probabilité d'apparition d'un arbre
                if (Math.random() < 0.25) {
                    const hSol = this.trouverHauteurMaxSol(x, z);
                    // On ne plante pas d'arbre dans l'eau
                    if (hSol > this.niveauEau && this.getBloc(x, hSol, z) === BLOCS.HERBE) {
                        this.ajouterArbre(x, hSol + 1, z);
                    }
                }
            }
        }

        // Reconstruire les maillages 3D dans la scène Three.js
        this.mettreAJourMesh();
    }

    /**
     * Trouve la hauteur de bloc le plus haut à une position (x, z)
     */
    trouverHauteurMaxSol(x, z) {
        for (let y = this.hauteurMax - 1; y >= 0; y--) {
            const b = this.getBloc(x, y, z);
            if (b !== BLOCS.AIR && b !== BLOCS.EAU) {
                return y;
            }
        }
        return 0;
    }

    /**
     * Place un arbre (tronc en bois + feuiillat) à la position x, y, z
     */
    ajouterArbre(x, y, z) {
        const hauteurTronc = 4 + Math.floor(Math.random() * 2);

        // Tronc
        for (let h = 0; h < hauteurTronc; h++) {
            this.setBloc(x, y + h, z, BLOCS.BOIS);
        }

        // Feuiillat (cubes de feuilles autour du sommet)
        const sommetY = y + hauteurTronc;
        for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
                for (let ly = -2; ly <= 1; ly++) {
                    const px = x + lx;
                    const py = sommetY + ly;
                    const pz = z + lz;

                    // Ignorer les coins extrêmes pour arrondir
                    if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && Math.random() > 0.3) continue;

                    if (this.getBloc(px, py, pz) === BLOCS.AIR) {
                        this.setBloc(px, py, pz, BLOCS.FEUILLES);
                    }
                }
            }
        }
    }

    /**
     * Reconstruit la représentation graphique (InstancedMesh) pour un rendu 3D ultrarapide
     */
    mettreAJourMesh() {
        // Nettoyer les anciens maillages
        Object.values(this.instancedMeshes).forEach(mesh => {
            this.scene.remove(mesh);
            mesh.dispose();
        });
        this.instancedMeshes = {};

        // Compter les blocs par type et ne garder que les blocs visibles (optimisation culling)
        const compteurs = {};
        const blocsVisibles = [];

        for (let x = 0; x < this.tailleX; x++) {
            for (let y = 0; y < this.hauteurMax; y++) {
                for (let z = 0; z < this.tailleZ; z++) {
                    const type = this.getBloc(x, y, z);
                    if (type === BLOCS.AIR) continue;

                    // Vérifier si au moins une face est adjacente à l'air/eau pour le rendu
                    if (this.estBlocVisible(x, y, z, type)) {
                        compteurs[type] = (compteurs[type] || 0) + 1;
                        blocsVisibles.push({ x, y, z, type });
                    }
                }
            }
        }

        // Créer un InstancedMesh par type de bloc
        const instancesIndex = {};
        Object.keys(compteurs).forEach(type => {
            const count = compteurs[type];
            const mat = this.matériaux[type];
            const iMesh = new THREE.InstancedMesh(this.cubeGeometry, mat, count);
            iMesh.castShadow = true;
            iMesh.receiveShadow = true;
            this.instancedMeshes[type] = iMesh;
            this.scene.add(iMesh);
            instancesIndex[type] = 0;
        });

        // Placer les transformations dans les InstancedMeshes
        const dummy = new THREE.Object3D();
        blocsVisibles.forEach(({ x, y, z, type }) => {
            dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
            dummy.updateMatrix();

            const idx = instancesIndex[type]++;
            const iMesh = this.instancedMeshes[type];
            if (iMesh) {
                iMesh.setMatrixAt(idx, dummy.matrix);
            }
        });

        // Marquer les matrices comme mises à jour
        Object.values(this.instancedMeshes).forEach(mesh => {
            mesh.instanceMatrix.needsUpdate = true;
        });
    }

    /**
     * Détermine si un bloc doit être dessiné (s'il a une face visible)
     */
    estBlocVisible(x, y, z, type) {
        if (type === BLOCS.EAU) return y === this.niveauEau; // Optimisation eau

        const voisins = [
            this.getBloc(x + 1, y, z),
            this.getBloc(x - 1, y, z),
            this.getBloc(x, y + 1, z),
            this.getBloc(x, y - 1, z),
            this.getBloc(x, y, z + 1),
            this.getBloc(x, y, z - 1)
        ];

        return voisins.some(v => v === BLOCS.AIR || (type !== BLOCS.EAU && v === BLOCS.EAU));
    }

    /**
     * Met à jour la surbrillance blanche sur le bloc ciblé
     */
    mettreAJourSurbrillance(targetPos) {
        if (targetPos) {
            this.surbrillanceMesh.position.set(
                targetPos.x + 0.5,
                targetPos.y + 0.5,
                targetPos.z + 0.5
            );
            this.surbrillanceMesh.visible = true;
        } else {
            this.surbrillanceMesh.visible = false;
        }
    }
}
