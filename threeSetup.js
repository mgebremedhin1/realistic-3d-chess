import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// *** NEW: Import the GLTF Loader ***
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Configuration ---
const BOARD_SIZE = 8;
const SQUARE_SIZE = 5;
const BOARD_THICKNESS = 1;
const HIGHLIGHT_COLOR = 0x61dafb;
// *** NEW: Path to your model file ***
const CHESS_SET_MODEL_PATH = 'models/low_poly_chess_set (1).glb'; // Make sure this matches the uploaded path and filename EXACTLY

// --- Materials ---
// We might use materials from the GLB model later, but keep these for now
const lightSquareMaterial = new THREE.MeshStandardMaterial({ color: 0xe3dac9, metalness: 0.2, roughness: 0.3 });
const darkSquareMaterial = new THREE.MeshStandardMaterial({ color: 0x7b5b3f, metalness: 0.2, roughness: 0.4 });
const whitePieceMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.1, roughness: 0.2 });
const blackPieceMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.4 });
const highlightMaterial = new THREE.MeshStandardMaterial({ color: HIGHLIGHT_COLOR, transparent: true, opacity: 0.4, roughness: 0.5, side: THREE.DoubleSide });

// --- Scene Variables ---
let scene, camera, renderer, controls;
let boardGroup, pieceGroup, highlightGroup;
// *** NEW: Variable to store the loaded model data ***
let loadedChessSetModel = null;
let modelsLoaded = false; // Flag to track loading status

// --- NEW: Function to Load 3D Models ---
/**
 * Loads the GLB model file asynchronously.
 * @param {function} onLoadedCallback - Function to call once models are loaded.
 */
function loadModels(onLoadedCallback) {
    const loader = new GLTFLoader();
    console.log(`Attempting to load model from: ${CHESS_SET_MODEL_PATH}`);

    loader.load(
        // resource URL
        CHESS_SET_MODEL_PATH,
        // called when the resource is loaded
        function (gltf) {
            console.log("GLTF model loaded successfully:", gltf);
            loadedChessSetModel = gltf.scene; // Store the entire loaded scene

            // --- Basic Model Adjustments (Applied to the whole loaded scene) ---
            // This is often needed as models aren't always exported at the right scale or orientation.
            // We might need to adjust scale significantly later.
            // Example: Scale the whole set down if it's too big
            // loadedChessSetModel.scale.set(0.1, 0.1, 0.1);

            // Enable shadows for all meshes within the loaded model
            loadedChessSetModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Optional: You might need to adjust material properties here if they
                    // don't look right with your scene's lighting.
                    // e.g., child.material.metalness = 0.5;
                }
            });

            modelsLoaded = true; // Set the flag
            console.log("Models processed and ready.");
            if (onLoadedCallback) {
                onLoadedCallback(); // Signal that loading is complete
            }
        },
        // called while loading is progressing (optional)
        function (xhr) {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // called when loading has errors
        function (error) {
            console.error('An error happened during GLTF loading:', error);
            // Handle the error appropriately - maybe display a message to the user
            // or fall back to placeholder shapes.
            modelsLoaded = false; // Ensure flag indicates failure
        }
    );
}


// --- Public Functions ---

/**
 * Initializes the entire Three.js scene.
 * @param {HTMLElement} container - The DOM element to attach the canvas to.
 * @param {function} onReadyCallback - Function to call when scene AND models are ready.
 */
function init(container, onReadyCallback) { // Added callback parameter
    // Basic Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, SQUARE_SIZE * BOARD_SIZE * 0.6, SQUARE_SIZE * BOARD_SIZE * 0.6);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
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

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = SQUARE_SIZE * 1.5;
    controls.maxDistance = SQUARE_SIZE * BOARD_SIZE * 1.5;
    controls.maxPolarAngle = Math.PI / 2.05;

    // Groups for Organization
    boardGroup = new THREE.Group();
    pieceGroup = new THREE.Group();
    highlightGroup = new THREE.Group();
    scene.add(boardGroup);
    scene.add(pieceGroup);
    scene.add(highlightGroup);

    // Create Board
    createBoard();

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Start Animation Loop
    animate();

    console.log("Three.js scene initialized. Starting model load...");
    // *** NEW: Load models and call the callback when done ***
    loadModels(() => {
        console.log("Model loading complete callback received.");
        if (onReadyCallback) {
            onReadyCallback(); // Signal that everything is ready
        }
    });
}

/**
 * Creates the chessboard geometry (base and squares) and adds it to the scene.
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
// == UPDATED PIECE CREATION - USES LOADED MODEL ==
// ==============================================================
/**
 * Creates a chess piece by cloning the pre-loaded GLB model scene.
 * TEMPORARY: Uses the whole scene for all pieces. Needs refinement later.
 * @param {string} type - Piece type (currently ignored).
 * @param {string} color - 'white' or 'black'.
 * @returns {THREE.Group | null} A group containing the cloned model, or null if models not loaded.
 */
