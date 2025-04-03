import * as THREE from 'three'; // Keep import for potential future use
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
function initApp() {
    console.log("Initializing Chess Application...");
    UIManager.initUIManager();
    const sceneContainer = document.getElementById('scene-container');
    if (!sceneContainer) { /* ... error handling ... */ return; }

    // Call ThreeSetup.init with a callback
    ThreeSetup.init(sceneContainer, () => {
        console.log("Three.js init complete callback received in main.js.");
        if (!ThreeSetup.modelsLoaded) { /* ... error handling ... */ return; }

        // Initialize Game Logic and UI AFTER models are ready
        ChessLogic.initializeGame();
        setupInitialBoard();
        updateUI();
        UIManager.setupEventListeners(startNewGame);
        isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR);
        gameReady = true;
        console.log("Chess Application Initialized Successfully (including models).");
    });

    sceneContainer.addEventListener('click', onCanvasClick); // Add listener
    console.log("Initial setup started, waiting for 3D scene and models...");
}

/** Sets up initial board pieces. (No changes needed) */
function setupInitialBoard() { /* ... (same as before) ... */
    ThreeSetup.clearPieces(); const boardState = ChessLogic.getBoardState(); if (!boardState) { console.error("Cannot setup initial board: ChessLogic boardState is null."); return; } console.log("Setting up initial board pieces..."); for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) { const piece = boardState[r][c]; if (piece) { const pieceMesh = ThreeSetup.addPieceToScene(piece.type, piece.color, r, c); if (!pieceMesh) { console.warn(`Failed to create mesh for ${piece.color} ${piece.type} at [${r},${c}]`); } } } } console.log("Initial 3D board populated from logic state.");
}
/** Starts a new game. (No changes needed) */
function startNewGame() { /* ... (same as before) ... */
    console.log("Starting New Game..."); if (!gameReady) { console.warn("Cannot start new game yet, models not ready."); return; } ChessLogic.initializeGame(); setupInitialBoard(); UIManager.clearUI(); updateUI(); ThreeSetup.clearHighlights(); selectedPieceMesh = null; validMoveCoords = []; isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR); console.log("New game started.");
}
/** Updates HTML UI. (No changes needed) */
function updateUI() { /* ... (same as before) ... */
    UIManager.updateTurnIndicator(ChessLogic.getCurrentPlayer()); UIManager.updateCapturedPieces(ChessLogic.getCapturedPieces()); UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus()); const history = ChessLogic.getMoveHistory(); const moveListElement = document.getElementById('move-list'); if (moveListElement) { moveListElement.innerHTML = ''; let moveCounter = 1; for (let i = 0; i < history.length; i++) { const playerColor = (i % 2 === 0) ? ChessLogic.COLORS.WHITE : ChessLogic.COLORS.BLACK; UIManager.addMoveToHistory(history[i], moveCounter, playerColor); if (playerColor === ChessLogic.COLORS.BLACK) { moveCounter++; } } moveListElement.scrollTop = moveListElement.scrollHeight; }
}

// --- Event Handlers for User Interaction ---

/** Handles click events on the Three.js canvas. ADDED LOGGING */
function onCanvasClick(event) {
    console.log("--- onCanvasClick Triggered ---"); // Log when clicked

    if (!gameReady) { console.log("Ignoring click: Game not ready yet."); return; }
    if (!isPlayerTurn) { console.log("Ignoring click: Not player's turn."); return; }
    if (isDragging) { console.log("Ignoring click: Dragging."); return; }

    const intersects = ThreeSetup.getIntersects(event);

    // *** NEW: Log the intersects array returned by getIntersects ***
    console.log("Intersects found by getIntersects:", intersects);

    if (intersects.length > 0) {
        // Get the primary intersected object (should be piece GROUP, square, or highlight)
        const clickedObject = intersects[0].object;
        const userData = clickedObject.userData || {}; // Use empty object if userData is missing

        // *** NEW: Log the identified clicked object and its userData ***
        console.log("Processing clicked object:", clickedObject.name, clickedObject.type);
        console.log("Clicked object userData:", userData);

        if (userData.type === 'piece') {
            console.log(`Clicked on a piece: Type=${userData.pieceType}, Color=${userData.color}, Coords=[${userData.row}, ${userData.col}]`);
            const pieceLogic = ChessLogic.getPieceAt(userData.row, userData.col);
            if (pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                console.log("Clicked own piece. Selecting...");
                selectPiece(clickedObject); // Pass the GROUP
            } else if (selectedPieceMesh && pieceLogic && pieceLogic.color !== ChessLogic.getCurrentPlayer()) {
                console.log("Clicked opponent piece while selected. Attempting capture...");
                attemptMove(userData.row, userData.col);
            } else if (selectedPieceMesh && (!pieceLogic || pieceLogic.color === ChessLogic.getCurrentPlayer())) {
                 if (clickedObject === selectedPieceMesh) {
                     console.log("Clicked selected piece again. Deselecting...");
                     deselectPiece();
                 } else if (pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                     console.log("Clicked different own piece. Selecting new one...");
                     selectPiece(clickedObject); // Pass the GROUP
                 } else {
                     console.log("Clicked empty square while piece selected. Attempting move...");
                     // This case should likely be handled by the 'square'/'highlight' type check below
                     // If we reach here, it might mean the square wasn't detected properly.
                     // For now, attempt move if a piece is selected.
                     attemptMove(userData.row, userData.col); // Attempt move to this piece's square? Risky.
                 }
            } else {
                console.log("Clicked opponent piece without selection, or other case. Deselecting.");
                deselectPiece();
            }
        } else if (userData.type === 'square' || userData.type === 'highlight') {
            console.log(`Clicked on a ${userData.type}: Coords=[${userData.row}, ${userData.col}]`);
            if (selectedPieceMesh) {
                console.log("Piece selected. Attempting move to square/highlight...");
                attemptMove(userData.row, userData.col);
            } else {
                console.log("No piece selected. Deselecting.");
                deselectPiece();
            }
        } else {
             console.log("Clicked something irrelevant. Deselecting.");
             deselectPiece();
        }
    } else {
        console.log("Clicked empty space (no intersects). Deselecting.");
        deselectPiece();
    }
    console.log("--- onCanvasClick Finished ---");
}

