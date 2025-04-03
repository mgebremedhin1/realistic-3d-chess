import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Keep commented out for now
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // Keep commented out for now

// --- Configuration ---
const BOARD_SIZE = 8;
const SQUARE_SIZE = 5; // Size of each square in world units
const BOARD_THICKNESS = 1;
// const PIECE_HEIGHT_SCALE = 1.5; // This might not be needed directly if setting heights in createPlaceholderPiece
const HIGHLIGHT_COLOR = 0x61dafb; // Color for valid move highlights

// --- Materials (Using MeshStandardMaterial for PBR properties) ---
const lightSquareMaterial = new THREE.MeshStandardMaterial({
    color: 0xe3dac9, // Light marble/maple
    metalness: 0.2,
    roughness: 0.3,
});

const darkSquareMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b5b3f, // Dark polished wood
    metalness: 0.2,
    roughness: 0.4,
});

// Materials for the pieces themselves
const whitePieceMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0, // Ivory/Light Polished Material
    metalness: 0.1,
    roughness: 0.2,
});

const blackPieceMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, // Dark Wood/Metallic
    metalness: 0.3,
    roughness: 0.4,
});

// Material for highlighting valid move squares
const highlightMaterial = new THREE.MeshStandardMaterial({
    color: HIGHLIGHT_COLOR,
    transparent: true,
    opacity: 0.4,
    roughness: 0.5,
    side: THREE.DoubleSide
});

// --- Scene Variables ---
let scene, camera, renderer, controls;
let boardGroup, pieceGroup, highlightGroup; // Groups to hold objects
// let environmentMap = null; // Placeholder for HDRI (keep commented out)

// --- Public Functions ---

/**
 * Initializes the entire Three.js scene.
 * @param {HTMLElement} container - The DOM element to attach the canvas to.
 */
function init(container) {
    // --- Basic Scene Setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34); // Match CSS background

    // --- Camera ---
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, SQUARE_SIZE * BOARD_SIZE * 0.6, SQUARE_SIZE * BOARD_SIZE * 0.6);
    camera.lookAt(0, 0, 0); // Look at the center of the board

    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true // Keep alpha if needed, though background color is set
       });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Main light source
    directionalLight.position.set(15, 30, 20); // Position high and angled
    directionalLight.castShadow = true; // Enable shadow casting
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    const shadowCamSize = SQUARE_SIZE * BOARD_SIZE * 0.6;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;
    directionalLight.shadow.bias = -0.001; // Adjust to prevent shadow artifacts
    scene.add(directionalLight);

    // --- Controls ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // Orbit around the board center
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = SQUARE_SIZE * 2;
    controls.maxDistance = SQUARE_SIZE * BOARD_SIZE * 1.5;
    controls.maxPolarAngle = Math.PI / 2.1; // Prevent looking from directly underneath

    // --- Groups for Organization ---
    boardGroup = new THREE.Group(); // For board squares and base
    pieceGroup = new THREE.Group(); // For all chess pieces
    highlightGroup = new THREE.Group(); // For move highlights
    scene.add(boardGroup);
    scene.add(pieceGroup);
    scene.add(highlightGroup);

    // --- Create Board ---
    createBoard();

    // --- Handle Window Resize ---
    window.addEventListener('resize', onWindowResize, false);

    // --- Start Animation Loop ---
    animate();

    console.log("Three.js scene initialized.");
}

/**
 * Creates the chessboard geometry (base and squares) and adds it to the scene.
 */
function createBoard() {
    // Board base
    const boardBaseGeometry = new THREE.BoxGeometry(BOARD_SIZE * SQUARE_SIZE, BOARD_THICKNESS, BOARD_SIZE * SQUARE_SIZE);
    const boardBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3e31, roughness: 0.8 }); // Simple wood color
    const boardBaseMesh = new THREE.Mesh(boardBaseGeometry, boardBaseMaterial);
    boardBaseMesh.position.y = -BOARD_THICKNESS / 2; // Position below squares
    boardBaseMesh.receiveShadow = true; // Base receives shadows
    boardGroup.add(boardBaseMesh);

    // Individual squares
    const squareGeometry = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const isLightSquare = (row + col) % 2 === 0;
            const squareMaterial = isLightSquare ? lightSquareMaterial : darkSquareMaterial;
            const squareMesh = new THREE.Mesh(squareGeometry, squareMaterial);

            // Position the square
            squareMesh.position.x = (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            squareMesh.position.z = (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            squareMesh.position.y = 0.01; // Slightly above base

            squareMesh.rotation.x = -Math.PI / 2; // Rotate flat
            squareMesh.receiveShadow = true; // Squares receive shadows

            // Add metadata for raycasting
            squareMesh.userData = { type: 'square', row: row, col: col };
            boardGroup.add(squareMesh);
        }
    }
    console.log("Chessboard created.");
}


