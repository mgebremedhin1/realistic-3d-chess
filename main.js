import * as THREE from 'three'; // Import the entire Three.js library
import * as ThreeSetup from './threeSetup.js'; // Import our Three.js setup functions
import * as ChessLogic from './chessLogic.js'; // Import our chess rules and game state logic
import * as UIManager from './uiManager.js'; // Import our UI update functions

// --- Global State Variables for Interaction ---
let selectedPieceMesh = null; // Stores the 3D mesh (Group) of the currently selected piece
let validMoveCoords = [];   // Stores the coordinates [{row, col}, ...] of valid moves for the selected piece
let isDragging = false;       // Basic flag for drag-and-drop state (optional)

// --- AI Configuration ---
const CPU_PLAYER_COLOR = ChessLogic.COLORS.BLACK; // Set the CPU to play as Black
let isPlayerTurn = true; // Flag to disable player input during CPU turn
let aiSearchDepth = 2; // <-- NEW: How many moves ahead the AI looks (e.g., 1=Easy, 2=Medium, 3=Harder but slower)

// --- Initialization ---

/**
 * Initializes the entire application: UI, 3D scene, game logic, and event listeners.
 */
function initApp() {
    console.log("Initializing Chess Application...");
    UIManager.initUIManager();
    const sceneContainer = document.getElementById('scene-container');
    if (!sceneContainer) {
        console.error("Fatal Error: #scene-container element not found in HTML!");
        UIManager.updateGameStatusDisplay({ error: "Initialization failed: Missing scene container." });
        return;
    }
    ThreeSetup.init(sceneContainer);
    ChessLogic.initializeGame();
    setupInitialBoard();
    updateUI();
    sceneContainer.addEventListener('click', onCanvasClick);
    UIManager.setupEventListeners(startNewGame);
    isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR);
    console.log("Chess Application Initialized Successfully.");
}

/**
 * Clears the 3D board and sets up pieces based on the current ChessLogic board state.
 */
function setupInitialBoard() {
    ThreeSetup.clearPieces();
    const boardState = ChessLogic.getBoardState();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece) {
                ThreeSetup.addPieceToScene(piece.type, piece.color, r, c);
            }
        }
    }
    console.log("Initial 3D board populated from logic state.");
}

/**
 * Resets the game state and UI to start a new game.
 */
function startNewGame() {
    console.log("Starting New Game...");
    ChessLogic.initializeGame();
    setupInitialBoard();
    UIManager.clearUI();
    updateUI();
    ThreeSetup.clearHighlights();
    selectedPieceMesh = null;
    validMoveCoords = [];
    isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR); // Reset turn flag
}

/**
 * Updates all relevant HTML UI elements based on the current game state from ChessLogic.
 */
function updateUI() {
    UIManager.updateTurnIndicator(ChessLogic.getCurrentPlayer());
    UIManager.updateCapturedPieces(ChessLogic.getCapturedPieces());
    UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus());

    const history = ChessLogic.getMoveHistory();
    const moveListElement = document.getElementById('move-list');
    if (moveListElement) {
        moveListElement.innerHTML = '';
        let moveCounter = 1;
        for (let i = 0; i < history.length; i++) {
            const playerColor = (i % 2 === 0) ? ChessLogic.COLORS.WHITE : ChessLogic.COLORS.BLACK;
            UIManager.addMoveToHistory(history[i], moveCounter, playerColor);
            if (playerColor === ChessLogic.COLORS.BLACK) {
                moveCounter++;
            }
        }
        moveListElement.scrollTop = moveListElement.scrollHeight;
    }
}


// --- Event Handlers for User Interaction ---

/**
 * Handles click events on the Three.js canvas.
 */
function onCanvasClick(event) {
    if (!isPlayerTurn) { // Check if it's the player's turn
        console.log("Ignoring click: Not player's turn.");
        return;
    }
    if (isDragging) return;

    const intersects = ThreeSetup.getIntersects(event);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const userData = clickedObject.userData;

        if (userData && userData.type === 'piece') {
            const pieceLogic = ChessLogic.getPieceAt(userData.row, userData.col);
            if (pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                selectPiece(clickedObject);
            } else if (selectedPieceMesh && pieceLogic && pieceLogic.color !== ChessLogic.getCurrentPlayer()) {
                attemptMove(userData.row, userData.col);
            } else if (selectedPieceMesh && pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                 selectPiece(clickedObject);
            } else {
                 deselectPiece();
            }
        } else if (userData && (userData.type === 'square' || userData.type === 'highlight')) {
            if (selectedPieceMesh) {
                attemptMove(userData.row, userData.col);
            } else {
                 deselectPiece();
            }
        } else {
             deselectPiece();
        }
    } else {
        deselectPiece();
    }
}

