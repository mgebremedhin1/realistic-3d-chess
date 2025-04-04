import * as THREE from 'three'; // Keep import for potential future use
// *** Import pieceGroup along with other things from threeSetup ***
import * as ThreeSetup from './threeSetup.js';
import * as ChessLogic from './chessLogic.js';
import * as UIManager from './uiManager.js';

// --- Global State Variables ---
let selectedPieceMesh = null; // Stores the 3D GROUP of the selected piece
let validMoveCoords = [];
let isDragging = false;
let gameReady = false;

// --- AI Configuration ---
const CPU_PLAYER_COLOR = ChessLogic.COLORS.BLACK;
let isPlayerTurn = true;
let aiSearchDepth = 2;

// --- Initialization ---
function initApp() { /* ... (same as before) ... */
    console.log("Initializing Chess Application..."); UIManager.initUIManager(); const sceneContainer = document.getElementById('scene-container'); if (!sceneContainer) { console.error("Fatal Error: #scene-container element not found!"); return; }
    ThreeSetup.init(sceneContainer, () => { console.log("Three.js init complete callback received in main.js."); if (!ThreeSetup.modelsLoaded) { console.error("Models failed to load. Cannot setup initial board."); UIManager.updateGameStatusDisplay({ error: "Error loading 3D models." }); return; } ChessLogic.initializeGame(); setupInitialBoard(); updateUI(); UIManager.setupEventListeners(startNewGame); isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR); gameReady = true; console.log("Chess Application Initialized Successfully (including models)."); });
    sceneContainer.addEventListener('click', onCanvasClick); console.log("Initial setup started, waiting for 3D scene and models...");
}

/** Sets up initial board pieces. */
function setupInitialBoard() { /* ... (same as before) ... */ ThreeSetup.clearPieces(); const boardState = ChessLogic.getBoardState(); if (!boardState) { console.error("Cannot setup initial board: ChessLogic boardState is null."); return; } console.log("Setting up initial board pieces..."); for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) { const piece = boardState[r][c]; if (piece) { const pieceMesh = ThreeSetup.addPieceToScene(piece.type, piece.color, r, c); if (!pieceMesh) { console.warn(`Failed to create mesh for ${piece.color} ${piece.type} at [${r},${c}]`); } } } } console.log("Initial 3D board populated from logic state."); }
/** Starts a new game. */
function startNewGame() { /* ... (same as before) ... */ console.log("Starting New Game..."); if (!gameReady) { console.warn("Cannot start new game yet, models not ready."); return; } ChessLogic.initializeGame(); setupInitialBoard(); UIManager.clearUI(); updateUI(); ThreeSetup.clearHighlights(); selectedPieceMesh = null; validMoveCoords = []; isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR); console.log("New game started."); }
/** Updates HTML UI. */
function updateUI() { /* ... (same as before) ... */ UIManager.updateTurnIndicator(ChessLogic.getCurrentPlayer()); UIManager.updateCapturedPieces(ChessLogic.getCapturedPieces()); UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus()); const history = ChessLogic.getMoveHistory(); const moveListElement = document.getElementById('move-list'); if (moveListElement) { moveListElement.innerHTML = ''; let moveCounter = 1; for (let i = 0; i < history.length; i++) { const playerColor = (i % 2 === 0) ? ChessLogic.COLORS.WHITE : ChessLogic.COLORS.BLACK; UIManager.addMoveToHistory(history[i], moveCounter, playerColor); if (playerColor === ChessLogic.COLORS.BLACK) { moveCounter++; } } moveListElement.scrollTop = moveListElement.scrollHeight; } }

// --- Event Handlers for User Interaction ---

/** Handles click events on the Three.js canvas. (Removed select/deselect logs) */
function onCanvasClick(event) {
    if (!gameReady) { return; } if (!isPlayerTurn) { return; } if (isDragging) { return; }
    const intersects = ThreeSetup.getIntersects(event);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object; const userData = clickedObject.userData || {};
        if (userData.type === 'piece') {
            const pieceLogic = ChessLogic.getPieceAt(userData.row, userData.col);
            if (pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                if (clickedObject === selectedPieceMesh) { deselectPiece(); } else { selectPiece(clickedObject); }
            } else if (selectedPieceMesh && pieceLogic && pieceLogic.color !== ChessLogic.getCurrentPlayer()) {
                attemptMove(userData.row, userData.col);
            } else { deselectPiece(); }
        } else if (userData.type === 'square' || userData.type === 'highlight') {
            if (selectedPieceMesh) { attemptMove(userData.row, userData.col); } else { deselectPiece(); }
        } else { deselectPiece(); }
    } else { deselectPiece(); }
}