// ==============================================================
// == NEW STYLIZED PIECE CREATION FUNCTION (Replaces the old one) ==
// ==============================================================
/**
 * Creates more detailed, stylized placeholder geometry for a chess piece using basic shapes.
 * This version uses THREE.Group to combine multiple meshes for each piece.
 * @param {string} type - Piece type (e.g., 'pawn', 'rook', 'knight', 'bishop', 'queen', 'king').
 * @param {string} color - 'white' or 'black'.
 * @returns {THREE.Group} A group containing the piece mesh(es).
 */
function createPlaceholderPiece(type, color) {
    // Get the appropriate material based on the piece color
    const material = color === 'white' ? whitePieceMaterial : blackPieceMaterial;
    // Create a Group to hold all parts of the piece. This group will be positioned on the board.
    const pieceGroupContainer = new THREE.Group();

    // Define standard dimensions - adjust these to change piece proportions
    const squareSizeRef = SQUARE_SIZE; // Use the global SQUARE_SIZE for reference
    const baseRadius = squareSizeRef * 0.35; // Slightly wider base
    const baseHeight = squareSizeRef * 0.15; // Short base cylinder height
    let bodyHeight, bodyRadius; // Variables for main body part

    // Common base cylinder for most pieces
    const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 24); // Smoother cylinder
    const baseMesh = new THREE.Mesh(baseGeo, material);
    baseMesh.position.y = baseHeight / 2; // Position base so bottom is at y=0
    pieceGroupContainer.add(baseMesh);

    // Create specific shapes based on piece type
    switch (type.toLowerCase()) {
        case 'pawn':
            bodyHeight = squareSizeRef * 0.5;
            bodyRadius = baseRadius * 0.8;
            const pawnBodyGeo = new THREE.CylinderGeometry(bodyRadius * 0.8, bodyRadius, bodyHeight, 16);
            const pawnHeadGeo = new THREE.SphereGeometry(bodyRadius, 16, 12);
            const pawnBodyMesh = new THREE.Mesh(pawnBodyGeo, material);
            const pawnHeadMesh = new THREE.Mesh(pawnHeadGeo, material);
            // Position body above the base
            pawnBodyMesh.position.y = baseHeight + bodyHeight / 2;
            // Position head above the body
            pawnHeadMesh.position.y = baseHeight + bodyHeight + bodyRadius * 0.8; // Adjust for sphere center
            pieceGroupContainer.add(pawnBodyMesh);
            pieceGroupContainer.add(pawnHeadMesh);
            break;

        case 'rook':
            bodyHeight = squareSizeRef * 0.8;
            bodyRadius = baseRadius * 0.9;
            const rookBodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 16);
            const rookBodyMesh = new THREE.Mesh(rookBodyGeo, material);
            rookBodyMesh.position.y = baseHeight + bodyHeight / 2; // Position body above base
            pieceGroupContainer.add(rookBodyMesh);
            // Create rook 'crown' (crenellations)
            const crownHeight = bodyHeight * 0.3;
            const crownOuterRadius = bodyRadius * 1.1;
            const crownInnerRadius = bodyRadius * 0.9;
            // Using a TubeGeometry for the crown walls might look better than Cylinder
            const crownGeo = new THREE.CylinderGeometry(crownOuterRadius, crownOuterRadius, crownHeight, 4, 1, false); // 4 segments, solid top/bottom
            const crownTopGeo = new THREE.RingGeometry(crownInnerRadius, crownOuterRadius, 8); // Top ring (optional, cylinder top might suffice)
            const crownMesh = new THREE.Mesh(crownGeo, material);
            // const crownTopMesh = new THREE.Mesh(crownTopGeo, material); // Keep it simpler for now
            crownMesh.position.y = baseHeight + bodyHeight - crownHeight / 2; // Position crown near top
            // crownTopMesh.position.y = baseHeight + bodyHeight; // Position ring on top
            // crownTopMesh.rotation.x = -Math.PI / 2; // Rotate ring flat
            pieceGroupContainer.add(crownMesh);
            // pieceGroupContainer.add(crownTopMesh); // Add if using RingGeometry top
            break;

        case 'knight':
            // Knight is tricky with basic shapes! This is a very abstract representation.
            bodyHeight = squareSizeRef * 0.7;
            bodyRadius = baseRadius * 0.8;
            const knightBodyGeo = new THREE.CylinderGeometry(bodyRadius * 0.8, bodyRadius, bodyHeight, 16);
            const knightBodyMesh = new THREE.Mesh(knightBodyGeo, material);
            knightBodyMesh.position.y = baseHeight + bodyHeight / 2;
            pieceGroupContainer.add(knightBodyMesh);
            // Abstract "head/snout" shape using a Box
            const headLength = bodyRadius * 2.5;
            const headHeight = bodyHeight * 0.6;
            const headWidth = bodyRadius * 1.2;
            const knightHeadGeo = new THREE.BoxGeometry(headLength, headHeight, headWidth);
            const knightHeadMesh = new THREE.Mesh(knightHeadGeo, material);
            // Position head leaning forward and up
            knightHeadMesh.position.set(headLength * 0.3, baseHeight + bodyHeight * 0.8, 0);
            knightHeadMesh.rotation.z = Math.PI / 6; // Angle the head up slightly
            pieceGroupContainer.add(knightHeadMesh);
            break;

        case 'bishop':
            bodyHeight = squareSizeRef * 1.0; // Taller
            bodyRadius = baseRadius * 0.7;
            const bishopBodyGeo = new THREE.ConeGeometry(bodyRadius, bodyHeight, 16); // Cone shape
            const bishopBodyMesh = new THREE.Mesh(bishopBodyGeo, material);
            bishopBodyMesh.position.y = baseHeight + bodyHeight / 2;
            pieceGroupContainer.add(bishopBodyMesh);
            // Top sphere
            const bishopHeadRadius = bodyRadius * 0.6;
            const bishopHeadGeo = new THREE.SphereGeometry(bishopHeadRadius, 16, 12);
            const bishopHeadMesh = new THREE.Mesh(bishopHeadGeo, material);
            bishopHeadMesh.position.y = baseHeight + bodyHeight + bishopHeadRadius * 0.5; // Position sphere on top
            pieceGroupContainer.add(bishopHeadMesh);
            break;

        case 'queen':
            bodyHeight = squareSizeRef * 1.2; // Tallest non-king
            bodyRadius = baseRadius * 0.9;
            const queenBodyGeo = new THREE.CylinderGeometry(bodyRadius * 0.7, bodyRadius, bodyHeight, 16); // Tapered body
            const queenBodyMesh = new THREE.Mesh(queenBodyGeo, material);
            queenBodyMesh.position.y = baseHeight + bodyHeight / 2;
            pieceGroupContainer.add(queenBodyMesh);
            // Crown base sphere
            const queenHeadRadius = bodyRadius * 0.7;
            const queenHeadGeo = new THREE.SphereGeometry(queenHeadRadius, 16, 12);
            const queenHeadMesh = new THREE.Mesh(queenHeadGeo, material);
            queenHeadMesh.position.y = baseHeight + bodyHeight + queenHeadRadius * 0.5;
            pieceGroupContainer.add(queenHeadMesh);
            // Small spike/jewel on top
            const jewelRadius = queenHeadRadius * 0.3;
            const jewelGeo = new THREE.SphereGeometry(jewelRadius, 8, 6);
            const jewelMesh = new THREE.Mesh(jewelGeo, material);
            jewelMesh.position.y = baseHeight + bodyHeight + queenHeadRadius * 1.0 + jewelRadius; // Position above head sphere
            pieceGroupContainer.add(jewelMesh);
            break;

        case 'king':
            bodyHeight = squareSizeRef * 1.4; // Tallest piece
            bodyRadius = baseRadius * 0.9;
            const kingBodyGeo = new THREE.CylinderGeometry(bodyRadius * 0.8, bodyRadius, bodyHeight, 16); // Slightly tapered
            const kingBodyMesh = new THREE.Mesh(kingBodyGeo, material);
            kingBodyMesh.position.y = baseHeight + bodyHeight / 2;
            pieceGroupContainer.add(kingBodyMesh);
            // Simple cross topper
            const crossHeight = bodyHeight * 0.25;
            const crossWidth = bodyRadius * 1.2;
            const crossThickness = crossWidth * 0.2;
            const crossVertGeo = new THREE.BoxGeometry(crossThickness, crossHeight, crossThickness);
            const crossHorzGeo = new THREE.BoxGeometry(crossWidth, crossThickness, crossThickness);
            const crossVertMesh = new THREE.Mesh(crossVertGeo, material);
            const crossHorzMesh = new THREE.Mesh(crossHorzGeo, material);
            const crossYPos = baseHeight + bodyHeight + crossHeight / 2; // Position cross above body
            crossVertMesh.position.y = crossYPos;
            crossHorzMesh.position.y = crossYPos + crossHeight * 0.1; // Position horizontal slightly higher on vertical
            pieceGroupContainer.add(crossVertMesh);
            pieceGroupContainer.add(crossHorzMesh);
            break;

        default:
            console.warn("Unknown piece type in createPlaceholderPiece:", type);
            // Fallback to a simple box if type is unknown
            const fallbackGeo = new THREE.BoxGeometry(baseRadius * 1.5, squareSizeRef, baseRadius * 1.5);
            const fallbackMesh = new THREE.Mesh(fallbackGeo, material);
            fallbackMesh.position.y = baseHeight + squareSizeRef / 2;
            pieceGroupContainer.add(fallbackMesh);
    }

    // Apply shadow casting to all meshes within the group
    pieceGroupContainer.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true; // Allow pieces to receive subtle shadows from each other
        }
    });

    // Add metadata to the group itself for raycasting identification
    // This userData is crucial for identifying the piece later when clicked
    pieceGroupContainer.userData = { type: 'piece', pieceType: type, color: color };

    return pieceGroupContainer; // Return the entire group
}
// ==============================================================
// == END OF NEW PIECE FUNCTION ==
// ==============================================================


