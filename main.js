import * as THREE from 'three'; // Although not used directly here, it's good practice if expanding
import * as ThreeSetup from './threeSetup.js'; // Import our Three.js setup functions
import * as ChessLogic from './chessLogic.js'; // Import our chess rules and game state logic
import * as UIManager from './uiManager.js'; // Import our UI update functions

// --- Global State Variables for Interaction ---
let selectedPieceMesh = null; // Stores the 3D mesh (Group) of the currently selected piece
let validMoveCoords = [];   // Stores the coordinates [{row, col}, ...] of valid moves for the selected piece
let isDragging = false;       // Basic flag for drag-and-drop state (optional)
let gameReady = false;        // *** NEW: Flag to indicate if models are loaded and game is ready ***

// --- AI Configuration ---
const CPU_PLAYER_COLOR = ChessLogic.COLORS.BLACK; // Set the CPU to play as Black
let isPlayerTurn = true; // Flag to disable player input during CPU turn
let aiSearchDepth = 2; // How many moves ahead the AI looks

// --- Initialization ---

/**
 * Initializes the entire application: UI, 3D scene, game logic, and event listeners.
 * Waits for 3D setup (including model loading) to complete before setting up the board.
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

    // *** MODIFIED: Call ThreeSetup.init with a callback ***
    // The code inside the () => { ... } callback function will ONLY run
    // AFTER the models have finished loading (or failed).
    ThreeSetup.init(sceneContainer, () => {
        console.log("Three.js init complete callback received in main.js.");

        // Check if models actually loaded successfully before proceeding
        if (!ThreeSetup.modelsLoaded) {
             console.error("Models failed to load. Cannot setup initial board.");
             UIManager.updateGameStatusDisplay({ error: "Error loading 3D models." });
             // Optionally disable game controls here
             return; // Stop initialization
        }

        // --- Initialize Game Logic and UI AFTER models are ready ---
        ChessLogic.initializeGame();
        setupInitialBoard(); // Now safe to call this
        updateUI();          // Update UI after board is set up
        UIManager.setupEventListeners(startNewGame); // Setup button listeners
        isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR);
        gameReady = true; // *** NEW: Set game ready flag ***
        console.log("Chess Application Initialized Successfully (including models).");
        // Trigger first AI move if it's AI's turn initially (unlikely in standard chess)
        // if (!isPlayerTurn) { triggerAIMove(); }
    });

    // Note: Event listeners that rely on game state or pieces (like onCanvasClick)
    // should ideally check the `gameReady` flag or be enabled only after init completes.
    sceneContainer.addEventListener('click', onCanvasClick);

    console.log("Initial setup started, waiting for 3D scene and models...");
    // Don't initialize logic or board here anymore, wait for the callback.
}

/**
 * Clears the 3D board and sets up pieces based on the current ChessLogic board state.
 * Should only be called AFTER models are loaded.
 */
function setupInitialBoard() {
    ThreeSetup.clearPieces();
    const boardState = ChessLogic.getBoardState();
    if (!boardState) {
        console.error("Cannot setup initial board: ChessLogic boardState is null.");
        return;
    }
    console.log("Setting up initial board pieces...");
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece) {
                // This now calls the version of addPieceToScene that uses the loaded model
                const pieceMesh = ThreeSetup.addPieceToScene(piece.type, piece.color, r, c);
                if (!pieceMesh) {
                     console.warn(`Failed to create mesh for ${piece.color} ${piece.type} at [${r},${c}]`);
                }
            }
        }
    }
    console.log("Initial 3D board populated from logic state.");
}

/**
 * Resets the game state and UI to start a new game.
 * Ensures models are loaded before setting up the board.
 */
function startNewGame() {
    console.log("Starting New Game...");
    if (!gameReady) {
        console.warn("Cannot start new game yet, models not ready.");
        // Optionally show a message to the user
        return;
    }
    ChessLogic.initializeGame();
    setupInitialBoard(); // Re-setup the board with models
    UIManager.clearUI();
    updateUI();
    ThreeSetup.clearHighlights();
    selectedPieceMesh = null;
    validMoveCoords = [];
    isPlayerTurn = (ChessLogic.getCurrentPlayer() !== CPU_PLAYER_COLOR); // Reset turn flag
    console.log("New game started.");
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
        moveListElement.innerHTML = ''; // Clear list
        let moveCounter = 1;
        for (let i = 0; i < history.length; i++) {
            const playerColor = (i % 2 === 0) ? ChessLogic.COLORS.WHITE : ChessLogic.COLORS.BLACK;
            UIManager.addMoveToHistory(history[i], moveCounter, playerColor);
            if (playerColor === ChessLogic.COLORS.BLACK) {
                moveCounter++;
            }
        }
        // Scroll to bottom
        moveListElement.scrollTop = moveListElement.scrollHeight;
    }
}


