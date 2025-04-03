import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Configuration ---
const BOARD_SIZE = 8;
const SQUARE_SIZE = 5;
const BOARD_THICKNESS = 1;
const HIGHLIGHT_COLOR = 0x61dafb;
const CHESS_SET_MODEL_PATH = 'models/low_poly_chess_set (1).glb'; // Make sure this matches!

// --- Materials ---
const lightSquareMaterial = new THREE.MeshStandardMaterial({ color: 0xe3dac9, metalness: 0.2, roughness: 0.3 });
const darkSquareMaterial = new THREE.MeshStandardMaterial({ color: 0x7b5b3f, metalness: 0.2, roughness: 0.4 });
const whitePieceMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.1, roughness: 0.2 });
const blackPieceMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.4 });
const highlightMaterial = new THREE.MeshStandardMaterial({ color: HIGHLIGHT_COLOR, transparent: true, opacity: 0.4, roughness: 0.5, side: THREE.DoubleSide });

// --- Scene Variables ---
let scene, camera, renderer, controls;
let boardGroup, pieceGroup, highlightGroup;
let loadedChessSetModel = null;
let modelsLoaded = false;

// --- Function to Load 3D Models ---
/**
 * Loads the GLB model file asynchronously.
 * @param {function} onLoadedCallback - Function to call once models are loaded.
 */
function loadModels(onLoadedCallback) {
    const loader = new GLTFLoader();
    console.log(`Attempting to load model from: ${CHESS_SET_MODEL_PATH}`);

    loader.load(
        CHESS_SET_MODEL_PATH,
        function (gltf) {
            console.log("GLTF model loaded successfully:", gltf);
            loadedChessSetModel = gltf.scene; // Store the entire loaded scene

            // Enable shadows for all meshes within the loaded model *once*
            loadedChessSetModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            modelsLoaded = true;
            console.log("Models processed and ready.");
            if (onLoadedCallback) {
                onLoadedCallback();
            }
        },
        undefined, // Optional progress callback (usually not needed here)
        function (error) {
            console.error('An error happened during GLTF loading:', error);
            modelsLoaded = false;
        }
    );
}


// --- Public Functions ---

/**
 * Initializes the entire Three.js scene.
 * @param {HTMLElement} container - The DOM element to attach the canvas to.
 * @param {function} onReadyCallback - Function to call when scene AND models are ready.
 */
function init(container, onReadyCallback) {
    // Scene, Camera, Renderer, Lights, Controls, Groups setup...
    // (Same as before - no changes needed in this part of init)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34);
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, SQUARE_SIZE * BOARD_SIZE * 0.6, SQUARE_SIZE * BOARD_SIZE * 0.6);
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(15, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    const shadowCamSize = SQUARE_SIZE * BOARD_SIZE * 0.6;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;
    directionalLight.shadow.bias = -0.001;
    scene.add(directionalLight);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = SQUARE_SIZE * 1.5;
    controls.maxDistance = SQUARE_SIZE * BOARD_SIZE * 1.5;
    controls.maxPolarAngle = Math.PI / 2.05;
    boardGroup = new THREE.Group();
    pieceGroup = new THREE.Group();
    highlightGroup = new THREE.Group();
    scene.add(boardGroup);
    scene.add(pieceGroup);
    scene.add(highlightGroup);
    createBoard();
    window.addEventListener('resize', onWindowResize, false);
    animate();
    console.log("Three.js scene initialized. Starting model load...");

    // Load models and call the callback when done
    loadModels(() => {
        console.log("Model loading complete callback received.");
        if (onReadyCallback) {
            onReadyCallback(); // Signal that everything is ready
        }
    });
}

/**
 * Creates the chessboard geometry.
 * (No changes needed in this function)
 */
function createBoard() {
    // ... (keep existing createBoard function code) ...
    const boardBaseGeometry = new THREE.BoxGeometry(BOARD_SIZE * SQUARE_SIZE, BOARD_THICKNESS, BOARD_SIZE * SQUARE_SIZE);
    const boardBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3e31, roughness: 0.8 });
    const boardBaseMesh = new THREE.Mesh(boardBaseGeometry, boardBaseMaterial);
    boardBaseMesh.position.y = -BOARD_THICKNESS / 2;
    boardBaseMesh.receiveShadow = true;
    boardGroup.add(boardBaseMesh);
    const squareGeometry = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const isLightSquare = (row + col) % 2 === 0;
            const squareMaterial = isLightSquare ? lightSquareMaterial : darkSquareMaterial;
            const squareMesh = new THREE.Mesh(squareGeometry, squareMaterial);
            squareMesh.position.x = (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            squareMesh.position.z = (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            squareMesh.position.y = 0.01;
            squareMesh.rotation.x = -Math.PI / 2;
            squareMesh.receiveShadow = true;
            squareMesh.userData = { type: 'square', row: row, col: col };
            boardGroup.add(squareMesh);
        }
    }
    console.log("Chessboard created.");
}