/**
 * Adds a piece (as a Group created by createPlaceholderPiece) to the scene
 * at a specific board coordinate.
 * @param {string} type - Piece type (e.g., 'pawn').
 * @param {string} color - 'white' or 'black'.
 * @param {number} row - Board row (0-7).
 * @param {number} col - Board column (0-7).
 * @returns {THREE.Group} The created piece group.
 */
function addPieceToScene(type, color, row, col) {
    // Calls the NEW createPlaceholderPiece function
    const pieceMeshGroup = createPlaceholderPiece(type, color);
    const position = getPositionFromCoords(row, col);

    // Position the entire group so its base (defined within createPlaceholderPiece)
    // rests on the board (y=0).
    pieceMeshGroup.position.set(position.x, 0 , position.z);

    // Store board coordinates in the group's userData for later reference
    pieceMeshGroup.userData.row = row;
    pieceMeshGroup.userData.col = col;

    // Add the piece group to the main 'pieceGroup' container
    pieceGroup.add(pieceMeshGroup);
    return pieceMeshGroup;
}

/**
 * Removes all piece groups from the scene and disposes their geometry.
 */
function clearPieces() {
    // Iterate through all children (piece groups) in the pieceGroup
    while(pieceGroup.children.length > 0){
        const piece = pieceGroup.children[0];
        // Traverse within the piece group to dispose geometries
        piece.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                // We don't dispose shared materials here
            }
        });
        // Remove the piece group itself from the main pieceGroup
        pieceGroup.remove(piece);
    }
    // pieceGroup.clear(); // Alternative, but doesn't guarantee disposal
}