/** Selects a piece. (Removed logs) */
function selectPiece(pieceMeshGroup) {
    if (selectedPieceMesh === pieceMeshGroup) { return; } deselectPiece(); selectedPieceMesh = pieceMeshGroup; const { row, col } = selectedPieceMesh.userData; const pieceLogic = ChessLogic.getPieceAt(row, col); if (!pieceLogic || pieceLogic.color !== ChessLogic.getCurrentPlayer()) { console.warn("selectPiece: Mismatch or wrong player."); selectedPieceMesh = null; ThreeSetup.clearHighlights(); return; } validMoveCoords = ChessLogic.getValidMovesForPiece(row, col); ThreeSetup.showHighlights(validMoveCoords); console.log(`Selected: ${selectedPieceMesh.userData.color} ${selectedPieceMesh.userData.pieceType} at [${row}, ${col}]`);
}

/** Deselects a piece. (Removed logs) */
function deselectPiece() {
    if (selectedPieceMesh) { selectedPieceMesh = null; } validMoveCoords = []; ThreeSetup.clearHighlights();
}

/** Attempts a move. */
function attemptMove(targetRow, targetCol) { /* ... (same as before) ... */
    if (!selectedPieceMesh) { console.warn("Attempted move without selected piece."); return; } const startRow = selectedPieceMesh.userData.row; const startCol = selectedPieceMesh.userData.col; const isValidTarget = validMoveCoords.some(move => move.row === targetRow && move.col === targetCol); if (!isValidTarget) { console.log("Clicked square is not a valid move for the selected piece."); deselectPiece(); return; } console.log(`Attempting move: ${selectedPieceMesh.userData.pieceType} from [${startRow}, ${startCol}] to [${targetRow}, ${targetCol}]`); let promotionPieceType = null; const pieceLogic = ChessLogic.getPieceAt(startRow, startCol); const promotionRank = ChessLogic.getCurrentPlayer() === ChessLogic.COLORS.WHITE ? 0 : 7; if (pieceLogic && pieceLogic.type === ChessLogic.PIECE_TYPES.PAWN && targetRow === promotionRank) { promotionPieceType = ChessLogic.PIECE_TYPES.QUEEN; console.log(`Auto-promoting pawn to ${promotionPieceType}`); } const humanPieceMesh = selectedPieceMesh; const moveResult = ChessLogic.makeMove(startRow, startCol, targetRow, targetCol, promotionPieceType); if (moveResult.success) { console.log("Move successful in logic:", moveResult.moveNotation); handleMoveResultGraphics(moveResult, humanPieceMesh); updateUI(); deselectPiece(); const currentTurnPlayer = ChessLogic.getCurrentPlayer(); const currentStatus = ChessLogic.getGameStatus(); if (!currentStatus.isCheckmate && !currentStatus.isStalemate && currentTurnPlayer === CPU_PLAYER_COLOR) { isPlayerTurn = false; console.log("CPU's turn..."); UIManager.updateGameStatusDisplay({ info: "CPU is thinking..."}); setTimeout(triggerAIMove, 500); } else { isPlayerTurn = true; if (currentStatus.isCheckmate || currentStatus.isStalemate) { console.log("Game Over."); } } } else { console.error("Move failed validation in ChessLogic even after passing UI check.", {startRow, startCol, targetRow, targetCol}); isPlayerTurn = true; deselectPiece(); }
}