// ==============================================================
// == PIECE CREATION - NOW WITH AUTO-SCALING ==
// ==============================================================
/**
 * Creates a chess piece by cloning the pre-loaded GLB model scene.
 * Applies automatic scaling based on desired height.
 * TEMPORARY: Still uses the whole scene for all pieces.
 * @param {string} type - Piece type (currently ignored for model selection).
 * @param {string} color - 'white' or 'black'.
 * @returns {THREE.Group | null} A group containing the cloned model, or null if models not loaded.
 */
function createPlaceholderPiece(type, color) {
    if (!modelsLoaded || !loadedChessSetModel) {
        console.error("Attempted to create piece before model loaded!");
        const fallbackGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2);
        const fallbackMesh = new THREE.Mesh(fallbackGeo, color === 'white' ? whitePieceMaterial : blackPieceMaterial);
        const fallbackGroup = new THREE.Group();
        fallbackGroup.add(fallbackMesh);
        fallbackGroup.userData = { type: 'piece', pieceType: 'fallback', color: color };
        return fallbackGroup;
    }

    const pieceModel = loadedChessSetModel.clone(); // Clone the entire loaded scene for now
    const targetMaterial = color === 'white' ? whitePieceMaterial : blackPieceMaterial;

    pieceModel.traverse((child) => {
        if (child.isMesh) {
            child.material = targetMaterial; // Apply our simple color material
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // --- Auto Scaling Logic ---
    // Define roughly how tall we want the pieces relative to the square size
    // King might be SQUARE_SIZE * 1.0, Pawn SQUARE_SIZE * 0.6 etc. Let's aim for average height for now.
    const desiredHeightApprox = SQUARE_SIZE * 0.9; // Target height (Adjust this!)

    // Calculate the bounding box of the *original loaded model* to get its current size
    // We do this calculation once ideally, but for now, we do it per piece.
    // For more efficiency later, calculate this once after loading the model.
    const box = new THREE.Box3().setFromObject(pieceModel); // Use the clone before scaling
    const size = box.getSize(new THREE.Vector3());

    // Calculate scale factor needed to reach desired height
    let scaleFactor = 1.0; // Default scale
    if (size.y > 0.001) { // Avoid division by zero if model has no height
         scaleFactor = desiredHeightApprox / size.y;
         console.log(`Calculated scale factor for ${type}: ${scaleFactor} (Original height: ${size.y})`);
    } else {
         console.warn(`Model for ${type} has zero height, using default scale.`);
    }

    // Apply the calculated scale uniformly
    pieceModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // --- Auto Positioning Logic (Attempt to place base at y=0) ---
    // After scaling, the model's origin might not be at its base.
    // Recalculate bounding box *after scaling* to find the new bottom position (min.y)
    const scaledBox = new THREE.Box3().setFromObject(pieceModel);
    // Adjust the piece's internal position so its bottom sits near y=0
    // Note: pieceModel itself will be placed at y=0 on the board in addPieceToScene,
    // so this internal adjustment positions it relative to that point.
    pieceModel.position.y = -scaledBox.min.y; // Shift model up by its lowest point

    // --- Add Metadata ---
    pieceModel.userData = { type: 'piece', pieceType: type, color: color };

    return pieceModel;
}
// ==============================================================
// == END OF UPDATED PIECE FUNCTION ==
// ==============================================================


/**
 * Adds a piece to the scene at a specific board coordinate.
 * (No changes needed in this function)
 */
function addPieceToScene(type, color, row, col) {
    // ... (keep existing addPieceToScene function code) ...
    const pieceMeshGroup = createPlaceholderPiece(type, color);
    if (!pieceMeshGroup) {
        console.error(`Failed to create piece ${type} at [${row}, ${col}]`);
        return null;
    }
    const position = getPositionFromCoords(row, col);
    pieceMeshGroup.position.set(position.x, 0, position.z); // Place base at square center y=0
    pieceMeshGroup.userData.row = row;
    pieceMeshGroup.userData.col = col;
    pieceGroup.add(pieceMeshGroup);
    return pieceMeshGroup;
}

/**
 * Removes all piece groups from the scene.
 * (No changes needed in this function)
 */
function clearPieces() {
    // ... (keep existing clearPieces function code) ...
     while(pieceGroup.children.length > 0){
        const piece = pieceGroup.children[0];
        piece.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
            }
        });
        pieceGroup.remove(piece);
    }
}

