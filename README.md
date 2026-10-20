# MiniCraft 3D

Un mini-jeu 3D voxel dans le navigateur, inspiré de Minecraft, développé en HTML5, CSS3 et JavaScript ES6 avec **Three.js**.

Le jeu est 100% gratuit, sans aucune installation nécessaire, et fonctionne directement dans votre navigateur web, que ce soit sur **ordinateur** ou sur **smartphone/tablette (mobile)**.

---

## 🚀 Comment lancer le jeu ?

1. Clônez ou téléchargez ce dépôt sur votre machine.
2. Ouvrez simplement le fichier `index.html` dans n'importe quel navigateur web moderne (Chrome, Firefox, Edge, Safari).
3. Vous pouvez également héberger le dossier avec un serveur local HTTP (par exemple avec VS Code Live Server ou `npx serve`).

---

## 🎮 Contrôles du jeu

### 🖥️ Sur Ordinateur (Clavier + Souris)

- **Menu d'accueil / Pause :**
  - Cliquer sur **Jouer** pour démarrer ou reprendre.
  - Cliquer sur **Nouveau monde** pour régénérer la carte.
  - Touche `Échap` (`Escape`) : Libère la souris et ouvre le menu de pause.

- **Déplacements :**
  - `Z` / `Q` / `S` / `D` ou `W` / `A` / `S` / `D` ou **Flèches directionnelles** : Avancer, reculer, aller à gauche ou à droite.
  - `Espace` : Sauter.

- **Regard et caméra :**
  - Bouger la **Souris** (Pointer Lock activé au clic).

- **Interactions avec les blocs :**
  - **Clic Gauche** : Casser / détruire le bloc visé au centre du viseur.
  - **Clic Droit** : Poser le bloc sélectionné sur la face ciblée.
  - **Surbrillance** : Un contour blanc indique le bloc actuellement ciblé.

- **Hotbar (Barre d'outils bas) :**
  - Touches `1`, `2`, `3`, `4`, `5` : Sélectionner le type de bloc (Herbe, Terre, Pierre, Bois, Feuilles).
  - Clic de souris direct sur le slot de la hotbar.

---

### 📱 Sur Mobile / Tablette (Écran Tactile)

- **Déplacements :**
  - **Joystick virtuel (bas gauche)** : Glisser le doigt dans la zone pour vous déplacer.
- **Regard :**
  - **Zone droite de l'écran** : Glisser le doigt pour orienter la vue.
- **Actions :**
  - Bouton **Casser** (rouge) : Détruire le bloc visé.
  - Bouton **Poser** (vert) : Placer le bloc sélectionné.
  - Bouton **Sauter** (bleu) : Sauter.
- **Hotbar :**
  - Appuyer sur l'un des 5 emplacements en bas pour changer de bloc.

---

## 🌟 Fonctionnalités incluses

- **Génération procédurale du monde :** Carte 64x64 avec reliefs lissés, herbe en surface, 3 couches de terre, de la pierre en sous-sol, des plans d'eau dans les zones basses et des arbres.
- **Moteur de rendu performant :** Utilisation d'**InstancedMesh** avec Three.js pour garantir 60 FPS constants.
- **Physique et collisions 3D (AABB) :** Gravité réaliste, sauts et gestion des collisions solides (le joueur ne passe pas à travers le sol ou les murs).
- **Thème sombre & UI responsive :** Interface adaptée aussi bien aux écrans PC qu'aux appareils mobiles.
- **Brouillard de distance :** Ciel bleu avec brouillard volumétrique pour masquer les limites de la carte.

---

## 📂 Architecture des fichiers

- `index.html` : Structure HTML, conteneur canvas, hotbar, contrôles mobiles et menu.
- `style.css` : Styles responsive sombres, effets visuels et boutons tactiles.
- `monde.js` : Génération procédurale du terrain 64x64, maillages, blocs et surbrillance.
- `joueur.js` : Caméra à la première personne, gestion du mouvement, de la gravité et des collisions AABB.
- `controles.js` : Gestion des entrées clavier, souris (Pointer Lock), hotbar et joystick tactile mobile.
- `main.js` : Initialisation Three.js, lumières, brouillard, raycasting, événements UI et boucle de rendu.
