import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // If/when using GLTF models
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // For HDRI environment maps

// --- Configuration ---
const BOARD_SIZE = 8;
const SQUARE_SIZE = 5; // Size of each square in world units
const BOARD_THICKNESS = 1;
const PIECE_HEIGHT_SCALE = 1.5; // How much taller pieces are than square size (approximate factor)
const HIGHLIGHT_COLOR = 0x61dafb; // Color for valid move highlights

// --- Materials (Suggesting Realism) ---
// Using MeshStandardMaterial for PBR properties
const lightSquareMaterial = new THREE.MeshStandardMaterial({
    color: 0xe3dac9, // Light marble/maple
    metalness: 0.2, // Low metalness for non-metals
    roughness: 0.3, // Somewhat smooth
});

const darkSquareMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b5b3f, // Dark polished wood
    metalness: 0.2,
    roughness: 0.4, // Slightly rougher than light squares
});

const whitePieceMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0, // Ivory/Light Polished Material
    metalness: 0.1, // Very low metalness
    roughness: 0.2, // Quite smooth
    // envMap: environmentMap, // Add later for reflections
    // envMapIntensity: 0.5
});

const blackPieceMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, // Dark Wood/Metallic (adjust metalness/roughness for desired look)
    metalness: 0.3, // Can increase for more metallic look
    roughness: 0.4, // Can decrease for more polished look
    // envMap: environmentMap, // Add later for reflections
    // envMapIntensity: 0.5
});

const highlightMaterial = new THREE.MeshStandardMaterial({
    color: HIGHLIGHT_COLOR,
    transparent: true,
    opacity: 0.4, // Semi-transparent highlight
    roughness: 0.5,
    side: THREE.DoubleSide // Ensure visibility from below if needed
});

// --- Scene Variables ---
let scene, camera, renderer, controls;
let boardGroup, pieceGroup, highlightGroup; // Groups to hold objects
let environmentMap = null; // Placeholder for HDRI

// --- Public Functions ---

/**
 * Initializes the entire Three.js scene.
 * @param {HTMLElement} container - The DOM element to attach the canvas to.
 */
function init(container) {
    // --- Basic Scene Setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34); // Match CSS background
    // scene.fog = new THREE.Fog(0x282c34, SQUARE_SIZE * BOARD_SIZE * 0.8, SQUARE_SIZE * BOARD_SIZE * 2); // Optional subtle fog

    // --- Camera ---
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    // Position camera to look down at the board from a typical angle
    camera.position.set(0, SQUARE_SIZE * BOARD_SIZE * 0.6, SQUARE_SIZE * BOARD_SIZE * 0.6);
    camera.lookAt(0, 0, 0); // Look at the center of the board (origin)

    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({
        antialias: true, // Enable anti-aliasing for smoother edges
        alpha: true // Allow transparency if needed (usually not for full background)
     });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Use device's pixel ratio for sharpness
    // Configure for realistic shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows (good balance)
    // Optional: Tone mapping for more realistic light response
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // --- Lighting (Realistic Setup) ---
    // Ambient light provides overall base illumination and color
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light, adjust intensity
    scene.add(ambientLight);

    // Directional light simulates a primary light source like the sun or a lamp
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Brighter white light
    directionalLight.position.set(15, 30, 20); // Positioned high and angled
    directionalLight.castShadow = true; // Enable shadow casting for this light
    // Configure shadow properties for quality vs performance
    directionalLight.shadow.mapSize.width = 2048; // Higher resolution shadows
    directionalLight.shadow.mapSize.height = 2048;
    // Adjust the shadow camera frustum to tightly contain the board area
    const shadowCamSize = SQUARE_SIZE * BOARD_SIZE * 0.6;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100; // Adjust based on scene scale
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;
    directionalLight.shadow.bias = -0.001; // Fine-tune to prevent shadow acne/striping
    // directionalLight.shadow.radius = 1; // Soften shadow edges (PCFSoftShadowMap helps too)
    scene.add(directionalLight);
    // scene.add(directionalLight.target); // Target defaults to (0,0,0)

    // Optional: Add point lights or spotlights for extra effect or fill light
    // const pointLight = new THREE.PointLight(0xffaa88, 0.5, 100, 1.5); // Warm fill light
    // pointLight.position.set(-10, 5, -10);
    // scene.add(pointLight);

    // Optional: Helpers for debugging light positions and shadows
    // const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(dirLightHelper);
    // const shadowCamHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowCamHelper);


    // --- Controls ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // Ensure controls orbit around the board center
    controls.enableDamping = true; // Creates a smoother, decelerating rotation effect
    controls.dampingFactor = 0.05; // How quickly the damping effect fades
    controls.screenSpacePanning = false; // Prevent panning in screen space (usually better for 3D scenes)
    controls.minDistance = SQUARE_SIZE * 2; // Prevent zooming too close
    controls.maxDistance = SQUARE_SIZE * BOARD_SIZE * 1.5; // Prevent zooming too far
    controls.maxPolarAngle = Math.PI / 2.1; // Limit vertical rotation to prevent looking from below the board

    // --- Groups for Organization ---
    boardGroup = new THREE.Group(); // Holds the board base and squares
    pieceGroup = new THREE.Group(); // Holds all the chess pieces
    highlightGroup = new THREE.Group(); // Holds the move highlight meshes
    scene.add(boardGroup);
    scene.add(pieceGroup);
    scene.add(highlightGroup);

    // --- Create Board ---
    createBoard();

    // --- Load Environment Map (Optional but recommended for realism) ---
    // loadEnvironmentMap('path/to/your/hdri.hdr'); // Example call

    // --- Handle Window Resize ---
    window.addEventListener('resize', onWindowResize, false);

    // --- Start Animation Loop ---
    animate(); // Start rendering frames

    console.log("Three.js scene initialized.");
}