/**
 * Converts board coordinates (row, col) to 3D world position.
 * (No changes needed in this function)
 */
function getPositionFromCoords(row, col) {
    // ... (keep existing getPositionFromCoords function code) ...
     return new THREE.Vector3(
        (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE,
        0,
        (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE
    );
}

/**
 * Converts 3D world position to board coordinates (row, col).
 * (No changes needed in this function)
 */
function getCoordsFromPosition(position) {
    // ... (keep existing getCoordsFromPosition function code) ...
    const col = Math.floor(position.x / SQUARE_SIZE + BOARD_SIZE / 2);
    const row = Math.floor(position.z / SQUARE_SIZE + BOARD_SIZE / 2);
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        return { row, col };
    }
    return null;
}


/**
 * Finds the piece group at the given board coordinates.
 * (No changes needed in this function)
 */
function getPieceMeshAt(row, col) {
    // ... (keep existing getPieceMeshAt function code) ...
     for (const piece of pieceGroup.children) {
        if (piece.userData.row === row && piece.userData.col === col) {
            return piece;
        }
    }
    return null;
}


/**
 * Moves a piece group instantly to new board coordinates.
 * (No changes needed in this function)
 */
function movePieceMesh(pieceMeshGroup, newRow, newCol) {
    // ... (keep existing movePieceMesh function code) ...
    const targetPosition = getPositionFromCoords(newRow, newCol);
    pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z);
    pieceMeshGroup.userData.row = newRow;
    pieceMeshGroup.userData.col = newCol;
}

/**
 * Removes a specific piece group from the scene.
 * (No changes needed in this function)
 */
function removePieceMesh(pieceMeshGroup) {
    // ... (keep existing removePieceMesh function code) ...
      if (pieceMeshGroup) {
        pieceMeshGroup.traverse((child) => {
             if (child instanceof THREE.Mesh) {
                 if (child.geometry) child.geometry.dispose();
             }
         });
        pieceGroup.remove(pieceMeshGroup);
    }
}


// --- Highlighting ---
/**
 * Adds visual highlights to the specified squares.
 * (No changes needed in this function)
 */
function showHighlights(squares) {
    // ... (keep existing showHighlights function code) ...
    clearHighlights();
    const highlightGeometry = new THREE.PlaneGeometry(SQUARE_SIZE * 0.9, SQUARE_SIZE * 0.9);
    squares.forEach(sq => {
        const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        const pos = getPositionFromCoords(sq.row, sq.col);
        highlightMesh.position.set(pos.x, 0.02, pos.z);
        highlightMesh.rotation.x = -Math.PI / 2;
        highlightMesh.userData = { type: 'highlight', row: sq.row, col: sq.col };
        highlightGroup.add(highlightMesh);
    });
}

/**
 * Removes all highlight meshes from the scene.
 * (No changes needed in this function)
 */
function clearHighlights() {
    // ... (keep existing clearHighlights function code) ...
    highlightGroup.clear();
}


// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Raycasting ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * Performs raycasting to find intersected objects.
 * (No changes needed in this function)
 */
function getIntersects(event) {
    // ... (keep existing getIntersects function code) ...
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const objectsToIntersect = [...pieceGroup.children, ...boardGroup.children, ...highlightGroup.children];
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);
    const relevantIntersects = [];
    for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj && !obj.userData.type && obj.parent !== scene) {
            obj = obj.parent;
        }
        if (obj && obj.userData.type) {
             relevantIntersects.push({ ...intersect, object: obj });
             break;
        }
    }
    return relevantIntersects;
}


// --- Export Public Functions and Variables ---
export {
    init,
    addPieceToScene,
    clearPieces,
    getPositionFromCoords,
    getCoordsFromPosition,
    getIntersects,
    showHighlights,
    clearHighlights,
    movePieceMesh,
    removePieceMesh,
    getPieceMeshAt,
    BOARD_SIZE,
    SQUARE_SIZE,
    scene,
    camera,
    modelsLoaded
};