// --- Event Handlers for User Interaction ---

/**
 * Handles click events on the Three.js canvas.
 */
function onCanvasClick(event) {
    // *** NEW: Check if game is ready before processing clicks ***
    if (!gameReady) {
        console.log("Ignoring click: Game not ready yet.");
        return;
    }
    if (!isPlayerTurn) { // Check if it's the player's turn
        console.log("Ignoring click: Not player's turn.");
        return;
    }
    if (isDragging) return; // Ignore clicks during drag (if implemented)

    const intersects = ThreeSetup.getIntersects(event);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object; // This is the group or mesh with userData
        const userData = clickedObject.userData;

        // Debugging log
        // console.log("Clicked:", userData);

        if (userData && userData.type === 'piece') {
            const pieceLogic = ChessLogic.getPieceAt(userData.row, userData.col);
            if (pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                // Clicked on own piece - select it
                selectPiece(clickedObject);
            } else if (selectedPieceMesh && pieceLogic && pieceLogic.color !== ChessLogic.getCurrentPlayer()) {
                // Clicked on opponent's piece while a piece is selected - attempt capture
                attemptMove(userData.row, userData.col);
            } else if (selectedPieceMesh && (!pieceLogic || pieceLogic.color === ChessLogic.getCurrentPlayer())) {
                 // Clicked on own piece again, or empty square while own piece selected
                 // If same piece, deselect? If different own piece, select new one?
                 if (clickedObject === selectedPieceMesh) {
                     deselectPiece(); // Click same piece again to deselect
                 } else if (pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                     selectPiece(clickedObject); // Select different own piece
                 } else {
                     // Clicked empty square - handled below
                 }
            } else {
                // Clicked opponent piece without selecting own piece first, or other cases
                deselectPiece();
            }
        } else if (userData && (userData.type === 'square' || userData.type === 'highlight')) {
            if (selectedPieceMesh) {
                // Clicked a square/highlight while a piece is selected - attempt move
                attemptMove(userData.row, userData.col);
            } else {
                // Clicked square/highlight without selecting a piece - do nothing
                deselectPiece();
            }
        } else {
            // Clicked something else (e.g., board base) or empty space
             deselectPiece();
        }
    } else {
        // Clicked outside the board/pieces
        deselectPiece();
    }
}

/**
 * Selects a piece: stores its mesh, gets valid moves, and shows highlights.
 */
function selectPiece(pieceMeshGroup) {
    if (selectedPieceMesh === pieceMeshGroup) return; // Already selected
    deselectPiece(); // Deselect previous piece first
    selectedPieceMesh = pieceMeshGroup;
    const { row, col } = selectedPieceMesh.userData; // Get coords from selected mesh's data

    // Ensure piece still exists in logic at that position (sanity check)
    const pieceLogic = ChessLogic.getPieceAt(row, col);
    if (!pieceLogic || pieceLogic.color !== ChessLogic.getCurrentPlayer()) {
         console.warn("Selected piece mismatch between mesh and logic state.");
         deselectPiece();
         return;
    }

    validMoveCoords = ChessLogic.getValidMovesForPiece(row, col);
    ThreeSetup.showHighlights(validMoveCoords); // Show highlights on the board
    console.log(`Selected: ${selectedPieceMesh.userData.color} ${selectedPieceMesh.userData.pieceType} at [${row}, ${col}]`);
    // Optional: visually indicate selection (e.g., slightly raise piece, add outline)
    // selectedPieceMesh.position.y += 0.5; // Example: lift piece slightly
}

/**
 * Deselects the currently selected piece and clears highlights.
 */
function deselectPiece() {
    if (selectedPieceMesh) {
        // Optional: Lower piece back down if it was raised on selection
        // selectedPieceMesh.position.y -= 0.5; // Example: lower piece back
        selectedPieceMesh = null;
    }
    validMoveCoords = [];
    ThreeSetup.clearHighlights(); // Remove highlights from the board
}

