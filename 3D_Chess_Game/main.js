import * as THREE from 'three'; // Import the entire Three.js library
import * as ThreeSetup from './threeSetup.js'; // Import our Three.js setup functions
import * as ChessLogic from './chessLogic.js'; // Import our chess rules and game state logic
import * as UIManager from './uiManager.js'; // Import our UI update functions

// --- Global State Variables for Interaction ---
let selectedPieceMesh = null; // Stores the 3D mesh (Group) of the currently selected piece
let validMoveCoords = [];   // Stores the coordinates [{row, col}, ...] of valid moves for the selected piece
let isDragging = false;       // Basic flag for drag-and-drop state (optional)

// --- Initialization ---

/**
 * Initializes the entire application: UI, 3D scene, game logic, and event listeners.
 * This function is the main entry point, typically called after the DOM is loaded.
 */
function initApp() {
    console.log("Initializing Chess Application...");

    // 1. Initialize the UI Manager to get DOM element references
    UIManager.initUIManager();

    // 2. Initialize the Three.js Scene
    const sceneContainer = document.getElementById('scene-container');
    if (!sceneContainer) {
        console.error("Fatal Error: #scene-container element not found in HTML!");
        // Display error to user?
        UIManager.updateGameStatusDisplay({ error: "Initialization failed: Missing scene container." });
        return;
    }
    ThreeSetup.init(sceneContainer); // Pass the container element to threeSetup

    // 3. Initialize the Chess Logic module to set up the starting board state
    ChessLogic.initializeGame();

    // 4. Populate the 3D board with pieces based on the initial game logic state
    setupInitialBoard();

    // 5. Update the HTML UI elements (turn indicator, etc.) based on the initial state
    updateUI();

    // 6. Setup Event Listeners for user interaction
    // Listen for clicks on the canvas for piece selection/movement
    sceneContainer.addEventListener('click', onCanvasClick);
    // Optional: Add listeners for drag-and-drop interaction
    // sceneContainer.addEventListener('mousedown', onCanvasMouseDown);
    // sceneContainer.addEventListener('mousemove', onCanvasMouseMove);
    // sceneContainer.addEventListener('mouseup', onCanvasMouseUp);

    // Setup UI button listeners (e.g., New Game button)
    // Pass the startNewGame function as the handler for the New Game button
    UIManager.setupEventListeners(startNewGame);

    console.log("Chess Application Initialized Successfully.");
}

/**
 * Clears the 3D board and sets up pieces based on the current ChessLogic board state.
 * Used for initial setup and starting a new game.
 */
function setupInitialBoard() {
    ThreeSetup.clearPieces(); // Remove any existing 3D pieces first
    const boardState = ChessLogic.getBoardState(); // Get the 8x8 array from logic module
    // Iterate through the board state
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c]; // Get piece object {type, color, hasMoved} or null
            if (piece) {
                // If a piece exists at this position, add its 3D representation to the scene
                ThreeSetup.addPieceToScene(piece.type, piece.color, r, c);
            }
        }
    }
    console.log("Initial 3D board populated from logic state.");
}

/**
 * Resets the game state and UI to start a new game.
 * Called when the "New Game" button is clicked.
 */
function startNewGame() {
    console.log("Starting New Game...");
    // 1. Reset the internal chess logic state
    ChessLogic.initializeGame();
    // 2. Reset the 3D board display
    setupInitialBoard();
    // 3. Clear and reset the HTML UI elements
    UIManager.clearUI(); // Clear history, captured pieces, status
    updateUI(); // Update UI to reflect the new initial state (e.g., White's turn)
    // 4. Clear any visual artifacts from the previous game
    ThreeSetup.clearHighlights(); // Remove any leftover move highlights
    selectedPieceMesh = null; // Deselect any piece
    validMoveCoords = [];
    // Reset any other game-specific states if needed
}

/**
 * Updates all relevant HTML UI elements based on the current game state from ChessLogic.
 */
function updateUI() {
    // Update whose turn it is
    UIManager.updateTurnIndicator(ChessLogic.getCurrentPlayer());
    // Update the display of captured pieces
    UIManager.updateCapturedPieces(ChessLogic.getCapturedPieces());
    // Update the game status message (Check, Checkmate, Stalemate)
    UIManager.updateGameStatusDisplay(ChessLogic.getGameStatus());

    // Update the move history list
    // Simple approach: Clear and rebuild the entire list from history
    const history = ChessLogic.getMoveHistory();
    const moveListElement = document.getElementById('move-list');
    if (moveListElement) {
        moveListElement.innerHTML = ''; // Clear the list first
        let moveCounter = 1;
        for (let i = 0; i < history.length; i++) {
            const playerColor = (i % 2 === 0) ? ChessLogic.COLORS.WHITE : ChessLogic.COLORS.BLACK;
            // Add the move to the UI list
            UIManager.addMoveToHistory(history[i], moveCounter, playerColor);
            // Increment move number after Black's move
            if (playerColor === ChessLogic.COLORS.BLACK) {
                moveCounter++;
            }
        }
        // Ensure the list is scrolled to the bottom to show the latest move
        moveListElement.scrollTop = moveListElement.scrollHeight;
    }
}