function createPlaceholderPiece(type, color) {
    // Check if the model has finished loading
    if (!modelsLoaded || !loadedChessSetModel) {
        console.error("Attempted to create piece before model loaded!");
        // Return a very basic fallback or null
        const fallbackGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2);
        const fallbackMesh = new THREE.Mesh(fallbackGeo, color === 'white' ? whitePieceMaterial : blackPieceMaterial);
        const fallbackGroup = new THREE.Group();
        fallbackGroup.add(fallbackMesh);
        fallbackGroup.userData = { type: 'piece', pieceType: 'fallback', color: color };
        return fallbackGroup; // Return fallback
        // return null; // Or return null and handle it in addPieceToScene
    }

    // --- Clone the loaded model scene ---
    // .clone() creates a deep copy of the model scene
    const pieceModel = loadedChessSetModel.clone();

    // --- Apply Color / Material ---
    // We need to apply the correct color. This depends on how the model
    // was exported. It might have its own materials, or we might need to
    // override them.
    const targetMaterial = color === 'white' ? whitePieceMaterial : blackPieceMaterial;
    pieceModel.traverse((child) => {
        if (child.isMesh) {
            // Option 1: Assign our material (simpler, overrides model's materials)
            child.material = targetMaterial;

            // Option 2: Modify existing material (if you want to keep model's textures etc.)
            // if (child.material) {
            //     child.material.color.set(targetMaterial.color); // Just change color
            //     // Adjust other properties if needed
            //     child.material.metalness = targetMaterial.metalness;
            //     child.material.roughness = targetMaterial.roughness;
            // }

            // Ensure shadows are enabled on the clone too
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // --- Adjust Scale and Position (NEEDS TWEAKING) ---
    // Models rarely import at the perfect size or position relative to the board square.
    // You WILL likely need to adjust scale and potentially position.y here.
    // Find the right scale by trial and error after you see it load the first time.
    const desiredHeightApprox = SQUARE_SIZE * 1.0; // Target height (adjust as needed)

    // Calculate bounding box to help with scaling (optional but good practice)
    const box = new THREE.Box3().setFromObject(pieceModel);
    const size = box.getSize(new THREE.Vector3());
    const scaleFactor = desiredHeightApprox / size.y; // Scale based on height

    // Apply scale uniformly or non-uniformly
    // pieceModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
    pieceModel.scale.set(3, 3, 3); // START WITH A GUESS - Adjust this value!

    // Reposition based on the model's origin (if needed)
    // If the model's base isn't at y=0, you might need to adjust its y position.
    // pieceModel.position.y = -box.min.y * scaleFactor; // Try to align base with y=0

    // --- Add Metadata ---
    // Store piece type and color for interaction logic
    // IMPORTANT: Even though we display the whole set now, store the INTENDED type
    pieceModel.userData = { type: 'piece', pieceType: type, color: color };

    // Return the cloned and adjusted model group
    return pieceModel;
}
// ==============================================================
// == END OF UPDATED PIECE FUNCTION ==
// ==============================================================


/**
 * Adds a piece to the scene at a specific board coordinate.
 * Now calls the updated createPlaceholderPiece which clones the loaded model.
 * @param {string} type - Piece type (e.g., 'pawn').
 * @param {string} color - 'white' or 'black'.
 * @param {number} row - Board row (0-7).
 * @param {number} col - Board column (0-7).
 * @returns {THREE.Group | null} The created piece group or null if creation failed.
 */
function addPieceToScene(type, color, row, col) {
    // Calls the NEW createPlaceholderPiece function which uses the loaded model
    const pieceMeshGroup = createPlaceholderPiece(type, color);

    if (!pieceMeshGroup) {
        console.error(`Failed to create piece ${type} at [${row}, ${col}] (model likely not loaded yet).`);
        return null; // Indicate failure
    }

    const position = getPositionFromCoords(row, col);

    // Position the entire group. The internal adjustments (scale, relative y)
    // happen inside createPlaceholderPiece. The base should align with y=0 here.
    pieceMeshGroup.position.set(position.x, 0, position.z); // Place base at square center y=0

    // Store board coordinates in the group's userData for later reference
    pieceMeshGroup.userData.row = row;
    pieceMeshGroup.userData.col = col;

    // Add the piece group to the main 'pieceGroup' container
    pieceGroup.add(pieceMeshGroup);
    return pieceMeshGroup;
}

/**
 * Removes all piece groups from the scene and disposes their geometry/materials.
 * (No changes needed in this function)
 */
function clearPieces() {
    // ... (keep existing clearPieces function code) ...
    while(pieceGroup.children.length > 0){
        const piece = pieceGroup.children[0];
        piece.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                // Only dispose material if it's not shared
                // if (child.material) {
                //     if (Array.isArray(child.material)) {
                //         child.material.forEach(mat => mat.dispose());
                //     } else {
                //         child.material.dispose();
                //     }
                // }
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
        0, // Y position on the board plane (base of pieces)
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
            return piece; // Return the group
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
    pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z); // Keep original Y
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
    init, // Modified to accept a callback
    addPieceToScene, // Uses loaded model now
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
    modelsLoaded // *** NEW: Export the loading status flag ***
};
