import { PIECE_TYPES, COLORS } from './chessLogic.js';

// --- DOM Element References ---
// Store references to the HTML elements that display game information.
let turnIndicator;
let gameStatusDisplay;
let capturedWhiteDisplay; // Area showing pieces captured by Black
let capturedBlackDisplay; // Area showing pieces captured by White
let moveList;             // The <ul> element for the move history
let newGameButton;
// Add references for other UI elements if created (e.g., settings button, timers)

// --- Piece Symbols (Unicode) ---
// Map piece types and colors to their standard Unicode chess symbols for display.
const pieceSymbols = {
    [COLORS.WHITE]: {
        [PIECE_TYPES.PAWN]: '♙', // White Pawn
        [PIECE_TYPES.ROOK]: '♖', // White Rook
        [PIECE_TYPES.KNIGHT]: '♘', // White Knight
        [PIECE_TYPES.BISHOP]: '♗', // White Bishop
        [PIECE_TYPES.QUEEN]: '♕', // White Queen
        [PIECE_TYPES.KING]: '♔', // White King
    },
    [COLORS.BLACK]: {
        [PIECE_TYPES.PAWN]: '♟︎', // Black Pawn (using variant selector U+FE0E for solid fill)
        [PIECE_TYPES.ROOK]: '♜', // Black Rook
        [PIECE_TYPES.KNIGHT]: '♞', // Black Knight
        [PIECE_TYPES.BISHOP]: '♝', // Black Bishop
        [PIECE_TYPES.QUEEN]: '♛', // Black Queen
        [PIECE_TYPES.KING]: '♚', // Black King
    }
};


/**
 * Initializes the UI Manager.
 * Gets references to all necessary DOM elements.
 * Should be called once when the application starts.
 */
function initUIManager() {
    // Get elements by their IDs from the HTML
    turnIndicator = document.getElementById('turn-indicator');
    gameStatusDisplay = document.getElementById('game-status');
    capturedWhiteDisplay = document.getElementById('captured-white');
    capturedBlackDisplay = document.getElementById('captured-black');
    moveList = document.getElementById('move-list');
    newGameButton = document.getElementById('new-game-btn');

    // Basic check to ensure all required elements were found
    if (!turnIndicator || !gameStatusDisplay || !capturedWhiteDisplay || !capturedBlackDisplay || !moveList || !newGameButton) {
        console.error("UI Manager Error: One or more required UI elements not found in the DOM. Check HTML IDs.");
        // Optionally, disable UI functionality or throw an error
        return;
    }
     clearUI(); // Ensure UI starts in a clean state
    console.log("UI Manager initialized.");
}

/**
 * Updates the display showing whose turn it is.
 * @param {string} currentPlayer - The color of the current player (COLORS.WHITE or COLORS.BLACK).
 */
function updateTurnIndicator(currentPlayer) {
    if (turnIndicator) {
        // Capitalize the first letter for display (e.g., "White", "Black")
        turnIndicator.textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
        // Optional: Apply different styles based on the current player
        turnIndicator.style.color = currentPlayer === COLORS.WHITE ? '#f0f0f0' : '#cccccc'; // Example styling
    } else {
        console.warn("Attempted to update turn indicator, but element not found.");
    }
}

/**
 * Updates the display areas showing captured pieces for both sides.
 * @param {object} capturedPiecesData - The captured pieces object from chessLogic.getCapturedPieces().
 * Format: { white: [captured_by_black], black: [captured_by_white] }
 */
function updateCapturedPieces(capturedPiecesData) {
    // Update the list of white pieces captured by black
    if (capturedWhiteDisplay) {
        capturedWhiteDisplay.innerHTML = ''; // Clear previous symbols
        // Sort captured pieces (optional, e.g., by value)
        // capturedPiecesData[COLORS.BLACK].sort(comparePieceValue);
        capturedPiecesData[COLORS.BLACK].forEach(piece => {
            const symbol = pieceSymbols[piece.color]?.[piece.type] || '?'; // Get symbol or '?' if unknown
            const span = document.createElement('span');
            span.textContent = symbol;
            span.title = `${piece.color} ${piece.type}`; // Tooltip for accessibility/info
            capturedWhiteDisplay.appendChild(span);
        });
    } else {
         console.warn("Attempted to update captured white pieces, but element not found.");
    }

    // Update the list of black pieces captured by white
    if (capturedBlackDisplay) {
        capturedBlackDisplay.innerHTML = ''; // Clear previous symbols
        // capturedPiecesData[COLORS.WHITE].sort(comparePieceValue);
        capturedPiecesData[COLORS.WHITE].forEach(piece => {
            const symbol = pieceSymbols[piece.color]?.[piece.type] || '?';
            const span = document.createElement('span');
            span.textContent = symbol;
            span.title = `${piece.color} ${piece.type}`;
            capturedBlackDisplay.appendChild(span);
        });
    } else {
         console.warn("Attempted to update captured black pieces, but element not found.");
    }
}

// Optional helper for sorting captured pieces by value (example)
// function comparePieceValue(a, b) {
//     const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
//     return (pieceValues[a.type] || 0) - (pieceValues[b.type] || 0);
// }