/** Handles move graphics. FIXED pieceGroup reference */
function handleMoveResultGraphics(moveResult, movingPieceMesh) {
    if (!moveResult || !moveResult.move) { console.error("handleMoveResultGraphics called with invalid moveResult:", moveResult); return; }
    // Handle captures
    if (moveResult.capturedPiece) {
        let capturedRow = moveResult.move.endRow; let capturedCol = moveResult.move.endCol;
        if (moveResult.specialMoves.enPassantCapture && moveResult.enPassantCaptureCoords) { capturedRow = moveResult.enPassantCaptureCoords.row; capturedCol = moveResult.enPassantCaptureCoords.col; }
        const capturedMesh = ThreeSetup.getPieceMeshAt(capturedRow, capturedCol);
        if (capturedMesh && capturedMesh !== movingPieceMesh) { console.log(`Removing captured ${moveResult.capturedPiece.type} mesh at: [${capturedRow}, ${capturedCol}]`); ThreeSetup.removePieceMesh(capturedMesh); }
        else if (!capturedMesh) { console.warn(`Captured piece ${moveResult.capturedPiece.type} reported by logic, but no mesh found at capture coords [${capturedRow}, ${capturedCol}]`); }
    }
    // Handle moving piece
    // *** FIX: Check parent against the imported ThreeSetup.pieceGroup ***
    if (!moveResult.specialMoves.promotion && movingPieceMesh && movingPieceMesh.parent === ThreeSetup.pieceGroup) {
         ThreeSetup.movePieceMesh(movingPieceMesh, moveResult.move.endRow, moveResult.move.endCol);
    } else if (moveResult.specialMoves.promotion && movingPieceMesh) {
         console.log(`Removing pawn mesh at [${moveResult.move.startRow}, ${moveResult.move.startCol}] due to promotion.`);
         ThreeSetup.removePieceMesh(movingPieceMesh);
    }
    // Handle castling
    if (moveResult.specialMoves.castled && moveResult.castledRookMove) {
        const rookMesh = ThreeSetup.getPieceMeshAt(moveResult.castledRookMove.startRow, moveResult.castledRookMove.startCol);
        if (rookMesh) { ThreeSetup.movePieceMesh(rookMesh, moveResult.castledRookMove.endRow, moveResult.castledRookMove.endCol); console.log("Moved castling rook mesh in 3D scene."); }
        else { console.error("Could not find rook mesh for castling!"); }
    }
    // Handle promotion
    if (moveResult.specialMoves.promotion) {
        console.log(`Adding new ${moveResult.specialMoves.promotion} mesh at [${moveResult.move.endRow}, ${moveResult.move.endCol}]`);
        const newPieceLogic = ChessLogic.getPieceAt(moveResult.move.endRow, moveResult.move.endCol);
        if (newPieceLogic) { ThreeSetup.addPieceToScene(newPieceLogic.type, newPieceLogic.color, moveResult.move.endRow, moveResult.move.endCol); }
        else { console.error("Logic error: Piece not found at promotion square after promotion!"); }
    }
}
/** Triggers AI move. */
function triggerAIMove() { /* ... (same as before) ... */ console.log(`Triggering AI move calculation with depth ${aiSearchDepth}...`); if (!gameReady) { console.error("AI cannot move, game not ready."); isPlayerTurn = true; return; } const aiMove = ChessLogic.getBestMoveMinimax(aiSearchDepth); if (aiMove) { console.log("AI chose move:", aiMove); const movingAiMesh = ThreeSetup.getPieceMeshAt(aiMove.startRow, aiMove.startCol); if (!movingAiMesh) { console.error("AI move error: Could not find the 3D mesh for the piece at", aiMove.startRow, aiMove.startCol); isPlayerTurn = true; UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus()); return; } const aiMoveResult = ChessLogic.makeMove(aiMove.startRow, aiMove.startCol, aiMove.endRow, aiMove.endCol, aiMove.promotion); if (aiMoveResult.success) { console.log("AI move successful in logic:", aiMoveResult.moveNotation); handleMoveResultGraphics(aiMoveResult, movingAiMesh); updateUI(); } else { console.error("AI generated an invalid move!", aiMove); } } else { console.log("AI has no legal moves. Game should be over."); updateUI(); } const finalStatus = ChessLogic.getGameStatus(); if (!finalStatus.isCheckmate && !finalStatus.isStalemate) { isPlayerTurn = true; console.log("Player's turn..."); } else { isPlayerTurn = false; console.log("Game over."); } UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus()); }

// --- Drag and Drop Handlers (Placeholders) ---
function onCanvasMouseDown(event) { /* ... placeholder ... */ }
function onCanvasMouseMove(event) { /* ... placeholder ... */ }
function onCanvasMouseUp(event) { /* ... placeholder ... */ }

// --- Start the Application ---
document.addEventListener('DOMContentLoaded', initApp);