/**
 * Creates the chessboard geometry and adds it to the scene.
 */
function createBoard() {
    // Create the base of the board (slightly thicker)
    const boardBaseGeometry = new THREE.BoxGeometry(
        BOARD_SIZE * SQUARE_SIZE,
        BOARD_THICKNESS,
        BOARD_SIZE * SQUARE_SIZE
    );
    // Simple brown material for the base/sides
    const boardBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3e31, roughness: 0.8 });
    const boardBaseMesh = new THREE.Mesh(boardBaseGeometry, boardBaseMaterial);
    boardBaseMesh.position.y = -BOARD_THICKNESS / 2; // Position base slightly below y=0 plane
    boardBaseMesh.receiveShadow = true; // The board base should receive shadows from pieces
    boardGroup.add(boardBaseMesh);


    // Create individual squares on top of the base
    const squareGeometry = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const isLightSquare = (row + col) % 2 === 0;
            const squareMaterial = isLightSquare ? lightSquareMaterial : darkSquareMaterial;
            const squareMesh = new THREE.Mesh(squareGeometry, squareMaterial);

            // Position the square correctly in the grid
            // Calculate center position of the square
            squareMesh.position.x = (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            squareMesh.position.z = (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            squareMesh.position.y = 0.01; // Place slightly above the base to avoid z-fighting

            // Rotate the plane to lie flat on the XZ plane
            squareMesh.rotation.x = -Math.PI / 2;

            squareMesh.receiveShadow = true; // Squares also receive shadows

            // Add metadata for raycasting identification (which square is it?)
            squareMesh.userData = { type: 'square', row: row, col: col };

            boardGroup.add(squareMesh);
        }
    }
    console.log("Chessboard created.");
}

/**
 * Creates placeholder geometry for a chess piece. More detailed than before.
 * @param {string} type - Piece type (e.g., 'pawn', 'rook', 'knight', 'bishop', 'queen', 'king').
 * @param {string} color - 'white' or 'black'.
 * @returns {THREE.Group} A group containing the piece mesh(es). Using Group allows easier handling of complex pieces.
 */