/**
 * Selects a piece: stores its mesh, gets valid moves, and shows highlights.
 */
function selectPiece(pieceMeshGroup) {
    if (selectedPieceMesh === pieceMeshGroup) return;
    deselectPiece();
    selectedPieceMesh = pieceMeshGroup;
    const { row, col } = selectedPieceMesh.userData;
    validMoveCoords = ChessLogic.getValidMovesForPiece(row, col);
    ThreeSetup.showHighlights(validMoveCoords);
    console.log(`Selected: ${selectedPieceMesh.userData.color} ${selectedPieceMesh.userData.pieceType} at [${row}, ${col}]`);
}

/**
 * Deselects the currently selected piece and clears highlights.
 */
function deselectPiece() {
    selectedPieceMesh = null;
    validMoveCoords = [];
    ThreeSetup.clearHighlights();
}

/**
 * Attempts to make a move from the selected piece to the target square coordinates.
 */
function attemptMove(targetRow, targetCol) {
    if (!selectedPieceMesh) return;

    const startRow = selectedPieceMesh.userData.row;
    const startCol = selectedPieceMesh.userData.col;

    const isValidTarget = validMoveCoords.some(move => move.row === targetRow && move.col === targetCol);
    if (!isValidTarget) {
        console.log("Clicked square is not a valid move.");
        return;
    }

    console.log(`Attempting move: ${selectedPieceMesh.userData.pieceType} from [${startRow}, ${startCol}] to [${targetRow}, ${targetCol}]`);

    let promotionPieceType = null;
    const pieceLogic = ChessLogic.getPieceAt(startRow, startCol);
    const promotionRank = ChessLogic.getCurrentPlayer() === ChessLogic.COLORS.WHITE ? 0 : 7;
    if (pieceLogic && pieceLogic.type === ChessLogic.PIECE_TYPES.PAWN && targetRow === promotionRank) {
        promotionPieceType = ChessLogic.PIECE_TYPES.QUEEN; // Auto-promote to Queen
        console.log(`Auto-promoting pawn to ${promotionPieceType}`);
    }

    const humanPieceMesh = selectedPieceMesh; // Store mesh ref before deselecting

    // --- Call ChessLogic to Make the Move ---
    const moveResult = ChessLogic.makeMove(startRow, startCol, targetRow, targetCol, promotionPieceType);

    // --- Process the Result ---
    if (moveResult.success) {
        console.log("Move successful in logic:", moveResult.moveNotation);
        handleMoveResultGraphics(moveResult, humanPieceMesh); // Update 3D graphics
        updateUI(); // Update HTML UI
        deselectPiece(); // Deselect piece

        // --- Check if it's CPU's turn ---
        const currentTurnPlayer = ChessLogic.getCurrentPlayer();
        const currentStatus = ChessLogic.getGameStatus();

        if (!currentStatus.isCheckmate && !currentStatus.isStalemate && currentTurnPlayer === CPU_PLAYER_COLOR) {
            isPlayerTurn = false; // Disable player input
            console.log("CPU's turn (Black)...");
            UIManager.updateGameStatusDisplay({ info: "CPU is thinking..."}); // Optional message

            // Use setTimeout to allow UI to update and give a brief pause before AI thinks
            setTimeout(triggerAIMove, 500); // Delay AI move by 500ms
        } else {
             isPlayerTurn = true; // Still human turn or game over
        }

    } else {
        console.log("Move invalid or failed according to ChessLogic.");
        isPlayerTurn = true; // Ensure player can move if attempt failed
    }
}

/**
 * Handles updating the 3D graphics after a move is successful in the logic.
 */