/**
 * Converts board coordinates (row, col) to 3D world position (center of the square).
 * @param {number} row - Board row (0-7).
 * @param {number} col - Board column (0-7).
 * @returns {THREE.Vector3} World position.
 */
function getPositionFromCoords(row, col) {
    return new THREE.Vector3(
        (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE,
        0, // Y position on the board plane (base of pieces)
        (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE
    );
}

/**
 * Converts 3D world position to board coordinates (row, col).
 * @param {THREE.Vector3} position - World position.
 * @returns {{row: number, col: number} | null} Board coordinates or null if off board.
 */
function getCoordsFromPosition(position) {
    const col = Math.floor(position.x / SQUARE_SIZE + BOARD_SIZE / 2);
    const row = Math.floor(position.z / SQUARE_SIZE + BOARD_SIZE / 2);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        return { row, col };
    }
    return null; // Position is outside the board
}


/**
 * Finds the piece group at the given board coordinates by checking userData.
 * @param {number} row
 * @param {number} col
 * @returns {THREE.Group | null} The piece group or null if not found.
 */
function getPieceMeshAt(row, col) {
    for (const piece of pieceGroup.children) {
        if (piece.userData.row === row && piece.userData.col === col) {
            return piece; // Return the group
        }
    }
    return null;
}


/**
 * Moves a piece group instantly to new board coordinates.
 * Updates the group's position and its stored userData.
 * @param {THREE.Group} pieceMeshGroup - The piece group to move.
 * @param {number} newRow - The target row.
 * @param {number} newCol - The target column.
 */
function movePieceMesh(pieceMeshGroup, newRow, newCol) {
    const targetPosition = getPositionFromCoords(newRow, newCol);
    // Set the group's position (meshes inside move with it)
    pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z); // Keep original Y
    // Update the stored board coordinates
    pieceMeshGroup.userData.row = newRow;
    pieceMeshGroup.userData.col = newCol;
}