// --- Event Handlers for User Interaction ---

/**
 * Handles click events on the Three.js canvas.
 * Manages piece selection and triggering move attempts.
 * @param {MouseEvent} event - The mouse click event.
 */
function onCanvasClick(event) {
    // Prevent interference if drag-and-drop is active (optional)
    if (isDragging) return;

    // Perform raycasting to see what was clicked in the 3D scene
    const intersects = ThreeSetup.getIntersects(event);

    if (intersects.length > 0) {
        // The first intersection (intersects[0]) is the closest object clicked
        const clickedObject = intersects[0].object; // This is the piece Group or square Mesh
        const userData = clickedObject.userData; // Get our custom data {type, row, col, pieceType?, color?}

        // --- Case 1: Clicking a piece (Mesh Group) ---
        if (userData && userData.type === 'piece') {
            const pieceLogic = ChessLogic.getPieceAt(userData.row, userData.col); // Verify piece exists in logic

            // Is it the current player's piece?
            if (pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                selectPiece(clickedObject); // Select this piece
            }
            // Is it an opponent's piece, and do we have a piece selected already? (Attempt capture)
            else if (selectedPieceMesh && pieceLogic && pieceLogic.color !== ChessLogic.getCurrentPlayer()) {
                attemptMove(userData.row, userData.col); // Attempt to move selected piece to capture this one
            }
            // Clicking own piece while another is selected -> switch selection
            else if (selectedPieceMesh && pieceLogic && pieceLogic.color === ChessLogic.getCurrentPlayer()) {
                 selectPiece(clickedObject); // Select the newly clicked piece instead
            }
             else {
                 // Clicking opponent piece when nothing valid selected, or clicking empty square under piece?
                 // Generally, deselect if the click isn't a valid action start/end.
                 deselectPiece();
             }
        }
        // --- Case 2: Clicking a square (Mesh) or a highlight (Mesh) ---
        else if (userData && (userData.type === 'square' || userData.type === 'highlight')) {
            // Do we have a piece selected? If yes, attempt to move it to this square.
            if (selectedPieceMesh) {
                attemptMove(userData.row, userData.col);
            } else {
                 // Clicking an empty square or highlight when nothing is selected - do nothing.
                 deselectPiece(); // Ensure highlights are cleared if clicking elsewhere
            }
        }
         // --- Case 3: Clicking something else (e.g., board base, background) ---
         else {
             // Click didn't hit a piece or a square/highlight, deselect any selected piece.
             deselectPiece();
         }

    } else {
        // Clicked outside the board/pieces entirely (missed). Deselect.
        deselectPiece();
    }
}

/**
 * Selects a piece: stores its mesh, gets valid moves, and shows highlights.
 * @param {THREE.Group} pieceMeshGroup - The 3D mesh group of the piece to select.
 */
function selectPiece(pieceMeshGroup) {
    // If the clicked piece is already selected, do nothing (or deselect on second click - optional)
    if (selectedPieceMesh === pieceMeshGroup) {
        // Optional: Deselect on second click
        // deselectPiece();
        return;
    }

    deselectPiece(); // Clear any previous selection and highlights first

    selectedPieceMesh = pieceMeshGroup; // Store the selected mesh group
    const { row, col } = selectedPieceMesh.userData; // Get its board coordinates

    // Get the list of valid moves for this piece from the chess logic
    validMoveCoords = ChessLogic.getValidMovesForPiece(row, col); // Returns array like [{row, col, isCapture,...}, ...]

    // Show highlights on the 3D board for the valid moves
    ThreeSetup.showHighlights(validMoveCoords);

    // Optional: Add visual feedback to the selected piece itself (e.g., slight scale, outline, emissive color)
    // Example: Make the selected piece slightly brighter
    // selectedPieceMesh.traverse(child => {
    //     if (child.isMesh) {
    //         child.material = child.material.clone(); // Clone material to avoid affecting others
    //         child.material.emissive = new THREE.Color(0x444400); // Add a slight yellow glow
    //     }
    // });

    console.log(`Selected: ${selectedPieceMesh.userData.color} ${selectedPieceMesh.userData.pieceType} at [${row}, ${col}]`);
    // console.log("Valid moves:", validMoveCoords); // Log moves for debugging
}

