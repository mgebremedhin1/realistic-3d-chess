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
const whitePieceMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.1, roughness: 0.2, name: 'whiteMat' });
const blackPieceMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.4, name: 'blackMat' });
const highlightMaterial = new THREE.MeshStandardMaterial({ color: HIGHLIGHT_COLOR, transparent: true, opacity: 0.4, roughness: 0.5, side: THREE.DoubleSide });

// --- Scene Variables ---
let scene, camera, renderer, controls;
let boardGroup, pieceGroup, highlightGroup; // pieceGroup is defined here
let pieceMeshReferences = { pawn: null, rook: null, knight: null, bishop: null, queen: null, king: null };
let modelsLoaded = false;
// Stray ); and } lines were removed from here

// --- Function to Load 3D Models ---
// NOTE: You didn't include the loadModels function in the broken code snippet,
// assuming it's the same as the correct version you showed initially.
// Make sure it exists somewhere in your actual file.
function loadModels(onLoadedCallback) {
    const loader = new GLTFLoader(); console.log(`Attempting to load model from: ${CHESS_SET_MODEL_PATH}`);
    loader.load( CHESS_SET_MODEL_PATH, function (gltf) {
            console.log("GLTF model loaded successfully."); const loadedScene = gltf.scene;
            loadedScene.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
            console.log("--- Finding individual piece meshes by name ---");
            const nameMap = { pawn: 'Pawn_0', rook: 'Rook_0', knight: 'Knight_0', bishop: 'Bishop_0', queen: 'Queen_0', king: 'King_0' };
            let allFound = true;
            for (const type in nameMap) {
                const meshName = nameMap[type]; const foundMesh = loadedScene.getObjectByName(meshName);
                if (foundMesh && foundMesh.isMesh) { pieceMeshReferences[type] = foundMesh; console.log(`Stored reference for '${type}' using mesh named '${meshName}'`); }
                else { console.error(`Could not find mesh named '${meshName}' for piece type '${type}'!`); allFound = false; }
            }
            if (allFound) { console.log("--- Successfully stored references for all piece types ---"); modelsLoaded = true; }
            else { console.error("--- Failed to find all required piece meshes! Check console errors. ---"); modelsLoaded = false; }
            console.log("Model processing complete."); if (onLoadedCallback) { onLoadedCallback(); }
        }, undefined, function (error) {
            console.error('An error happened during GLTF loading:', error); modelsLoaded = false; if (onLoadedCallback) { onLoadedCallback(); }
        }
    );
}