function createPlaceholderPiece(type, color) {
    const material = color === 'white' ? whitePieceMaterial : blackPieceMaterial;
    const pieceGroupContainer = new THREE.Group(); // Use a group for each piece

    let baseRadius = SQUARE_SIZE * 0.3;
    let height = SQUARE_SIZE * PIECE_HEIGHT_SCALE * 0.6; // Base height factor

    // Simple placeholder shapes using BufferGeometry for potential efficiency
    switch (type.toLowerCase()) {
        case 'pawn':
            height *= 0.8;
            const pawnGeo = new THREE.CylinderGeometry(baseRadius * 0.6, baseRadius * 0.8, height, 16);
            const pawnTopGeo = new THREE.SphereGeometry(baseRadius * 0.6, 16, 8);
            const pawnMesh = new THREE.Mesh(pawnGeo, material);
            const pawnTopMesh = new THREE.Mesh(pawnTopGeo, material);
            pawnTopMesh.position.y = height / 2;
            pieceGroupContainer.add(pawnMesh);
            pieceGroupContainer.add(pawnTopMesh);
            break;
        case 'rook':
            const rookBaseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, height, 16);
            const rookTopGeo = new THREE.BoxGeometry(baseRadius * 2.2, height * 0.3, baseRadius * 2.2); // Wider top
            const rookBaseMesh = new THREE.Mesh(rookBaseGeo, material);
            const rookTopMesh = new THREE.Mesh(rookTopGeo, material);
            rookTopMesh.position.y = height / 2; // Position top part
            // Simple crenellations (cutouts) - could use CSG/Boolean operations for real models
            pieceGroupContainer.add(rookBaseMesh);
            pieceGroupContainer.add(rookTopMesh);
            break;
        case 'knight':
             // Complex shape - using a combination as placeholder
            height *= 1.1;
            const knightBaseGeo = new THREE.CylinderGeometry(baseRadius * 0.9, baseRadius * 0.7, height * 0.8, 16);
            const knightHeadGeo = new THREE.BoxGeometry(baseRadius * 1.5, height * 0.6, baseRadius * 0.9); // "Head" part
            const knightBaseMesh = new THREE.Mesh(knightBaseGeo, material);
            const knightHeadMesh = new THREE.Mesh(knightHeadGeo, material);
            knightHeadMesh.position.y = height * 0.4; // Position head higher
            knightHeadMesh.rotation.y = Math.PI / 6; // Slight angle
            pieceGroupContainer.add(knightBaseMesh);
            pieceGroupContainer.add(knightHeadMesh);
            break;
        case 'bishop':
            height *= 1.2;
            const bishopBaseGeo = new THREE.ConeGeometry(baseRadius, height, 16);
            const bishopTopGeo = new THREE.SphereGeometry(baseRadius * 0.4, 16, 8); // Small ball top
            const bishopBaseMesh = new THREE.Mesh(bishopBaseGeo, material);
            const bishopTopMesh = new THREE.Mesh(bishopTopGeo, material);
            bishopTopMesh.position.y = height / 2 + baseRadius * 0.3; // Position top ball
            pieceGroupContainer.add(bishopBaseMesh);
            pieceGroupContainer.add(bishopTopMesh);
            break;
        case 'queen':
            height *= 1.4;
            const queenBaseGeo = new THREE.CylinderGeometry(baseRadius * 0.8, baseRadius, height, 16);
            const queenTopGeo = new THREE.SphereGeometry(baseRadius * 0.6, 16, 8); // Crown base
            const queenSpikeGeo = new THREE.ConeGeometry(baseRadius * 0.2, height * 0.3, 8); // Spike
            const queenBaseMesh = new THREE.Mesh(queenBaseGeo, material);
            const queenTopMesh = new THREE.Mesh(queenTopGeo, material);
            const queenSpikeMesh = new THREE.Mesh(queenSpikeGeo, material);
            queenTopMesh.position.y = height / 2;
            queenSpikeMesh.position.y = height / 2 + baseRadius * 0.6; // Spike above sphere
            pieceGroupContainer.add(queenBaseMesh);
            pieceGroupContainer.add(queenTopMesh);
            pieceGroupContainer.add(queenSpikeMesh);
            break;
        case 'king':
            height *= 1.5;
            const kingBaseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, height, 16);
            // Simple cross on top
            const crossVGeo = new THREE.BoxGeometry(baseRadius * 0.3, height * 0.3, baseRadius * 0.3);
            const crossHGeo = new THREE.BoxGeometry(baseRadius * 0.8, height * 0.1, baseRadius * 0.2);
            const kingBaseMesh = new THREE.Mesh(kingBaseGeo, material);
            const crossVMesh = new THREE.Mesh(crossVGeo, material);
            const crossHMesh = new THREE.Mesh(crossHGeo, material);
            crossVMesh.position.y = height / 2 + height * 0.15; // Center of vertical bar
            crossHMesh.position.y = height / 2 + height * 0.3; // Top horizontal bar
            pieceGroupContainer.add(kingBaseMesh);
            pieceGroupContainer.add(crossVMesh);
            pieceGroupContainer.add(crossHMesh);
            break;
        default:
            console.warn("Unknown piece type:", type);
            const defaultGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.5, height, SQUARE_SIZE * 0.5); // Fallback box
            const defaultMesh = new THREE.Mesh(defaultGeo, material);
            pieceGroupContainer.add(defaultMesh);
    }

    // Apply shadow casting to all meshes within the group
    pieceGroupContainer.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = false; // Pieces generally don't receive shadows well on simple geometry
        }
    });

    // Add metadata to the group itself for raycasting identification
    pieceGroupContainer.userData = { type: 'piece', pieceType: type, color: color };

    return pieceGroupContainer;
}


