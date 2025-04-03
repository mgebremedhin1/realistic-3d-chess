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
const whitePieceMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.1, roughness: 0.2, name: 'whiteMat' }); // Added names for debugging
const blackPieceMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.4, name: 'blackMat' }); // Added names for debugging
const highlightMaterial = new THREE.MeshStandardMaterial({ color: HIGHLIGHT_COLOR, transparent: true, opacity: 0.4, roughness: 0.5, side: THREE.DoubleSide });

// --- Scene Variables ---
let scene, camera, renderer, controls;
let boardGroup, pieceGroup, highlightGroup;
// *** NEW: Object to store references to individual piece meshes ***
let pieceMeshReferences = {
    pawn: null,
    rook: null,
    knight: null,
    bishop: null,
    queen: null,
    king: null
};
let modelsLoaded = false; // Flag to track loading status

// --- Function to Load 3D Models ---
/**
 * Loads the GLB model file asynchronously and stores references to named piece meshes.
 * @param {function} onLoadedCallback - Function to call once models are loaded and processed.
 */
function loadModels(onLoadedCallback) {
    const loader = new GLTFLoader();
    console.log(`Attempting to load model from: ${CHESS_SET_MODEL_PATH}`);

    loader.load(
        CHESS_SET_MODEL_PATH,
        function (gltf) {
            console.log("GLTF model loaded successfully.");
            const loadedScene = gltf.scene;

            // Enable shadows for all meshes within the loaded model *once*
            loadedScene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // *** NEW: Find and store references to named piece meshes ***
            console.log("--- Finding individual piece meshes by name ---");
            // Map our standard type names to the names found in the GLB console logs
            const nameMap = {
                pawn: 'Pawn_0',
                rook: 'Rook_0',
                knight: 'Knight_0',
                bishop: 'Bishop_0',
                queen: 'Queen_0',
                king: 'King_0'
            };

            let allFound = true;
            for (const type in nameMap) {
                const meshName = nameMap[type];
                // Find the object within the loaded scene by its specific name
                const foundMesh = loadedScene.getObjectByName(meshName);

                if (foundMesh && foundMesh.isMesh) {
                    // Store the original mesh itself as the template reference
                    // We will clone this reference later when creating pieces
                    pieceMeshReferences[type] = foundMesh;
                    console.log(`Stored reference for '${type}' using mesh named '${meshName}'`);
                    // Optional: Make the original template invisible if it's part of the added scene
                    // foundMesh.visible = false;
                } else {
                    console.error(`Could not find mesh named '${meshName}' for piece type '${type}'! Check GLB structure and names.`);
                    allFound = false;
                    // Handle error - maybe fall back to placeholders? For now, we'll proceed but pieces might be missing.
                }
            }

            if (allFound) {
                console.log("--- Successfully stored references for all piece types ---");
                modelsLoaded = true;
            } else {
                console.error("--- Failed to find all required piece meshes! Check console errors. ---");
                modelsLoaded = false; // Indicate failure
            }

            // We don't need to add the original loadedChessSetModel (gltf.scene) to our main scene
            // because we will be adding clones of the individual pieces instead.

            console.log("Model processing complete.");
            if (onLoadedCallback) {
                onLoadedCallback(); // Signal that processing is done (successfully or not)
            }
        },
        undefined, // Optional progress callback
        function (error) {
            console.error('An error happened during GLTF loading:', error);
            modelsLoaded = false;
            if (onLoadedCallback) {
                onLoadedCallback(); // Still callback, but modelsLoaded will be false
            }
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
    // (Same as before)
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
// == PIECE CREATION - NOW CLONES INDIVIDUAL MESHES ==
// ==============================================================
/**
 * Creates a chess piece by finding the correct template mesh from the
 * pre-loaded references, cloning it, scaling it, and positioning it.
 * @param {string} type - Piece type ('pawn', 'rook', 'knight', 'bishop', 'queen', 'king').
 * @param {string} color - 'white' or 'black'.
 * @returns {THREE.Group | null} A group containing the piece mesh, or null if loading failed or mesh not found.
 */
function createPlaceholderPiece(type, color) {
    if (!modelsLoaded) {
        console.error(`Attempted to create piece type '${type}' before models finished loading or failed.`);
        // Return fallback box
        const fallbackGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2);
        const fallbackMesh = new THREE.Mesh(fallbackGeo, color === 'white' ? whitePieceMaterial : blackPieceMaterial);
        const fallbackGroup = new THREE.Group(); fallbackGroup.add(fallbackMesh); fallbackGroup.userData = { type: 'piece', pieceType: 'fallback', color: color }; return fallbackGroup;
    }

    // *** NEW: Get the template mesh based on the piece type ***
    const templateMesh = pieceMeshReferences[type.toLowerCase()]; // Use lowercase type name

    if (!templateMesh) {
        console.error(`No mesh reference found for piece type '${type}'! Was it named correctly in the GLB and found during loading?`);
        // Return fallback box
        const fallbackGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.3, SQUARE_SIZE * 0.7, SQUARE_SIZE * 0.3); // Slightly bigger fallback
        const fallbackMesh = new THREE.Mesh(fallbackGeo, color === 'white' ? whitePieceMaterial : blackPieceMaterial);
        const fallbackGroup = new THREE.Group(); fallbackGroup.add(fallbackMesh); fallbackGroup.userData = { type: 'piece', pieceType: 'fallback_missing', color: color }; return fallbackGroup;
    }

    // --- Clone the specific template mesh ---
    const pieceMesh = templateMesh.clone();

    // --- Apply Correct Material ---
    // Note: .clone() might share geometry but create a new material instance based on the original.
    // It's safest to explicitly assign our desired material.
    pieceMesh.material = color === 'white' ? whitePieceMaterial : blackPieceMaterial;

    // Ensure shadows are set on the clone
    pieceMesh.castShadow = true;
    pieceMesh.receiveShadow = true;

    // --- Auto Scaling Logic (Applied to the individual piece clone) ---
    const desiredHeightApprox = SQUARE_SIZE * 0.9; // Adjust if needed per piece type later
    const box = new THREE.Box3().setFromObject(pieceMesh); // Use the clone before scaling
    const size = box.getSize(new THREE.Vector3());
    let scaleFactor = 1.0;
    if (size.y > 0.001) {
         scaleFactor = desiredHeightApprox / size.y;
    } else {
         console.warn(`Mesh for ${type} has zero height, using default scale.`);
    }
    pieceMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // --- Auto Positioning Logic (Place base at y=0 relative to the group) ---
    const scaledBox = new THREE.Box3().setFromObject(pieceMesh);
    pieceMesh.position.y = -scaledBox.min.y; // Shift mesh up so its bottom is at y=0

    // --- Create a Group for the Piece ---
    // It's good practice to put each piece mesh inside its own group.
    // This makes positioning/rotating the piece as a whole easier later.
    // The group's origin will be placed at the center of the board square (x, 0, z).
    const pieceGroupContainer = new THREE.Group();
    pieceGroupContainer.add(pieceMesh); // Add the adjusted mesh to the group

    // --- Add Metadata to the GROUP ---
    // Interaction logic will likely hit the mesh, but we want to identify the piece group.
    pieceGroupContainer.userData = { type: 'piece', pieceType: type, color: color };
    // Also add it to the mesh for easier access if the raycaster hits the mesh directly
    pieceMesh.userData = { type: 'piece', pieceType: type, color: color, parentGroup: pieceGroupContainer };


    return pieceGroupContainer; // Return the GROUP containing the mesh
}
// ==============================================================
// == END OF UPDATED PIECE FUNCTION ==
// ==============================================================


/**
 * Adds a piece to the scene at a specific board coordinate.
 * (No changes needed in this function - it already returns the group)
 */
function addPieceToScene(type, color, row, col) {
    // Calls the NEW createPlaceholderPiece function which returns a Group
    const pieceGroupContainer = createPlaceholderPiece(type, color); // Now gets the Group
    if (!pieceGroupContainer) {
        console.error(`Failed to create piece group ${type} at [${row}, ${col}]`);
        return null;
    }
    const position = getPositionFromCoords(row, col);
    // Position the GROUP at the center of the square, y=0
    pieceGroupContainer.position.set(position.x, 0, position.z);
    // Store board coordinates in the GROUP's userData
    pieceGroupContainer.userData.row = row;
    pieceGroupContainer.userData.col = col;
    // Add the GROUP to the main pieceGroup container
    pieceGroup.add(pieceGroupContainer);
    return pieceGroupContainer; // Return the group
}

// --- Other Functions (clearPieces, getPositionFromCoords, etc.) ---
// (Keep all remaining functions the same as the previous version)
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
     for (const piece of pieceGroup.children) { // piece is now the Group container
        if (piece.userData.row === row && piece.userData.col === col) {
            return piece; // Return the group
        }
    }
    return null;
}
// ... (movePieceMesh function) ...
function movePieceMesh(pieceMeshGroup, newRow, newCol) { // pieceMeshGroup is the Group
    const targetPosition = getPositionFromCoords(newRow, newCol);
    // Move the entire group
    pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z); // Keep original Y of the group
    pieceMeshGroup.userData.row = newRow;
    pieceMeshGroup.userData.col = newCol;
}
// ... (removePieceMesh function) ...
function removePieceMesh(pieceMeshGroup) { // pieceMeshGroup is the Group
      if (pieceMeshGroup) {
        // Traverse the group to dispose geometry of the mesh inside
        pieceMeshGroup.traverse((child) => {
             if (child instanceof THREE.Mesh) {
                 if (child.geometry) child.geometry.dispose();
             }
         });
        // Remove the group from the main pieceGroup
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
    const intersects = raycaster.intersectObjects(objectsToIntersect, true); // recursive: true is important!

    const relevantIntersects = [];
    for (const intersect of intersects) {
        let obj = intersect.object;
        // Traverse up to find the object with our 'type' userData, which should be the piece GROUP
        while (obj && (!obj.userData || !obj.userData.type) && obj.parent !== scene) {
            obj = obj.parent;
        }
        // Only add if we found an object with the type property and haven't added it yet
        if (obj && obj.userData.type && !relevantIntersects.some(ri => ri.object === obj)) {
             relevantIntersects.push({ ...intersect, object: obj }); // Associate intersection with the group
             // Don't break here if highlights might be on top of pieces - depends on desired behavior
        }
    }
    // Sort intersects by distance, closest first (optional but good practice)
    relevantIntersects.sort((a, b) => a.distance - b.distance);

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
