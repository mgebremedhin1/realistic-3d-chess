import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Keep commented out
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // Keep commented out

// --- Configuration ---
const BOARD_SIZE = 8;
const SQUARE_SIZE = 5; // Size of each square in world units
const BOARD_THICKNESS = 1;
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

// --- Public Functions ---

/**
 * Initializes the entire Three.js scene.
 * @param {HTMLElement} container - The DOM element to attach the canvas to.
 */
function init(container) {
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Slightly softer directional
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
    controls.minDistance = SQUARE_SIZE * 1.5; // Allow closer zoom
    controls.maxDistance = SQUARE_SIZE * BOARD_SIZE * 1.5;
    controls.maxPolarAngle = Math.PI / 2.05; // Adjust angle slightly

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

    console.log("Three.js scene initialized.");
}

/**
 * Creates the chessboard geometry (base and squares) and adds it to the scene.
 */
function createBoard() {
    // Board base
    const boardBaseGeometry = new THREE.BoxGeometry(BOARD_SIZE * SQUARE_SIZE, BOARD_THICKNESS, BOARD_SIZE * SQUARE_SIZE);
    const boardBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3e31, roughness: 0.8 });
    const boardBaseMesh = new THREE.Mesh(boardBaseGeometry, boardBaseMaterial);
    boardBaseMesh.position.y = -BOARD_THICKNESS / 2;
    boardBaseMesh.receiveShadow = true;
    boardGroup.add(boardBaseMesh);

    // Individual squares
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
// == MORE DETAILED CODED PIECE FUNCTION (Replaces previous one) ==
// ==============================================================
/**
 * Creates more detailed placeholder geometry for a chess piece using basic shapes.
 * Uses THREE.Group to combine multiple meshes for each piece.
 * @param {string} type - Piece type ('pawn', 'rook', 'knight', 'bishop', 'queen', 'king').
 * @param {string} color - 'white' or 'black'.
 * @returns {THREE.Group} A group containing the piece mesh(es).
 */