function handleMoveResultGraphics(moveResult, movingPieceMesh) {
    // Check if moveResult and moveResult.move exist before accessing properties
    if (!moveResult || !moveResult.move) {
        console.error("handleMoveResultGraphics called with invalid moveResult:", moveResult);
        return;
    }

    // 1. Remove captured piece mesh
    if (moveResult.capturedPiece) {
        let capturedRow = moveResult.move.endRow;
        let capturedCol = moveResult.move.endCol;
        if (moveResult.specialMoves.enPassantCapture && moveResult.enPassantCaptureCoords) {
            capturedRow = moveResult.enPassantCaptureCoords.row;
            capturedCol = moveResult.enPassantCaptureCoords.col;
        }
        const capturedMesh = ThreeSetup.getPieceMeshAt(capturedRow, capturedCol);
        if (capturedMesh && capturedMesh !== movingPieceMesh) {
             console.log(`Removing captured ${moveResult.capturedPiece.type} mesh at: [${capturedRow}, ${capturedCol}]`);
             ThreeSetup.removePieceMesh(capturedMesh);
         } else if (capturedMesh == null && moveResult.capturedPiece) {
              console.warn(`Captured piece ${moveResult.capturedPiece.type} reported by logic, but no mesh found at [${capturedRow}, ${capturedCol}]`);
         }
    }

    // 2. Move the piece's 3D mesh (if it exists and wasn't promoted)
     if (!moveResult.specialMoves.promotion && movingPieceMesh) {
        ThreeSetup.movePieceMesh(movingPieceMesh, moveResult.move.endRow, moveResult.move.endCol);
    }

    // 3. Handle castling rook move in 3D
    if (moveResult.specialMoves.castled && moveResult.castledRookMove) {
        const rookMesh = ThreeSetup.getPieceMeshAt(moveResult.castledRookMove.startRow, moveResult.castledRookMove.startCol);
        if (rookMesh) {
            ThreeSetup.movePieceMesh(rookMesh, moveResult.castledRookMove.endRow, moveResult.castledRookMove.endCol);
             console.log("Moved castling rook mesh in 3D scene.");
        } else {
             console.error("Could not find rook mesh for castling!");
        }
    }

     // 4. Handle promotion piece change in 3D
     if (moveResult.specialMoves.promotion) {
         console.log(`Updating 3D model for promotion at [${moveResult.move.endRow}, ${moveResult.move.endCol}] to ${moveResult.specialMoves.promotion}`);
         const pawnMesh = movingPieceMesh && movingPieceMesh.userData.type === ChessLogic.PIECE_TYPES.PAWN ? movingPieceMesh : ThreeSetup.getPieceMeshAt(moveResult.move.endRow, moveResult.move.endCol);
         if (pawnMesh) {
            ThreeSetup.removePieceMesh(pawnMesh);
         } else {
             console.warn("Could not find promoted pawn mesh at destination square for removal.");
         }
         const newPieceLogic = ChessLogic.getPieceAt(moveResult.move.endRow, moveResult.move.endCol);
         if (newPieceLogic) {
             ThreeSetup.addPieceToScene(newPieceLogic.type, newPieceLogic.color, moveResult.move.endRow, moveResult.move.endCol);
         } else {
             console.error("Logic error: Piece not found at promotion square after promotion!");
         }
     }
}

/**
 * Triggers the AI's move calculation and execution.
 */
function triggerAIMove() {
    console.log(`Triggering AI move calculation with depth ${aiSearchDepth}...`);

    // --- MODIFIED: Call getBestMoveMinimax instead of getRandomMoveForComputer ---
    const aiMove = ChessLogic.getBestMoveMinimax(aiSearchDepth);

    if (aiMove) {
        console.log("AI chose move:", aiMove);
        const movingAiMesh = ThreeSetup.getPieceMeshAt(aiMove.startRow, aiMove.startCol);
        if (!movingAiMesh) {
             console.error("AI move error: Could not find the 3D mesh for the piece at", aiMove.startRow, aiMove.startCol);
             isPlayerTurn = true;
             UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus());
             return;
        }

        // Make the move in the logic
        // Ensure promotion type from aiMove object is passed if it exists
        const aiMoveResult = ChessLogic.makeMove(aiMove.startRow, aiMove.startCol, aiMove.endRow, aiMove.endCol, aiMove.promotion);

        if (aiMoveResult.success) {
            console.log("AI move successful in logic:", aiMoveResult.moveNotation);
            handleMoveResultGraphics(aiMoveResult, movingAiMesh); // Update graphics
            updateUI(); // Update UI
        } else {
            console.error("AI move failed validation!", aiMove); // Should ideally not happen if getBestMove is correct
        }
    } else {
        console.log("AI has no legal moves."); // Game is over
    }

    // Check game status again AFTER AI move
     const finalStatus = ChessLogic.getGameStatus();
     if (!finalStatus.isCheckmate && !finalStatus.isStalemate) {
        isPlayerTurn = true; // Re-enable player input
        console.log("Player's turn (White)...");
     } else {
         isPlayerTurn = false; // Game over
         console.log("Game over.");
     }
     UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus()); // Update status display
}

// --- Drag and Drop Handlers (Optional Placeholders - Unchanged) ---
function onCanvasMouseDown(event) { /* ... placeholder ... */ }
function onCanvasMouseMove(event) { /* ... placeholder ... */ }
function onCanvasMouseUp(event) { /* ... placeholder ... */ }

// --- Start the Application ---
document.addEventListener('DOMContentLoaded', initApp);