/**
 * Adds a move notation to the scrollable move history list.
 * Formats the output like "1. e4 e5" or "2. Nf3 ...".
 * @param {string} moveNotation - The algebraic notation of the move (e.g., "Nf3", "O-O").
 * @param {number} moveNumber - The full move number (increments after Black moves).
 * @param {string} playerColor - The color of the player who made the move (COLORS.WHITE or COLORS.BLACK).
 */
function addMoveToHistory(moveNotation, moveNumber, playerColor) {
    if (moveList) {
        let listItem;
        // If it's White's move, create a new list item (<li>) for the move number.
        if (playerColor === COLORS.WHITE) {
            listItem = document.createElement('li');
            // Use innerHTML to easily include the span for styling the move number
            listItem.innerHTML = `<span class="move-number">${moveNumber}.</span> ${moveNotation}`;
            moveList.appendChild(listItem);
        }
        // If it's Black's move, find the last list item (which should be White's move)
        // and append Black's move notation to it.
        else {
            listItem = moveList.lastElementChild;
            if (listItem) {
                // Check if black's move is already present (e.g., when rebuilding history)
                // A simple check might be looking for '...' or counting spaces.
                // This basic version just appends with a separator.
                 listItem.innerHTML += ` ... ${moveNotation}`; // Add separator and black's move
            } else {
                // Defensive coding: Should not happen if White always moves first,
                // but handle case where history might start with Black's move.
                listItem = document.createElement('li');
                listItem.innerHTML = `<span class="move-number">${moveNumber}.</span> ... ${moveNotation}`;
                moveList.appendChild(listItem);
                console.warn("Move history: Added Black's move without a preceding White move item.");
            }
        }
        // Automatically scroll the move list to show the latest move
        moveList.scrollTop = moveList.scrollHeight;
    } else {
         console.warn("Attempted to add move to history, but element not found.");
    }
}

/**
 * Updates the game status message display (e.g., "Check!", "Checkmate!", "Stalemate!").
 * @param {object} gameStatusData - The game status object from chessLogic.getGameStatus().
 */
function updateGameStatusDisplay(gameStatusData) {
    if (gameStatusDisplay) {
        let statusText = ""; // Default to empty status
        let statusColor = '#ffcc00'; // Default color (e.g., yellow for check/stalemate)

        if (gameStatusData.isCheckmate) {
            const winner = gameStatusData.winner.charAt(0).toUpperCase() + gameStatusData.winner.slice(1);
            statusText = `Checkmate! ${winner} wins.`;
            statusColor = '#ff4d4d'; // Red for checkmate
        } else if (gameStatusData.isStalemate) {
            statusText = "Stalemate! Draw.";
            statusColor = '#ffcc00'; // Yellow for stalemate
        } else if (gameStatusData.isCheck) {
            statusText = "Check!";
            statusColor = '#ffcc00'; // Yellow for check
        }
        // Add other draw conditions here if implemented (e.g., fifty-move rule)

        gameStatusDisplay.textContent = statusText;
        gameStatusDisplay.style.color = statusColor; // Apply appropriate color
    } else {
         console.warn("Attempted to update game status display, but element not found.");
    }
}

/**
 * Clears all dynamic UI elements to reset the display, typically for a new game.
 */
function clearUI() {
     if (turnIndicator) {
        turnIndicator.textContent = 'White'; // Reset to White's turn display
        turnIndicator.style.color = '#f0f0f0'; // Reset color
     }
     if (gameStatusDisplay) {
         gameStatusDisplay.textContent = ''; // Clear status message
         gameStatusDisplay.style.color = '#ffcc00'; // Reset color
     }
     if (capturedWhiteDisplay) capturedWhiteDisplay.innerHTML = ''; // Clear captured lists
     if (capturedBlackDisplay) capturedBlackDisplay.innerHTML = '';
     if (moveList) moveList.innerHTML = ''; // Clear move history list
     console.log("UI cleared.");
}

/**
 * Sets up event listeners for UI controls, like the "New Game" button.
 * @param {Function} newGameHandler - The function from main.js to call when New Game is clicked.
 */
function setupEventListeners(newGameHandler) {
    if (newGameButton) {
        // Remove existing listener first to prevent duplicates if called multiple times
        newGameButton.removeEventListener('click', newGameHandler);
        // Add the new listener
        newGameButton.addEventListener('click', newGameHandler);
    } else {
         console.error("UI Setup Error: New Game button not found for event listener setup.");
    }
    // Add listeners for other buttons (Settings, Quit, etc.) here when they are implemented
    // Example:
    // const settingsButton = document.getElementById('settings-btn');
    // if (settingsButton) {
    //     settingsButton.addEventListener('click', () => { console.log("Settings clicked (not implemented)"); });
    // }
}

// --- Export UI functions to be used by main.js ---
export {
    initUIManager,
    updateTurnIndicator,
    updateCapturedPieces,
    addMoveToHistory,
    updateGameStatusDisplay,
    setupEventListeners,
    clearUI
};