/**
 * Attempts to make a move from the selected piece to the target square coordinates.
 */
function attemptMove(targetRow, targetCol) {
    if (!selectedPieceMesh) {
        console.warn("Attempted move without selected piece.");
        return;
    }

    const startRow = selectedPieceMesh.userData.row;
    const startCol = selectedPieceMesh.userData.col;

    // Check if the target square is in the list of valid moves
    const isValidTarget = validMoveCoords.some(move => move.row === targetRow && move.col === targetCol);
    if (!isValidTarget) {
        console.log("Clicked square is not a valid move for the selected piece.");
        // Maybe provide visual feedback (e.g., flash square red briefly?)
        deselectPiece(); // Deselect if clicking invalid square
        return;
    }

    console.log(`Attempting move: ${selectedPieceMesh.userData.pieceType} from [${startRow}, ${startCol}] to [${targetRow}, ${targetCol}]`);

    // Handle Pawn Promotion (Auto-Queen for simplicity)
    let promotionPieceType = null;
    const pieceLogic = ChessLogic.getPieceAt(startRow, startCol);
    const promotionRank = ChessLogic.getCurrentPlayer() === ChessLogic.COLORS.WHITE ? 0 : 7;
    if (pieceLogic && pieceLogic.type === ChessLogic.PIECE_TYPES.PAWN && targetRow === promotionRank) {
        // In a real game, you'd prompt the user here. We'll auto-queen.
        promotionPieceType = ChessLogic.PIECE_TYPES.QUEEN;
        console.log(`Auto-promoting pawn to ${promotionPieceType}`);
        // TODO: Implement UI prompt for promotion choice later
    }

    const humanPieceMesh = selectedPieceMesh; // Store mesh ref before deselecting

    // --- Call ChessLogic to Make the Move ---
    const moveResult = ChessLogic.makeMove(startRow, startCol, targetRow, targetCol, promotionPieceType);

    // --- Process the Result ---
    if (moveResult.success) {
        console.log("Move successful in logic:", moveResult.moveNotation);
        // Update 3D graphics based on the successful move
        handleMoveResultGraphics(moveResult, humanPieceMesh);
        updateUI(); // Update HTML UI (turn indicator, captured pieces, history)
        deselectPiece(); // Deselect piece after successful move

        // --- Check if it's CPU's turn ---
        const currentTurnPlayer = ChessLogic.getCurrentPlayer();
        const currentStatus = ChessLogic.getGameStatus();

        if (!currentStatus.isCheckmate && !currentStatus.isStalemate && currentTurnPlayer === CPU_PLAYER_COLOR) {
            isPlayerTurn = false; // Disable player input
            console.log("CPU's turn...");
            UIManager.updateGameStatusDisplay({ info: "CPU is thinking..."}); // Optional message

            // Use setTimeout to allow UI to update and give a brief pause before AI thinks
            setTimeout(triggerAIMove, 500); // Delay AI move by 500ms
        } else {
             isPlayerTurn = true; // Still human turn or game over
             if (currentStatus.isCheckmate || currentStatus.isStalemate) {
                 console.log("Game Over.");
                 // Potentially disable further interaction or show overlay
             }
        }

    } else {
        // Logic indicated move was invalid (shouldn't happen if validation is correct)
        console.error("Move failed validation in ChessLogic even after passing UI check.", {startRow, startCol, targetRow, targetCol});
        isPlayerTurn = true; // Ensure player can move if attempt failed unexpectedly
        deselectPiece();
    }
}

/**
 * Handles updating the 3D graphics after a move is successful in the logic.
 */
