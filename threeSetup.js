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
            console.log("GLTF model loaded successfully. Scene object:", gltf.scene);
            loadedChessSetModel = gltf.scene; // Store the entire loaded scene

            // Enable shadows for all meshes within the loaded model *once*
            loadedChessSetModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // *** NEW: Log the names of objects within the loaded scene ***
            // This helps us identify how to select individual pieces later.
            console.log("--- Traversing loaded model scene to find object names ---");
            loadedChessSetModel.traverse((child) => {
                // Log meshes and groups, as pieces might be either
                if (child.isMesh || child.isGroup) {
                    // Log the object's name and the object itself for inspection in the console
                    console.log(`Found object: Name='${child.name}', Type='${child.type}'`, child);
                }
            });
            console.log("--- Finished traversing scene ---");
            // *** END OF NEW LOGGING CODE ***

            modelsLoaded = true;
            console.log("Models processed and ready.");
            if (onLoadedCallback) {
                onLoadedCallback();
            }
        },
        undefined, // Optional progress callback
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
// == PIECE CREATION - Still uses whole scene for now ==
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
    // (Code is the same as the previous version - three_setup_adjust_scale_full)
    // (It still clones the whole scene, applies material, scales, and positions)
    // ... (keep existing createPlaceholderPiece function code from previous step) ...
     if (!modelsLoaded || !loadedChessSetModel) {
        console.error("Attempted to create piece before model loaded!");
        const fallbackGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2);
        const fallbackMesh = new THREE.Mesh(fallbackGeo, color === 'white' ? whitePieceMaterial : blackPieceMaterial);
        const fallbackGroup = new THREE.Group();
        fallbackGroup.add(fallbackMesh);
        fallbackGroup.userData = { type: 'piece', pieceType: 'fallback', color: color };
        return fallbackGroup;
    }

    const pieceModel = loadedChessSetModel.clone();
    const targetMaterial = color === 'white' ? whitePieceMaterial : blackPieceMaterial;

    pieceModel.traverse((child) => {
        if (child.isMesh) {
            child.material = targetMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    const desiredHeightApprox = SQUARE_SIZE * 0.9;
    const box = new THREE.Box3().setFromObject(pieceModel);
    const size = box.getSize(new THREE.Vector3());
    let scaleFactor = 1.0;
    if (size.y > 0.001) {
         scaleFactor = desiredHeightApprox / size.y;
         // console.log(`Calculated scale factor for ${type}: ${scaleFactor} (Original height: ${size.y})`); // Keep console log minimal for now
    } else {
         console.warn(`Model for ${type} has zero height, using default scale.`);
    }
    pieceModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const scaledBox = new THREE.Box3().setFromObject(pieceModel);
    pieceModel.position.y = -scaledBox.min.y;

    pieceModel.userData = { type: 'piece', pieceType: type, color: color };

    return pieceModel;
}
// ==============================================================
// == END OF PIECE FUNCTION ==
// ==============================================================


// --- Other Functions (addPieceToScene, clearPieces, etc.) ---
// (Keep all remaining functions the same as the previous version - three_setup_adjust_scale_full)
// ... (addPieceToScene function) ...
function addPieceToScene(type, color, row, col) {
    const pieceMeshGroup = createPlaceholderPiece(type, color);
    if (!pieceMeshGroup) {
        console.error(`Failed to create piece ${type} at [${row}, ${col}]`);
        return null;
    }
    const position = getPositionFromCoords(row, col);
    pieceMeshGroup.position.set(position.x, 0, position.z);
    pieceMeshGroup.userData.row = row;
    pieceMeshGroup.userData.col = col;
    pieceGroup.add(pieceMeshGroup);
    return pieceMeshGroup;
}
// ... (clearPieces function) ...
function clearPieces() {
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
// ... (getPositionFromCoords function) ...
function getPositionFromCoords(row, col) {
     return new THREE.Vector3(
        (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE,
        0,
        (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE
    );
}
// ... (getCoordsFromPosition function) ...
function getCoordsFromPosition(position) {
    const col = Math.floor(position.x / SQUARE_SIZE + BOARD_SIZE / 2);
    const row = Math.floor(position.z / SQUARE_SIZE + BOARD_SIZE / 2);
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        return { row, col };
    }
    return null;
}
// ... (getPieceMeshAt function) ...
function getPieceMeshAt(row, col) {
     for (const piece of pieceGroup.children) {
        if (piece.userData.row === row && piece.userData.col === col) {
            return piece;
        }
    }
    return null;
}
// ... (movePieceMesh function) ...
function movePieceMesh(pieceMeshGroup, newRow, newCol) {
    const targetPosition = getPositionFromCoords(newRow, newCol);
    pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z);
    pieceMeshGroup.userData.row = newRow;
    pieceMeshGroup.userData.col = newCol;
}
// ... (removePieceMesh function) ...
function removePieceMesh(pieceMeshGroup) {
      if (pieceMeshGroup) {
        pieceMeshGroup.traverse((child) => {
             if (child instanceof THREE.Mesh) {
                 if (child.geometry) child.geometry.dispose();
             }
         });
        pieceGroup.remove(pieceMeshGroup);
    }
}
// ... (showHighlights function) ...
function showHighlights(squares) {
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
// ... (clearHighlights function) ...
function clearHighlights() {
    highlightGroup.clear();
}
// ... (animate function) ...
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
// ... (onWindowResize function) ...
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
// ... (getIntersects function) ...
function getIntersects(event) {
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