/**
 * Adds a piece (as a Group) to the scene at a specific board coordinate.
 * @param {string} type - Piece type (e.g., 'pawn').
 * @param {string} color - 'white' or 'black'.
 * @param {number} row - Board row (0-7).
 * @param {number} col - Board column (0-7).
 * @returns {THREE.Group} The created piece group.
 */
function addPieceToScene(type, color, row, col) {
    const pieceMeshGroup = createPlaceholderPiece(type, color); // Get the group
    const position = getPositionFromCoords(row, col);

    // Calculate the height/center of the piece group for correct Y positioning
    // This is approximate for groups; bounding box is more accurate if needed later
    let pieceHeight = SQUARE_SIZE; // Default estimate
    // You might need a more robust way to get the visual height of the group
    // For simplicity, we'll position based on the estimated base height factor used in creation
    const baseHeightFactor = 0.6; // From createPlaceholderPiece
    let estimatedHeight = SQUARE_SIZE * PIECE_HEIGHT_SCALE * baseHeightFactor;
     // Adjust based on type if specific heights were set in createPlaceholderPiece
     switch (type.toLowerCase()) {
        case 'pawn': estimatedHeight *= 0.8; break;
        case 'knight': estimatedHeight *= 1.1; break;
        case 'bishop': estimatedHeight *= 1.2; break;
        case 'queen': estimatedHeight *= 1.4; break;
        case 'king': estimatedHeight *= 1.5; break;
     }

    // Position the group so its base rests near y=0
    pieceMeshGroup.position.set(position.x, 0 , position.z); // Set base position first
    // Adjust Y based on estimated center - this might need tweaking per piece model
    // A common approach is to model pieces with their origin at the base center.
    // For these placeholders, we roughly center them vertically.
    // pieceMeshGroup.position.y = estimatedHeight / 2; // This might lift the base too high

    // Store board coordinates in the group's userData
    pieceMeshGroup.userData.row = row;
    pieceMeshGroup.userData.col = col;

    pieceGroup.add(pieceMeshGroup); // Add the group to the main piece group
    return pieceMeshGroup;
}

/**
 * Removes all pieces (groups) from the scene.
 */
function clearPieces() {
    // Dispose geometries and materials to free memory
    pieceGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            // Dispose material only if it's unique per mesh, not shared like ours
            // if (child.material) child.material.dispose();
        }
    });
    pieceGroup.clear(); // Removes all children groups from the pieceGroup
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
    // Calculate row and column based on world coordinates and square size
    const col = Math.floor(position.x / SQUARE_SIZE + BOARD_SIZE / 2);
    const row = Math.floor(position.z / SQUARE_SIZE + BOARD_SIZE / 2);

    // Check if the calculated coordinates are within the valid board range
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        return { row, col };
    }
    return null; // Position is outside the board
}


/**
 * Finds the piece group at the given board coordinates.
 * @param {number} row
 * @param {number} col
 * @returns {THREE.Group | null} The piece group or null if not found.
 */
function getPieceMeshAt(row, col) {
    // Iterate through the children of the main piece group
    for (const piece of pieceGroup.children) {
        // Check the userData stored on the group itself
        if (piece.userData.row === row && piece.userData.col === col) {
            return piece; // Return the group
        }
    }
    return null; // No piece group found at these coordinates
}