/**
 * Deselects the currently selected piece and clears any associated visual feedback/highlights.
 */
function deselectPiece() {
    if (selectedPieceMesh) {
        // Optional: Remove visual feedback from the deselected piece
        // Example: Reset emissive color
        // selectedPieceMesh.traverse(child => {
        //     if (child.isMesh && child.material.emissive) {
        //         child.material.emissive.setHex(0x000000); // Reset glow
        //     }
        // });
    }
    selectedPieceMesh = null; // Clear the selection reference
    validMoveCoords = []; // Clear the stored valid moves
    ThreeSetup.clearHighlights(); // Remove highlight meshes from the scene
}

/**
 * Attempts to make a move from the selected piece to the target square coordinates.
 * Validates the move with ChessLogic and updates the 3D scene and UI if successful.
 * @param {number} targetRow - The destination row index.
 * @param {number} targetCol - The destination column index.
 */
function attemptMove(targetRow, targetCol) {
    // Ensure a piece is actually selected
    if (!selectedPieceMesh) {
        console.warn("Attempted move without a selected piece.");
        return;
    }

    const startRow = selectedPieceMesh.userData.row;
    const startCol = selectedPieceMesh.userData.col;

    // Check if the target square is actually one of the valid moves highlighted
    const isValidTarget = validMoveCoords.some(move => move.row === targetRow && move.col === targetCol);
    if (!isValidTarget) {
        console.log("Clicked square is not a valid move for the selected piece.");
        // Optional: Provide visual feedback like flashing the square red?
        // Don't deselect here, allow user to choose another valid square or deselect by clicking elsewhere.
        return;
    }


    console.log(`Attempting move: ${selectedPieceMesh.userData.pieceType} from [${startRow}, ${startCol}] to [${targetRow}, ${targetCol}]`);

    // --- Handle Pawn Promotion ---
    // If the move is a pawn reaching the promotion rank, we need to know what piece to promote to.
    let promotionPieceType = null;
    const pieceLogic = ChessLogic.getPieceAt(startRow, startCol); // Get piece info from logic
    const promotionRank = ChessLogic.getCurrentPlayer() === ChessLogic.COLORS.WHITE ? 0 : 7;
    if (pieceLogic && pieceLogic.type === ChessLogic.PIECE_TYPES.PAWN && targetRow === promotionRank) {
        // --- UI Prompt for Promotion ---
        // In a real game, you MUST prompt the user here.
        // For this example, we'll just auto-promote to Queen.
        promotionPieceType = ChessLogic.PIECE_TYPES.QUEEN; // Default to Queen
        console.log(`Auto-promoting pawn to ${promotionPieceType}`);
        // Example of how a prompt might work (pseudo-code):
        // promotionPieceType = await UIManager.promptForPromotion(); // This would pause execution
        // if (!promotionPieceType) return; // User cancelled promotion
    }


    // --- Call ChessLogic to Make the Move ---
    // This function handles all internal game state updates (board, turn, captures, status, etc.)
    const moveResult = ChessLogic.makeMove(startRow, startCol, targetRow, targetCol, promotionPieceType);

    // --- Process the Result ---
    if (moveResult.success) {
        console.log("Move successful in logic:", moveResult.moveNotation);

        // --- Update 3D Scene based on moveResult ---

        // 1. Remove captured piece mesh (if any)
        if (moveResult.capturedPiece) {
             // Determine coords of captured piece (could be target square or en passant square)
             let capturedRow = targetRow;
             let capturedCol = targetCol;
             // If en passant, the captured pawn is not on the target square
             if(moveResult.specialMoves.enPassantCapture && moveResult.enPassantCaptureCoords) {
                 capturedRow = moveResult.enPassantCaptureCoords.row;
                 capturedCol = moveResult.enPassantCaptureCoords.col;
             }
            // Find the 3D mesh at the captured coordinates
            const capturedMesh = ThreeSetup.getPieceMeshAt(capturedRow, capturedCol);
             // Ensure we found a mesh and it's not the piece that just moved (sanity check)
             if (capturedMesh && capturedMesh !== selectedPieceMesh) {
                 console.log(`Removing captured ${moveResult.capturedPiece.type} mesh at: [${capturedRow}, ${capturedCol}]`);
                 ThreeSetup.removePieceMesh(capturedMesh);
             } else if (moveResult.specialMoves.enPassantCapture) {
                 // Log warning if en passant capture happened but mesh wasn't found at expected coords
                 console.warn("Could not find mesh for en passant capture at:", capturedRow, capturedCol);
             } else if (capturedMesh === selectedPieceMesh){
                 // Should not happen if logic is correct
                 console.error("Logic error: Captured piece mesh is the same as the moving piece?");
             } else if (capturedMesh == null && moveResult.capturedPiece) {
                  console.warn(`Captured piece ${moveResult.capturedPiece.type} reported by logic, but no mesh found at [${capturedRow}, ${capturedCol}]`);
             }
        }

        // 2. Move the selected piece's 3D mesh
        // Check if the piece was promoted (in which case selectedPieceMesh might be invalid/removed)
        if (!moveResult.specialMoves.promotion) {
            ThreeSetup.movePieceMesh(selectedPieceMesh, targetRow, targetCol);
        }


        // 3. Handle castling rook move in 3D
        if (moveResult.specialMoves.castled && moveResult.castledRookMove) {
            // Find the rook mesh at its starting position
            const rookMesh = ThreeSetup.getPieceMeshAt(moveResult.castledRookMove.startRow, moveResult.castledRookMove.startCol);
            if (rookMesh) {
                // Move the rook mesh to its castled position
                ThreeSetup.movePieceMesh(rookMesh, moveResult.castledRookMove.endRow, moveResult.castledRookMove.endCol);
                 console.log("Moved castling rook mesh in 3D scene.");
            } else {
                 // Should not happen if logic/setup is correct
                 console.error("Could not find rook mesh for castling!");
            }
        }

         // 4. Handle promotion piece change in 3D
         if (moveResult.specialMoves.promotion) {
             console.log(`Updating 3D model for promotion at [${targetRow}, ${targetCol}] to ${moveResult.specialMoves.promotion}`);
             // Easiest way: remove the old pawn mesh, add a new mesh for the promoted piece.
             if (selectedPieceMesh) { // Ensure selectedPieceMesh is still valid before removing
                ThreeSetup.removePieceMesh(selectedPieceMesh); // Remove the original pawn mesh
             } else {
                 console.warn("Selected piece mesh was already null/invalid before promotion removal.");
             }
             // Add the new piece model using the updated logic state
             const newPieceLogic = ChessLogic.getPieceAt(targetRow, targetCol); // Get the promoted piece info
             if (newPieceLogic) {
                 ThreeSetup.addPieceToScene(
                     newPieceLogic.type, // The new promoted type
                     newPieceLogic.color, // Color remains the same
                     targetRow,
                     targetCol
                 );
             } else {
                 console.error("Logic error: Piece not found at promotion square after promotion!");
             }
             // Note: selectedPieceMesh is now invalid as the pawn mesh was removed.
         }


        // --- Update HTML UI ---
        updateUI(); // Update turn indicator, captured pieces, status message, move history

        // --- Clean up ---
        deselectPiece(); // Deselect the piece after a successful move

    } else {
        // Move failed validation in ChessLogic
        console.log("Move invalid or failed according to ChessLogic.");
        // Optional: Provide feedback to the user (e.g., flash screen, message)
        // Generally, don't deselect here, let the user try another valid square or click away.
        // If the move failed because it leaves king in check, maybe flash the king?
        // deselectPiece(); // Deselect if the move failed? Or allow trying again?
    }
}