/** Selects a piece. (No changes needed) */
function selectPiece(pieceMeshGroup) { /* ... (same as before) ... */
    if (selectedPieceMesh === pieceMeshGroup) return; deselectPiece(); selectedPieceMesh = pieceMeshGroup; const { row, col } = selectedPieceMesh.userData; const pieceLogic = ChessLogic.getPieceAt(row, col); if (!pieceLogic || pieceLogic.color !== ChessLogic.getCurrentPlayer()) { console.warn("Selected piece mismatch between mesh and logic state."); deselectPiece(); return; } validMoveCoords = ChessLogic.getValidMovesForPiece(row, col); ThreeSetup.showHighlights(validMoveCoords); console.log(`Selected: ${selectedPieceMesh.userData.color} ${selectedPieceMesh.userData.pieceType} at [${row}, ${col}]`);
}
/** Deselects a piece. (No changes needed) */
function deselectPiece() { /* ... (same as before) ... */
    if (selectedPieceMesh) { selectedPieceMesh = null; } validMoveCoords = []; ThreeSetup.clearHighlights();
}
/** Attempts a move. (No changes needed) */
function attemptMove(targetRow, targetCol) { /* ... (same as before) ... */
    if (!selectedPieceMesh) { console.warn("Attempted move without selected piece."); return; } const startRow = selectedPieceMesh.userData.row; const startCol = selectedPieceMesh.userData.col; const isValidTarget = validMoveCoords.some(move => move.row === targetRow && move.col === targetCol); if (!isValidTarget) { console.log("Clicked square is not a valid move for the selected piece."); deselectPiece(); return; } console.log(`Attempting move: ${selectedPieceMesh.userData.pieceType} from [${startRow}, ${startCol}] to [${targetRow}, ${targetCol}]`); let promotionPieceType = null; const pieceLogic = ChessLogic.getPieceAt(startRow, startCol); const promotionRank = ChessLogic.getCurrentPlayer() === ChessLogic.COLORS.WHITE ? 0 : 7; if (pieceLogic && pieceLogic.type === ChessLogic.PIECE_TYPES.PAWN && targetRow === promotionRank) { promotionPieceType = ChessLogic.PIECE_TYPES.QUEEN; console.log(`Auto-promoting pawn to ${promotionPieceType}`); } const humanPieceMesh = selectedPieceMesh; const moveResult = ChessLogic.makeMove(startRow, startCol, targetRow, targetCol, promotionPieceType); if (moveResult.success) { console.log("Move successful in logic:", moveResult.moveNotation); handleMoveResultGraphics(moveResult, humanPieceMesh); updateUI(); deselectPiece(); const currentTurnPlayer = ChessLogic.getCurrentPlayer(); const currentStatus = ChessLogic.getGameStatus(); if (!currentStatus.isCheckmate && !currentStatus.isStalemate && currentTurnPlayer === CPU_PLAYER_COLOR) { isPlayerTurn = false; console.log("CPU's turn..."); UIManager.updateGameStatusDisplay({ info: "CPU is thinking..."}); setTimeout(triggerAIMove, 500); } else { isPlayerTurn = true; if (currentStatus.isCheckmate || currentStatus.isStalemate) { console.log("Game Over."); } } } else { console.error("Move failed validation in ChessLogic even after passing UI check.", {startRow, startCol, targetRow, targetCol}); isPlayerTurn = true; deselectPiece(); }
}
/** Handles move graphics. (No changes needed) */
function handleMoveResultGraphics(moveResult, movingPieceMesh) { /* ... (same as before) ... */
    if (!moveResult || !moveResult.move) { console.error("handleMoveResultGraphics called with invalid moveResult:", moveResult); return; } if (moveResult.capturedPiece) { let capturedRow = moveResult.move.endRow; let capturedCol = moveResult.move.endCol; if (moveResult.specialMoves.enPassantCapture && moveResult.enPassantCaptureCoords) { capturedRow = moveResult.enPassantCaptureCoords.row; capturedCol = moveResult.enPassantCaptureCoords.col; } const capturedMesh = ThreeSetup.getPieceMeshAt(capturedRow, capturedCol); if (capturedMesh && capturedMesh !== movingPieceMesh) { console.log(`Removing captured ${moveResult.capturedPiece.type} mesh at: [${capturedRow}, ${capturedCol}]`); ThreeSetup.removePieceMesh(capturedMesh); } else if (!capturedMesh) { console.warn(`Captured piece ${moveResult.capturedPiece.type} reported by logic, but no mesh found at capture coords [${capturedRow}, ${capturedCol}]`); } } if (!moveResult.specialMoves.promotion && movingPieceMesh && movingPieceMesh.parent === pieceGroup) { ThreeSetup.movePieceMesh(movingPieceMesh, moveResult.move.endRow, moveResult.move.endCol); } else if (moveResult.specialMoves.promotion && movingPieceMesh) { console.log(`Removing pawn mesh at [${moveResult.move.startRow}, ${moveResult.move.startCol}] due to promotion.`); ThreeSetup.removePieceMesh(movingPieceMesh); } if (moveResult.specialMoves.castled && moveResult.castledRookMove) { const rookMesh = ThreeSetup.getPieceMeshAt(moveResult.castledRookMove.startRow, moveResult.castledRookMove.startCol); if (rookMesh) { ThreeSetup.movePieceMesh(rookMesh, moveResult.castledRookMove.endRow, moveResult.castledRookMove.endCol); console.log("Moved castling rook mesh in 3D scene."); } else { console.error("Could not find rook mesh for castling!"); } } if (moveResult.specialMoves.promotion) { console.log(`Adding new ${moveResult.specialMoves.promotion} mesh at [${moveResult.move.endRow}, ${moveResult.move.endCol}]`); const newPieceLogic = ChessLogic.getPieceAt(moveResult.move.endRow, moveResult.move.endCol); if (newPieceLogic) { ThreeSetup.addPieceToScene(newPieceLogic.type, newPieceLogic.color, moveResult.move.endRow, moveResult.move.endCol); } else { console.error("Logic error: Piece not found at promotion square after promotion!"); } }
}
/** Triggers AI move. (No changes needed) */
function triggerAIMove() { /* ... (same as before) ... */
    console.log(`Triggering AI move calculation with depth ${aiSearchDepth}...`); if (!gameReady) { console.error("AI cannot move, game not ready."); isPlayerTurn = true; return; } const aiMove = ChessLogic.getBestMoveMinimax(aiSearchDepth); if (aiMove) { console.log("AI chose move:", aiMove); const movingAiMesh = ThreeSetup.getPieceMeshAt(aiMove.startRow, aiMove.startCol); if (!movingAiMesh) { console.error("AI move error: Could not find the 3D mesh for the piece at", aiMove.startRow, aiMove.startCol); isPlayerTurn = true; UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus()); return; } const aiMoveResult = ChessLogic.makeMove(aiMove.startRow, aiMove.startCol, aiMove.endRow, aiMove.endCol, aiMove.promotion); if (aiMoveResult.success) { console.log("AI move successful in logic:", aiMoveResult.moveNotation); handleMoveResultGraphics(aiMoveResult, movingAiMesh); updateUI(); } else { console.error("AI generated an invalid move!", aiMove); } } else { console.log("AI has no legal moves. Game should be over."); updateUI(); } const finalStatus = ChessLogic.getGameStatus(); if (!finalStatus.isCheckmate && !finalStatus.isStalemate) { isPlayerTurn = true; console.log("Player's turn..."); } else { isPlayerTurn = false; console.log("Game over."); } UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus());
}

// --- Drag and Drop Handlers (Placeholders) ---
function onCanvasMouseDown(event) { /* ... placeholder ... */ }
function onCanvasMouseMove(event) { /* ... placeholder ... */ }
function onCanvasMouseUp(event) { /* ... placeholder ... */ }

// --- Start the Application ---
document.addEventListener('DOMContentLoaded', initApp);