/**
 * Removes a specific piece group from the scene and disposes its geometry.
 * @param {THREE.Group} pieceMeshGroup - The piece group to remove.
 */
function removePieceMesh(pieceMeshGroup) {
    if (pieceMeshGroup) {
        // Dispose geometries within the group first
        pieceMeshGroup.traverse((child) => {
             if (child instanceof THREE.Mesh) {
                 if (child.geometry) child.geometry.dispose();
             }
         });
        // Remove the group from the main pieceGroup container
        pieceGroup.remove(pieceMeshGroup);
    }
}


// --- Highlighting ---

/**
 * Adds visual highlights (semi-transparent planes) to the specified squares.
 * Clears any existing highlights first.
 * @param {Array<{row: number, col: number}>} squares - Array of coordinates to highlight.
 */
function showHighlights(squares) {
    clearHighlights(); // Clear previous highlights
    // Reusing geometry and material is efficient
    const highlightGeometry = new THREE.PlaneGeometry(SQUARE_SIZE * 0.9, SQUARE_SIZE * 0.9); // Slightly smaller than square

    squares.forEach(sq => {
        const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        const pos = getPositionFromCoords(sq.row, sq.col);
        highlightMesh.position.set(pos.x, 0.02, pos.z); // Slightly above board
        highlightMesh.rotation.x = -Math.PI / 2; // Lay flat
        highlightMesh.userData = { type: 'highlight', row: sq.row, col: sq.col }; // For potential clicks
        highlightGroup.add(highlightMesh);
    });
}

/**
 * Removes all highlight meshes from the scene.
 */
function clearHighlights() {
    // No need to dispose geometry/material if reused, just clear the group
    highlightGroup.clear();
}


// --- Animation Loop ---
/**
 * The main animation loop called every frame.
 * Updates controls and renders the scene.
 */
function animate() {
    requestAnimationFrame(animate); // Schedule next frame
    controls.update(); // Update orbit controls (for damping)
    renderer.render(scene, camera); // Render the scene
}

// --- Event Handlers ---
/**
 * Handles the window resize event.
 * Updates camera aspect ratio and renderer size.
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Raycasting (for clicking objects) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(); // Reusable vector for mouse coords

/**
 * Performs raycasting from the camera through the mouse position
 * to find intersected objects (pieces, squares, highlights).
 * @param {MouseEvent} event - The mouse event containing clientX/clientY.
 * @returns {THREE.Intersection[]} Array of intersections, filtered for relevant objects, sorted by distance.
 */
function getIntersects(event) {
    // Calculate normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera); // Update ray

    // Check for intersections with pieces, board squares, and highlights
    const objectsToIntersect = [...pieceGroup.children, ...boardGroup.children, ...highlightGroup.children];
    const intersects = raycaster.intersectObjects(objectsToIntersect, true); // Check recursively

    // Filter to find the primary object hit (piece group, square, or highlight mesh)
    const relevantIntersects = [];
    for (const intersect of intersects) {
        let obj = intersect.object;
        // Traverse up the hierarchy until we find an object with our custom 'type' in userData
        while (obj && !obj.userData.type && obj.parent !== scene) {
            obj = obj.parent;
        }
        if (obj && obj.userData.type) {
            // Store the intersection but associate it with the main parent object (e.g., the piece group)
             relevantIntersects.push({ ...intersect, object: obj });
             // Often, we only care about the closest object hit
             break;
        }
    }
    return relevantIntersects;
}


// --- Export Public Functions and Variables ---
// Make these available for import in main.js
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
    // Export constants if they might be useful elsewhere
    BOARD_SIZE,
    SQUARE_SIZE,
    // Export scene/camera only if needed for debugging or advanced features
    scene,
    camera
};