function createPlaceholderPiece(type, color) {
    const material = color === 'white' ? whitePieceMaterial : blackPieceMaterial;
    const pieceGroupContainer = new THREE.Group();

    // --- Base Dimensions ---
    const squareSizeRef = SQUARE_SIZE;
    const baseRadius = squareSizeRef * 0.35;
    const baseHeight = squareSizeRef * 0.1; // Thinner base
    let currentY = 0; // Track current height for stacking shapes

    // --- Common Base ---
    const baseGeo = new THREE.CylinderGeometry(baseRadius * 1.1, baseRadius, baseHeight, 32); // Slightly flared base
    const baseMesh = new THREE.Mesh(baseGeo, material);
    baseMesh.position.y = currentY + baseHeight / 2;
    pieceGroupContainer.add(baseMesh);
    currentY += baseHeight;

    // --- Common Lower Stem ---
    const stemHeight = squareSizeRef * 0.15;
    const stemRadius = baseRadius * 0.6;
    const stemGeo = new THREE.CylinderGeometry(stemRadius, stemRadius, stemHeight, 16);
    const stemMesh = new THREE.Mesh(stemGeo, material);
    stemMesh.position.y = currentY + stemHeight / 2;
    pieceGroupContainer.add(stemMesh);
    currentY += stemHeight;

    // --- Piece Specific Shapes ---
    switch (type.toLowerCase()) {
        case 'pawn':
            // Collar below the head
            const pawnCollarHeight = squareSizeRef * 0.08;
            const pawnCollarRadius = stemRadius * 1.5;
            const pawnCollarGeo = new THREE.CylinderGeometry(pawnCollarRadius, stemRadius, pawnCollarHeight, 16);
            const pawnCollarMesh = new THREE.Mesh(pawnCollarGeo, material);
            pawnCollarMesh.position.y = currentY + pawnCollarHeight / 2;
            pieceGroupContainer.add(pawnCollarMesh);
            currentY += pawnCollarHeight;
            // Head
            const pawnHeadRadius = baseRadius * 0.7;
            const pawnHeadGeo = new THREE.SphereGeometry(pawnHeadRadius, 24, 16);
            const pawnHeadMesh = new THREE.Mesh(pawnHeadGeo, material);
            pawnHeadMesh.position.y = currentY + pawnHeadRadius * 0.8; // Position head slightly higher
            pieceGroupContainer.add(pawnHeadMesh);
            break;

        case 'rook':
            // Main Tower Body
            const rookBodyHeight = squareSizeRef * 0.7;
            const rookBodyRadius = baseRadius * 0.85;
            const rookBodyGeo = new THREE.CylinderGeometry(rookBodyRadius, rookBodyRadius, rookBodyHeight, 16);
            const rookBodyMesh = new THREE.Mesh(rookBodyGeo, material);
            rookBodyMesh.position.y = currentY + rookBodyHeight / 2;
            pieceGroupContainer.add(rookBodyMesh);
            currentY += rookBodyHeight;
            // Top Platform Lip
            const rookLipHeight = squareSizeRef * 0.08;
            const rookLipRadius = rookBodyRadius * 1.15;
            const rookLipGeo = new THREE.CylinderGeometry(rookLipRadius, rookLipRadius, rookLipHeight, 16);
            const rookLipMesh = new THREE.Mesh(rookLipGeo, material);
            rookLipMesh.position.y = currentY + rookLipHeight / 2;
            pieceGroupContainer.add(rookLipMesh);
            currentY += rookLipHeight;
            // Crenellations (simplified)
            const crenellationHeight = squareSizeRef * 0.2;
            const crenellationWidth = rookLipRadius * 0.5;
            const crenellationDepth = rookLipRadius * 0.5;
            const crenellationGeo = new THREE.BoxGeometry(crenellationWidth, crenellationHeight, crenellationDepth);
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const crenMesh = new THREE.Mesh(crenellationGeo, material);
                const radius = rookLipRadius * 0.85; // Position inside the lip radius
                crenMesh.position.set(
                    Math.cos(angle) * radius,
                    currentY + crenellationHeight / 2,
                    Math.sin(angle) * radius
                );
                crenMesh.lookAt(0, crenMesh.position.y, 0); // Point towards center (optional)
                pieceGroupContainer.add(crenMesh);
            }
            break;

        case 'knight':
            // More abstract Knight using stacked/rotated shapes
            // Body
            const knightBodyHeight = squareSizeRef * 0.5;
            const knightBodyRadius = baseRadius * 0.8;
            const knightBodyGeo = new THREE.CylinderGeometry(knightBodyRadius * 0.8, knightBodyRadius, knightBodyHeight, 16);
            const knightBodyMesh = new THREE.Mesh(knightBodyGeo, material);
            knightBodyMesh.position.y = currentY + knightBodyHeight / 2;
            pieceGroupContainer.add(knightBodyMesh);
            currentY += knightBodyHeight;
            // Neck (angled cylinder)
            const neckHeight = squareSizeRef * 0.4;
            const neckRadius = knightBodyRadius * 0.7;
            const neckGeo = new THREE.CylinderGeometry(neckRadius, neckRadius * 0.8, neckHeight, 16);
            const neckMesh = new THREE.Mesh(neckGeo, material);
            neckMesh.position.y = currentY + neckHeight * 0.4;
            neckMesh.position.x = neckRadius * 0.3; // Offset forward slightly
            neckMesh.rotation.z = -Math.PI / 6; // Angle forward
            pieceGroupContainer.add(neckMesh);
            currentY += neckHeight * 0.6; // Adjust Y based on angled position
            // Head (Box)
            const knightHeadWidth = neckRadius * 2.5;
            const knightHeadHeight = neckHeight * 1.2;
            const knightHeadDepth = neckRadius * 1.5;
            const knightHeadGeo = new THREE.BoxGeometry(knightHeadWidth, knightHeadHeight, knightHeadDepth);
            const knightHeadMesh = new THREE.Mesh(knightHeadGeo, material);
            // Position relative to the top of the neck
            knightHeadMesh.position.y = currentY + knightHeadHeight * 0.4;
            knightHeadMesh.position.x = neckRadius * 1.2; // Further forward
            knightHeadMesh.rotation.z = -Math.PI / 8; // Slightly less angle than neck
            pieceGroupContainer.add(knightHeadMesh);
            // Mane/Ears (Small boxes) - very simplified
            const earGeo = new THREE.BoxGeometry(knightHeadWidth*0.2, knightHeadHeight*0.4, knightHeadDepth*0.3);
            const earMeshL = new THREE.Mesh(earGeo, material);
            const earMeshR = new THREE.Mesh(earGeo, material);
            earMeshL.position.set(knightHeadMesh.position.x - knightHeadWidth*0.3, knightHeadMesh.position.y + knightHeadHeight*0.4, knightHeadDepth*0.3);
            earMeshR.position.set(knightHeadMesh.position.x - knightHeadWidth*0.3, knightHeadMesh.position.y + knightHeadHeight*0.4, -knightHeadDepth*0.3);
            earMeshL.rotation.z = -Math.PI / 10;
            earMeshR.rotation.z = -Math.PI / 10;
            pieceGroupContainer.add(earMeshL);
            pieceGroupContainer.add(earMeshR);
            break;

        case 'bishop':
            // Taller body (Cone)
            const bishopBodyHeight = squareSizeRef * 0.9;
            const bishopBodyRadius = baseRadius * 0.7;
            const bishopBodyGeo = new THREE.ConeGeometry(bishopBodyRadius, bishopBodyHeight, 24);
            const bishopBodyMesh = new THREE.Mesh(bishopBodyGeo, material);
            bishopBodyMesh.position.y = currentY + bishopBodyHeight / 2;
            pieceGroupContainer.add(bishopBodyMesh);
            currentY += bishopBodyHeight;
            // Collar
            const bishopCollarHeight = squareSizeRef * 0.08;
            const bishopCollarRadius = bishopBodyRadius * 0.5; // Smaller collar radius
            const bishopCollarGeo = new THREE.CylinderGeometry(bishopCollarRadius, bishopBodyRadius, bishopCollarHeight, 16); // Tapered collar
            const bishopCollarMesh = new THREE.Mesh(bishopCollarGeo, material);
            bishopCollarMesh.position.y = currentY + bishopCollarHeight / 2;
            pieceGroupContainer.add(bishopCollarMesh);
            currentY += bishopCollarHeight;
            // Head (Sphere)
            const bishopHeadRadius = bishopBodyRadius * 0.9;
            const bishopHeadGeo = new THREE.SphereGeometry(bishopHeadRadius, 16, 12);
            const bishopHeadMesh = new THREE.Mesh(bishopHeadGeo, material);
            bishopHeadMesh.position.y = currentY + bishopHeadRadius * 0.6; // Position sphere slightly higher
            pieceGroupContainer.add(bishopHeadMesh);
            // Tiny Mitre Top (optional simple sphere)
            const mitreRadius = bishopHeadRadius * 0.3;
            const mitreGeo = new THREE.SphereGeometry(mitreRadius, 8, 6);
            const mitreMesh = new THREE.Mesh(mitreGeo, material);
            mitreMesh.position.y = currentY + bishopHeadRadius + mitreRadius; // On top of head
            pieceGroupContainer.add(mitreMesh);
            break;

        case 'queen':
            // Tapered Body
            const queenBodyHeight = squareSizeRef * 1.1;
            const queenBodyRadius = baseRadius * 0.9;
            const queenBodyGeo = new THREE.CylinderGeometry(stemRadius, queenBodyRadius, queenBodyHeight, 24); // Taper from stem
            const queenBodyMesh = new THREE.Mesh(queenBodyGeo, material);
            queenBodyMesh.position.y = currentY + queenBodyHeight / 2;
            pieceGroupContainer.add(queenBodyMesh);
            currentY += queenBodyHeight;
            // Crown Base (like a Torus or wide cylinder)
            const crownBaseHeight = squareSizeRef * 0.1;
            const crownBaseRadius = queenBodyRadius * 1.1;
            const crownBaseGeo = new THREE.CylinderGeometry(crownBaseRadius, crownBaseRadius * 0.9, crownBaseHeight, 16);
            const crownBaseMesh = new THREE.Mesh(crownBaseGeo, material);
            crownBaseMesh.position.y = currentY + crownBaseHeight / 2;
            pieceGroupContainer.add(crownBaseMesh);
            currentY += crownBaseHeight;
            // Crown Points (small cones)
            const pointHeight = squareSizeRef * 0.25;
            const pointRadius = crownBaseRadius * 0.15;
            const pointGeo = new THREE.ConeGeometry(pointRadius, pointHeight, 8);
            const numPoints = 6;
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const pointMesh = new THREE.Mesh(pointGeo, material);
                const radius = crownBaseRadius * 0.8;
                pointMesh.position.set(
                    Math.cos(angle) * radius,
                    currentY + pointHeight / 2,
                    Math.sin(angle) * radius
                );
                pieceGroupContainer.add(pointMesh);
            }
            // Center Jewel
            const centerJewelRadius = pointRadius * 1.5;
            const centerJewelGeo = new THREE.SphereGeometry(centerJewelRadius, 8, 6);
            const centerJewelMesh = new THREE.Mesh(centerJewelGeo, material);
            centerJewelMesh.position.y = currentY + centerJewelRadius; // Center jewel slightly above points base
            pieceGroupContainer.add(centerJewelMesh);
            break;

        case 'king':
            // Taller Body
            const kingBodyHeight = squareSizeRef * 1.3; // Tallest
            const kingBodyRadius = baseRadius * 0.9;
            const kingBodyGeo = new THREE.CylinderGeometry(stemRadius, kingBodyRadius, kingBodyHeight, 24); // Taper from stem
            const kingBodyMesh = new THREE.Mesh(kingBodyGeo, material);
            kingBodyMesh.position.y = currentY + kingBodyHeight / 2;
            pieceGroupContainer.add(kingBodyMesh);
            currentY += kingBodyHeight;
            // Top Platform
            const kingPlatformHeight = squareSizeRef * 0.1;
            const kingPlatformRadius = kingBodyRadius * 1.1;
            const kingPlatformGeo = new THREE.CylinderGeometry(kingPlatformRadius, kingPlatformRadius, kingPlatformHeight, 16);
            const kingPlatformMesh = new THREE.Mesh(kingPlatformGeo, material);
            kingPlatformMesh.position.y = currentY + kingPlatformHeight / 2;
            pieceGroupContainer.add(kingPlatformMesh);
            currentY += kingPlatformHeight;
            // Cross Topper (more defined)
            const crossBarHeight = squareSizeRef * 0.35;
            const crossBarWidth = kingPlatformRadius * 0.8;
            const crossBarThickness = crossBarWidth * 0.25;
            const crossVertGeo = new THREE.BoxGeometry(crossBarThickness, crossBarHeight, crossBarThickness);
            const crossHorzGeo = new THREE.BoxGeometry(crossBarWidth, crossBarThickness, crossBarThickness);
            const crossVertMesh = new THREE.Mesh(crossVertGeo, material);
            const crossHorzMesh = new THREE.Mesh(crossHorzGeo, material);
            const crossYPos = currentY + crossBarHeight / 2; // Position cross above platform
            crossVertMesh.position.y = crossYPos;
            crossHorzMesh.position.y = crossYPos + crossBarHeight * 0.1; // Position horizontal slightly higher on vertical
            pieceGroupContainer.add(crossVertMesh);
            pieceGroupContainer.add(crossHorzMesh);
            break;

        default:
            console.warn("Unknown piece type in createPlaceholderPiece:", type);
            const fallbackGeo = new THREE.BoxGeometry(baseRadius * 1.5, squareSizeRef, baseRadius * 1.5);
            const fallbackMesh = new THREE.Mesh(fallbackGeo, material);
            fallbackMesh.position.y = baseHeight + squareSizeRef / 2;
            pieceGroupContainer.add(fallbackMesh);
    }

    // Apply shadow casting/receiving to all meshes within the group
    pieceGroupContainer.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true; // Allow pieces to receive subtle shadows
        }
    });

    // Add metadata to the group itself for raycasting identification
    pieceGroupContainer.userData = { type: 'piece', pieceType: type, color: color };

    return pieceGroupContainer; // Return the entire group
}
// ==============================================================
// == END OF DETAILED PIECE FUNCTION ==
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

    // Position the entire group so its base rests on the board (y=0).
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
    pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z); // Keep original Y
    pieceMeshGroup.userData.row = newRow;
    pieceMeshGroup.userData.col = newCol;
}

/**
 * Removes a specific piece group from the scene and disposes its geometry.
 * @param {THREE.Group} pieceMeshGroup - The piece group to remove.
 */
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


// --- Highlighting ---

/**
 * Adds visual highlights (semi-transparent planes) to the specified squares.
 * Clears any existing highlights first.
 * @param {Array<{row: number, col: number}>} squares - Array of coordinates to highlight.
 */
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

/**
 * Removes all highlight meshes from the scene.
 */
function clearHighlights() {
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

// --- Raycasting (for clicking objects) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * Performs raycasting from the camera through the mouse position
 * to find intersected objects (pieces, squares, highlights).
 * @param {MouseEvent} event - The mouse event containing clientX/clientY.
 * @returns {THREE.Intersection[]} Array of intersections, filtered for relevant objects, sorted by distance.
 */
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
    camera
};