// --- Drag and Drop Handlers (Optional Placeholders) ---
// Basic structure if you want to implement drag-and-drop later

function onCanvasMouseDown(event) {
    // 1. Raycast to see if a piece of the current player is clicked
    // 2. If yes:
    //    - Store the piece mesh in selectedPieceMesh
    //    - Set isDragging = true
    //    - Get valid moves and show highlights (optional during drag)
    //    - Maybe create a temporary 'ghost' mesh to drag around
    //    - Prevent OrbitControls from activating: controls.enabled = false;
}

function onCanvasMouseMove(event) {
    // if (isDragging && selectedPieceMesh) {
    //    // 1. Raycast from mouse onto a plane at y=0 (the board plane)
    //    // 2. Get the intersection point
    //    // 3. Update the position of the 'ghost' mesh to follow the mouse
    // }
}

function onCanvasMouseUp(event) {
    // if (isDragging && selectedPieceMesh) {
    //    // 1. Raycast to the board plane to find the release square coordinates {row, col}
    //    // 2. Attempt the move from selectedPieceMesh's original coords to the release coords
    //    // 3. Clean up:
    //    //    - Remove ghost mesh
    //    //    - isDragging = false
    //    //    - Deselect piece (or handle based on move success)
    //    //    - Re-enable OrbitControls: controls.enabled = true;
    // }
    // // Ensure controls are re-enabled even if not dragging properly
    // isDragging = false;
    // if (controls) controls.enabled = true;
}


// --- Start the Application ---
// Use DOMContentLoaded event to ensure the HTML is fully parsed before running the init script
document.addEventListener('DOMContentLoaded', initApp);