function handleMoveResultGraphics(moveResult, movingPieceMesh) {
    if (!moveResult || !moveResult.move) {
        console.error("handleMoveResultGraphics called with invalid moveResult:", moveResult);
        return;
    }

    // 1. Remove captured piece mesh
    if (moveResult.capturedPiece) {
        let capturedRow = moveResult.move.endRow;
        let capturedCol = moveResult.move.endCol;
        // Adjust coordinates if it was an en passant capture
        if (moveResult.specialMoves.enPassantCapture && moveResult.enPassantCaptureCoords) {
            capturedRow = moveResult.enPassantCaptureCoords.row;
            capturedCol = moveResult.enPassantCaptureCoords.col;
        }
        // Find the mesh at the capture square (could be different from target square in en passant)
        const capturedMesh = ThreeSetup.getPieceMeshAt(capturedRow, capturedCol);
        if (capturedMesh && capturedMesh !== movingPieceMesh) { // Ensure not trying to remove the moving piece itself
             console.log(`Removing captured ${moveResult.capturedPiece.type} mesh at: [${capturedRow}, ${capturedCol}]`);
             ThreeSetup.removePieceMesh(capturedMesh);
        } else if (!capturedMesh) {
             console.warn(`Captured piece ${moveResult.capturedPiece.type} reported by logic, but no mesh found at capture coords [${capturedRow}, ${capturedCol}]`);
        }
    }

    // 2. Move the piece's 3D mesh (if it still exists and wasn't promoted)
    // Check if the moving piece mesh still exists (it might have been removed if captured simultaneously?)
    if (!moveResult.specialMoves.promotion && movingPieceMesh && movingPieceMesh.parent === ThreeSetup.pieceGroup) { // Check if still in scene graph
         ThreeSetup.movePieceMesh(movingPieceMesh, moveResult.move.endRow, moveResult.move.endCol);
    } else if (moveResult.specialMoves.promotion && movingPieceMesh) {
         // If promoted, remove the old pawn mesh explicitly
         console.log(`Removing pawn mesh at [${moveResult.move.startRow}, ${moveResult.move.startCol}] due to promotion.`);
         ThreeSetup.removePieceMesh(movingPieceMesh);
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
        console.log(`Adding new ${moveResult.specialMoves.promotion} mesh at [${moveResult.move.endRow}, ${moveResult.move.endCol}]`);
        const newPieceLogic = ChessLogic.getPieceAt(moveResult.move.endRow, moveResult.move.endCol); // Get the updated piece from logic
        if (newPieceLogic) {
            // Add the new piece model to the destination square
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
    if (!gameReady) {
        console.error("AI cannot move, game not ready.");
        isPlayerTurn = true; // Give turn back? Or handle error state?
        return;
    }

    // --- Get best move using Minimax ---
    const aiMove = ChessLogic.getBestMoveMinimax(aiSearchDepth);

    if (aiMove) {
        console.log("AI chose move:", aiMove);
        // Find the 3D mesh corresponding to the piece the AI wants to move
        const movingAiMesh = ThreeSetup.getPieceMeshAt(aiMove.startRow, aiMove.startCol);
        if (!movingAiMesh) {
            console.error("AI move error: Could not find the 3D mesh for the piece at", aiMove.startRow, aiMove.startCol);
            isPlayerTurn = true; // Allow player to potentially recover?
            UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus());
            return;
        }

        // Make the move in the logic
        const aiMoveResult = ChessLogic.makeMove(aiMove.startRow, aiMove.startCol, aiMove.endRow, aiMove.endCol, aiMove.promotion);

        if (aiMoveResult.success) {
            console.log("AI move successful in logic:", aiMoveResult.moveNotation);
            // Update graphics based on AI move
            handleMoveResultGraphics(aiMoveResult, movingAiMesh);
            updateUI(); // Update UI after AI move
        } else {
            // This indicates a potential bug in the AI or move validation
            console.error("AI generated an invalid move!", aiMove);
        }
    } else {
        // AI has no legal moves - game should be over (checkmate or stalemate)
        console.log("AI has no legal moves. Game should be over.");
        // Update status just in case it wasn't triggered correctly
        updateUI();
    }

    // Check game status again AFTER AI move
    const finalStatus = ChessLogic.getGameStatus();
    if (!finalStatus.isCheckmate && !finalStatus.isStalemate) {
        isPlayerTurn = true; // Re-enable player input
        console.log("Player's turn...");
    } else {
        isPlayerTurn = false; // Game over
        console.log("Game over.");
    }
    // Ensure final status is displayed
    UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus());
}

// --- Drag and Drop Handlers (Placeholders) ---
function onCanvasMouseDown(event) { /* ... placeholder ... */ }
function onCanvasMouseMove(event) { /* ... placeholder ... */ }
function onCanvasMouseUp(event) { /* ... placeholder ... */ }

// --- Start the Application ---
// Use DOMContentLoaded to ensure HTML is parsed before running scripts
document.addEventListener('DOMContentLoaded', initApp);