// --- Public Functions ---
function init(container, onReadyCallback) { /* ... (same as before) ... */
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x282c34);
    const aspect = window.innerWidth / window.innerHeight; camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, SQUARE_SIZE * BOARD_SIZE * 0.6, SQUARE_SIZE * BOARD_SIZE * 0.6); camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; container.appendChild(renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); directionalLight.position.set(15, 30, 20); directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048; const shadowCamSize = SQUARE_SIZE * BOARD_SIZE * 0.6;
    directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 100; directionalLight.shadow.camera.left = -shadowCamSize; directionalLight.shadow.camera.right = shadowCamSize; directionalLight.shadow.camera.top = shadowCamSize; directionalLight.shadow.camera.bottom = -shadowCamSize; directionalLight.shadow.bias = -0.001; scene.add(directionalLight);
    controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.enableDamping = true; controls.dampingFactor = 0.05; controls.screenSpacePanning = false; controls.minDistance = SQUARE_SIZE * 1.5; controls.maxDistance = SQUARE_SIZE * BOARD_SIZE * 1.5; controls.maxPolarAngle = Math.PI / 2.05;
    boardGroup = new THREE.Group(); pieceGroup = new THREE.Group(); highlightGroup = new THREE.Group(); scene.add(boardGroup); scene.add(pieceGroup); scene.add(highlightGroup); createBoard(); window.addEventListener('resize', onWindowResize, false); animate(); console.log("Three.js scene initialized. Starting model load..."); loadModels(() => { console.log("Model loading complete callback received."); if (onReadyCallback) { onReadyCallback(); } });
}
function createBoard() { /* ... (same as before) ... */
    const boardBaseGeometry = new THREE.BoxGeometry(BOARD_SIZE * SQUARE_SIZE, BOARD_THICKNESS, BOARD_SIZE * SQUARE_SIZE); const boardBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3e31, roughness: 0.8 }); const boardBaseMesh = new THREE.Mesh(boardBaseGeometry, boardBaseMaterial); boardBaseMesh.position.y = -BOARD_THICKNESS / 2; boardBaseMesh.receiveShadow = true; boardGroup.add(boardBaseMesh); const squareGeometry = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE); for (let row = 0; row < BOARD_SIZE; row++) { for (let col = 0; col < BOARD_SIZE; col++) { const isLightSquare = (row + col) % 2 === 0; const squareMaterial = isLightSquare ? lightSquareMaterial : darkSquareMaterial; const squareMesh = new THREE.Mesh(squareGeometry, squareMaterial); squareMesh.position.x = (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE; squareMesh.position.z = (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE; squareMesh.position.y = 0.01; squareMesh.rotation.x = -Math.PI / 2; squareMesh.receiveShadow = true; squareMesh.userData = { type: 'square', row: row, col: col }; boardGroup.add(squareMesh); } } console.log("Chessboard created.");
}
function createPlaceholderPiece(type, color) { /* ... (same as before) ... */
    if (!modelsLoaded) { console.error(`Attempted to create piece type '${type}' before models finished loading or failed.`); const fallbackGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2, SQUARE_SIZE * 0.2); const fallbackMesh = new THREE.Mesh(fallbackGeo, color === 'white' ? whitePieceMaterial : blackPieceMaterial); const fallbackGroup = new THREE.Group(); fallbackGroup.add(fallbackMesh); fallbackGroup.userData = { type: 'piece', pieceType: 'fallback', color: color }; return fallbackGroup; }
    const templateMesh = pieceMeshReferences[type.toLowerCase()]; if (!templateMesh) { console.error(`No mesh reference found for piece type '${type}'!`); const fallbackGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.3, SQUARE_SIZE * 0.7, SQUARE_SIZE * 0.3); const fallbackMesh = new THREE.Mesh(fallbackGeo, color === 'white' ? whitePieceMaterial : blackPieceMaterial); const fallbackGroup = new THREE.Group(); fallbackGroup.add(fallbackMesh); fallbackGroup.userData = { type: 'piece', pieceType: 'fallback_missing', color: color }; return fallbackGroup; }
    const pieceMesh = templateMesh.clone(); pieceMesh.material = color === 'white' ? whitePieceMaterial : blackPieceMaterial; pieceMesh.castShadow = true; pieceMesh.receiveShadow = true;
    const desiredHeightApprox = SQUARE_SIZE * 0.9; const box = new THREE.Box3().setFromObject(pieceMesh); const size = box.getSize(new THREE.Vector3()); let scaleFactor = 1.0; if (size.y > 0.001) { scaleFactor = desiredHeightApprox / size.y; } else { console.warn(`Mesh for ${type} has zero height, using default scale.`); } pieceMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
    const scaledBox = new THREE.Box3().setFromObject(pieceMesh); pieceMesh.position.y = -scaledBox.min.y;
    const pieceGroupContainer = new THREE.Group(); pieceGroupContainer.add(pieceMesh);
    if (color === 'white') { pieceGroupContainer.rotation.y = Math.PI; }
    pieceGroupContainer.userData = { type: 'piece', pieceType: type, color: color };
    return pieceGroupContainer;
}
function addPieceToScene(type, color, row, col) { /* ... (same as before) ... */ const pieceGroupContainer = createPlaceholderPiece(type, color); if (!pieceGroupContainer) { console.error(`Failed to create piece group ${type} at [${row}, ${col}]`); return null; } const position = getPositionFromCoords(row, col); pieceGroupContainer.position.set(position.x, 0, position.z); pieceGroupContainer.userData.row = row; pieceGroupContainer.userData.col = col; pieceGroup.add(pieceGroupContainer); return pieceGroupContainer; }
function clearPieces() { /* ... (same as before) ... */ while(pieceGroup.children.length > 0){ const piece = pieceGroup.children[0]; piece.traverse((child) => { if (child instanceof THREE.Mesh) { if (child.geometry) child.geometry.dispose(); } }); pieceGroup.remove(piece); } }
function getPositionFromCoords(row, col) { /* ... (same as before) ... */ return new THREE.Vector3( (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE, 0, (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE ); }
function getCoordsFromPosition(position) { /* ... (same as before) ... */ const col = Math.floor(position.x / SQUARE_SIZE + BOARD_SIZE / 2); const row = Math.floor(position.z / SQUARE_SIZE + BOARD_SIZE / 2); if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) { return { row, col }; } return null; }
function getPieceMeshAt(row, col) { /* ... (same as before) ... */ for (const piece of pieceGroup.children) { if (piece.userData.row === row && piece.userData.col === col) { return piece; } } return null; }
function movePieceMesh(pieceMeshGroup, newRow, newCol) { /* ... (same as before) ... */ const targetPosition = getPositionFromCoords(newRow, newCol); pieceMeshGroup.position.set(targetPosition.x, pieceMeshGroup.position.y, targetPosition.z); pieceMeshGroup.userData.row = newRow; pieceMeshGroup.userData.col = newCol; }
function removePieceMesh(pieceMeshGroup) { /* ... (same as before) ... */ if (pieceMeshGroup) { pieceMeshGroup.traverse((child) => { if (child instanceof THREE.Mesh) { if (child.geometry) child.geometry.dispose(); } }); pieceGroup.remove(pieceMeshGroup); } }
function showHighlights(squares) { /* ... (same as before) ... */ clearHighlights(); const highlightGeometry = new THREE.PlaneGeometry(SQUARE_SIZE * 0.9, SQUARE_SIZE * 0.9); squares.forEach(sq => { const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial); const pos = getPositionFromCoords(sq.row, sq.col); highlightMesh.position.set(pos.x, 0.02, pos.z); highlightMesh.rotation.x = -Math.PI / 2; highlightMesh.userData = { type: 'highlight', row: sq.row, col: sq.col }; highlightGroup.add(highlightMesh); }); }
function clearHighlights() { /* ... (same as before) ... */ highlightGroup.clear(); }
function animate() { /* ... (same as before) ... */ requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
function onWindowResize() { /* ... (same as before) ... */ camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

// --- Raycasting ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(); // Defined globally

/** Raycasting - Finds intersected objects. */
function getIntersects(event) { /* ... (same as before, logs removed) ... */
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const objectsToIntersect = [...pieceGroup.children, ...boardGroup.children, ...highlightGroup.children];
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);
    const relevantIntersects = [];
    for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj && (!obj.userData || !obj.userData.type) && obj.parent !== scene) { obj = obj.parent; }
        if (obj && obj.userData.type && !relevantIntersects.some(ri => ri.object === obj)) { relevantIntersects.push({ ...intersect, object: obj }); }
    }
    relevantIntersects.sort((a, b) => a.distance - b.distance);
    return relevantIntersects;
}


// --- Export Public Functions and Variables ---
export {
    init, addPieceToScene, clearPieces, getPositionFromCoords, getCoordsFromPosition,
    getIntersects, showHighlights, clearHighlights, movePieceMesh, removePieceMesh,
    getPieceMeshAt, BOARD_SIZE, SQUARE_SIZE, scene, camera, modelsLoaded,
    pieceGroup // *** NEW: Export pieceGroup ***
};