/**
 * Moves a piece group instantly to new coordinates.
 * @param {THREE.Group} pieceMeshGroup - The group to move.
 * @param {number} newRow
 * @param {number} newCol
 */
function movePieceMesh(pieceMeshGroup, newRow, newCol) {
    const targetPosition = getPositionFromCoords(newRow, newCol);

    // Set the position of the group. The internal meshes move with it.
    // Keep Y position the same as it was (or recalculate based on target if needed)
    pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z);

    // Update the stored board coordinates in the group's userData
    pieceMeshGroup.userData.row = newRow;
    pieceMeshGroup.userData.col = newCol;
}

/**
 * Removes a piece group from the scene.
 * @param {THREE.Group} pieceMeshGroup - The group to remove.
 */
function removePieceMesh(pieceMeshGroup) {
    if (pieceMeshGroup) {
        // Dispose geometries/materials of children if necessary
        pieceMeshGroup.traverse((child) => {
             if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
             }
         });
        pieceGroup.remove(pieceMeshGroup); // Remove the group from the main piece group
    }
}


// --- Highlighting ---

/**
 * Adds visual highlights to the specified squares.
 * @param {Array<{row: number, col: number}>} squares - Array of coordinates to highlight.
 */
function showHighlights(squares) {
    clearHighlights(); // Clear previous highlights first
    // Use a single geometry for all highlights for efficiency
    const highlightGeometry = new THREE.PlaneGeometry(SQUARE_SIZE * 0.9, SQUARE_SIZE * 0.9); // Slightly smaller

    squares.forEach(sq => {
        const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        const pos = getPositionFromCoords(sq.row, sq.col);
        highlightMesh.position.set(pos.x, 0.02, pos.z); // Slightly above the board surface
        highlightMesh.rotation.x = -Math.PI / 2; // Rotate to lie flat
        highlightMesh.userData = { type: 'highlight', row: sq.row, col: sq.col }; // Store coords for potential clicks
        highlightGroup.add(highlightMesh);
    });
}

/**
 * Removes all highlight meshes from the scene.
 */
function clearHighlights() {
    // Dispose geometry/material if needed (only if not reusing)
    // highlightGroup.traverse(child => { ... });
    highlightGroup.clear(); // Removes all children meshes
}


// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate); // Request the next frame

    controls.update(); // Required if damping or auto-rotate is enabled on OrbitControls

    renderer.render(scene, camera); // Render the scene from the camera's perspective
}

// --- Event Handlers ---
function onWindowResize() {
    // Update camera aspect ratio and projection matrix
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Note: pixel ratio usually doesn't need updating on resize
}

// --- Raycasting ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(); // Reusable vector for mouse coordinates

/**
 * Performs raycasting to find intersected objects (pieces or squares).
 * @param {MouseEvent} event - The mouse event.
 * @returns {THREE.Intersection[]} Array of intersections, sorted by distance.
 */
function getIntersects(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1) for raycaster
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Define objects to check for intersections
    // We want to intersect with pieces (groups) and squares (meshes)
    const objectsToIntersect = [...pieceGroup.children, ...boardGroup.children, ...highlightGroup.children];

    // Perform the raycast
    // The 'true' argument checks recursively down the hierarchy (important for piece groups)
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);

    // Filter intersects to get the relevant object (piece group or square mesh)
    const relevantIntersects = [];
    for (const intersect of intersects) {
        let obj = intersect.object;
        // Traverse up until we find an object with our userData type or reach the scene root
        while (obj && !obj.userData.type && obj.parent !== scene) {
            obj = obj.parent;
        }
        // Add if we found a relevant object (piece group, square, or highlight)
        if (obj && obj.userData.type) {
            // Add the intersection data, but associate it with the main object (group or mesh)
             relevantIntersects.push({ ...intersect, object: obj });
             break; // Usually only care about the closest relevant object
        }
    }


    return relevantIntersects; // Return the filtered intersections
}


// --- Export Public Functions ---
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
    BOARD_SIZE, // Export constants if needed elsewhere
    SQUARE_SIZE,
    scene, // Export scene if needed externally (e.g., for debugging)
    camera // Export camera if needed externally
};
