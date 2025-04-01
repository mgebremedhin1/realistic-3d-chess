// --- Constants ---
const PIECE_TYPES = {
    PAWN: 'pawn',
    ROOK: 'rook',
    KNIGHT: 'knight',
    BISHOP: 'bishop',
    QUEEN: 'queen',
    KING: 'king',
};

const COLORS = {
    WHITE: 'white',
    BLACK: 'black',
};

// --- Game State Variables ---
let boardState = null; // 8x8 array storing piece objects {type, color, hasMoved} or null
let currentPlayer = COLORS.WHITE; // Player whose turn it is
let moveHistory = []; // Array to store moves in algebraic notation (e.g., "e4", "Nf3")
let capturedPieces = { // Object to store arrays of captured pieces for each color
    [COLORS.WHITE]: [], // Pieces captured by Black
    [COLORS.BLACK]: [], // Pieces captured by White
};
let gameStatus = { // Object to track the overall game status
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    winner: null, // null, 'white', 'black', or 'draw'
};
// State for special chess rules
let castlingRights = { // Tracks if castling is still possible
    [COLORS.WHITE]: { kingSide: true, queenSide: true },
    [COLORS.BLACK]: { kingSide: true, queenSide: true },
};
let enPassantTargetSquare = null; // Stores {row, col} of the square vulnerable to en passant, or null

// --- Initial Board Setup (Standard Chess Layout) ---
const initialBoardSetup = [
    // Row 0 (Black Back Rank) - Note: Row 0 is typically rank 8 in algebraic notation
    [{ type: PIECE_TYPES.ROOK, color: COLORS.BLACK }, { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK }, { type: PIECE_TYPES.BISHOP, color: COLORS.BLACK }, { type: PIECE_TYPES.QUEEN, color: COLORS.BLACK }, { type: PIECE_TYPES.KING, color: COLORS.BLACK }, { type: PIECE_TYPES.BISHOP, color: COLORS.BLACK }, { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK }, { type: PIECE_TYPES.ROOK, color: COLORS.BLACK }],
    // Row 1 (Black Pawns) - Rank 7
    Array(8).fill({ type: PIECE_TYPES.PAWN, color: COLORS.BLACK }),
    // Rows 2-5 (Empty Squares) - Ranks 6 to 3
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    // Row 6 (White Pawns) - Rank 2
    Array(8).fill({ type: PIECE_TYPES.PAWN, color: COLORS.WHITE }),
    // Row 7 (White Back Rank) - Rank 1
    [{ type: PIECE_TYPES.ROOK, color: COLORS.WHITE }, { type: PIECE_TYPES.KNIGHT, color: COLORS.WHITE }, { type: PIECE_TYPES.BISHOP, color: COLORS.WHITE }, { type: PIECE_TYPES.QUEEN, color: COLORS.WHITE }, { type: PIECE_TYPES.KING, color: COLORS.WHITE }, { type: PIECE_TYPES.BISHOP, color: COLORS.WHITE }, { type: PIECE_TYPES.KNIGHT, color: COLORS.WHITE }, { type: PIECE_TYPES.ROOK, color: COLORS.WHITE }],
];

/**
 * Initializes or resets the game state to the standard starting position.
 */
function initializeGame() {
    // Create a deep copy of the initial setup, adding 'hasMoved: false' to each piece
    boardState = initialBoardSetup.map(row =>
        row.map(piece => piece ? { ...piece, hasMoved: false } : null)
    );
    // Reset all state variables
    currentPlayer = COLORS.WHITE;
    moveHistory = [];
    capturedPieces = { [COLORS.WHITE]: [], [COLORS.BLACK]: [] };
    gameStatus = { isCheck: false, isCheckmate: false, isStalemate: false, winner: null };
    castlingRights = {
        [COLORS.WHITE]: { kingSide: true, queenSide: true },
        [COLORS.BLACK]: { kingSide: true, queenSide: true },
    };
    enPassantTargetSquare = null;
    console.log("Chess logic initialized for a new game.");
}

// --- Getter Functions for Game State ---

/**
 * Gets the piece object at the given board coordinates.
 * @param {number} row - Row index (0-7).
 * @param {number} col - Column index (0-7).
 * @returns {object | null} The piece object {type, color, hasMoved} or null if empty or out of bounds.
 */
function getPieceAt(row, col) {
    if (!isWithinBoard(row, col)) {
        return null; // Coordinates out of bounds
    }
    return boardState[row][col];
}

/**
 * Returns the color of the current player.
 * @returns {string} COLORS.WHITE or COLORS.BLACK.
 */
function getCurrentPlayer() {
    return currentPlayer;
}

/**
 * Returns the current 8x8 board state array.
 * @returns {Array<Array<object|null>>} The board state.
 */
function getBoardState() {
    return boardState;
}

/**
 * Returns the object containing arrays of captured pieces.
 * @returns {object} { white: [captured_by_black], black: [captured_by_white] }
 */
function getCapturedPieces() {
    return capturedPieces;
}

/**
 * Returns the array of moves made so far in algebraic notation.
 * @returns {Array<string>}
 */
function getMoveHistory() {
    return moveHistory;
}

/**
 * Returns the current game status object.
 * @returns {object} { isCheck, isCheckmate, isStalemate, winner }
 */
function getGameStatus() {
    return gameStatus;
}

// --- Move Generation & Validation ---

/**
 * Checks if a given coordinate pair is within the 8x8 board boundaries.
 * @param {number} row
 * @param {number} col
 * @returns {boolean} True if the coordinates are on the board, false otherwise.
 */
function isWithinBoard(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/**
 * Generates all pseudo-legal moves for a piece at a given square.
 * Pseudo-legal moves are moves that follow the piece's movement rules but
 * do not account for whether the move leaves the king in check.
 * Includes special moves like castling, en passant, promotion flags.
 * @param {number} startRow
 * @param {number} startCol
 * @returns {Array<object>} An array of move objects, each containing
 * { row, col, isCapture, isCastling?, isEnPassant?, promotion?, isDoublePawnPush? }.
 */
function generatePseudoLegalMoves(startRow, startCol) {
    const piece = getPieceAt(startRow, startCol);
    if (!piece) return []; // No piece at the starting square

    const moves = [];
    const color = piece.color;
    const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

    // Helper function to add a potential move to the list if valid
    const addMove = (endRow, endCol, options = {}) => {
        if (!isWithinBoard(endRow, endCol)) return; // Target must be on the board
        const targetPiece = getPieceAt(endRow, endCol);
        // Cannot capture a piece of the same color
        if (targetPiece && targetPiece.color === color) return;

        moves.push({
            row: endRow,
            col: endCol,
            isCapture: !!targetPiece, // Flag if it's a capture
            ...options // Include flags for special moves (castling, en passant, etc.)
        });
    };

    // Helper function for sliding pieces (Rook, Bishop, Queen)
    const addSlidingMoves = (directions) => {
        for (const [dr, dc] of directions) { // Iterate through each direction vector [rowChange, colChange]
            for (let i = 1; ; i++) { // Move step by step in the direction
                const endRow = startRow + i * dr;
                const endCol = startCol + i * dc;
                if (!isWithinBoard(endRow, endCol)) break; // Stop if move goes off the board

                const targetPiece = getPieceAt(endRow, endCol);
                if (targetPiece) { // If the square is occupied
                    if (targetPiece.color === opponentColor) {
                        addMove(endRow, endCol); // Can capture the opponent's piece
                    }
                    break; // Stop in this direction (blocked by own or opponent piece)
                }
                addMove(endRow, endCol); // Square is empty, add as a valid move
            }
        }
    };

    // Generate moves based on piece type
    switch (piece.type) {
        case PIECE_TYPES.PAWN:
            const direction = color === COLORS.WHITE ? -1 : 1; // White moves up (-row), Black moves down (+row)
            const startRank = color === COLORS.WHITE ? 6 : 1; // Starting row for pawns
            const promotionRank = color === COLORS.WHITE ? 0 : 7; // Rank where promotion occurs

            // 1. Move Forward One Square
            let endRow = startRow + direction;
            let endCol = startCol;
            if (isWithinBoard(endRow, endCol) && !getPieceAt(endRow, endCol)) { // If square is on board and empty
                if (endRow === promotionRank) { // Check for promotion
                    ['queen', 'rook', 'bishop', 'knight'].forEach(p => addMove(endRow, endCol, { promotion: p }));
                } else {
                    addMove(endRow, endCol);
                }

                // 2. Move Forward Two Squares (only from starting rank and if path is clear)
                if (startRow === startRank) {
                    endRow = startRow + 2 * direction;
                    if (isWithinBoard(endRow, endCol) && !getPieceAt(endRow, endCol)) { // Check if landing square is empty
                         addMove(endRow, endCol, { isDoublePawnPush: true }); // Flag for en passant check later
                    }
                }
            }

            // 3. Captures (Diagonal)
            for (const dc of [-1, 1]) { // Check left and right diagonals
                endRow = startRow + direction;
                endCol = startCol + dc;
                if (isWithinBoard(endRow, endCol)) {
                    const targetPiece = getPieceAt(endRow, endCol);
                    // Normal diagonal capture
                    if (targetPiece && targetPiece.color === opponentColor) {
                         if (endRow === promotionRank) { // Check for promotion on capture
                            ['queen', 'rook', 'bishop', 'knight'].forEach(p => addMove(endRow, endCol, { promotion: p }));
                        } else {
                            addMove(endRow, endCol);
                        }
                    }
                    // En Passant capture
                    // Check if the target square matches the vulnerable en passant square
                    if (enPassantTargetSquare && endRow === enPassantTargetSquare.row && endCol === enPassantTargetSquare.col) {
                         addMove(endRow, endCol, { isEnPassant: true });
                    }
                }
            }
            break;

        case PIECE_TYPES.KNIGHT:
            const knightMoves = [ // Possible L-shaped moves relative to current position
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            for (const [dr, dc] of knightMoves) {
                addMove(startRow + dr, startCol + dc);
            }
            break;

        case PIECE_TYPES.BISHOP:
            addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]); // Diagonal directions
            break;

        case PIECE_TYPES.ROOK:
            addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]); // Horizontal and vertical directions
            break;

        case PIECE_TYPES.QUEEN:
            addSlidingMoves([ // Combines Rook and Bishop directions
                [-1, -1], [-1, 1], [1, -1], [1, 1], // Bishop moves
                [-1, 0], [1, 0], [0, -1], [0, 1]  // Rook moves
            ]);
            break;

        case PIECE_TYPES.KING:
            const kingMoves = [ // All adjacent squares
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1], [1, 0], [1, 1]
            ];
            for (const [dr, dc] of kingMoves) {
                addMove(startRow + dr, startCol + dc);
            }
            // Castling (check conditions)
            if (!piece.hasMoved && !isSquareAttacked(startRow, startCol, opponentColor)) { // King hasn't moved and is not in check
                // Kingside Castling (O-O)
                if (castlingRights[color].kingSide) {
                    const rook = getPieceAt(startRow, 7); // Check H-file rook
                    // Rook must exist, be the right type, and not have moved
                    if (rook && rook.type === PIECE_TYPES.ROOK && !rook.hasMoved &&
                        !getPieceAt(startRow, 5) && !getPieceAt(startRow, 6) && // Squares between must be empty
                        !isSquareAttacked(startRow, 5, opponentColor) && !isSquareAttacked(startRow, 6, opponentColor)) // Squares king passes through cannot be attacked
                    {
                        addMove(startRow, 6, { isCastling: 'kingSide' }); // King moves to G-file
                    }
                }
                // Queenside Castling (O-O-O)
                if (castlingRights[color].queenSide) {
                     const rook = getPieceAt(startRow, 0); // Check A-file rook
                     if (rook && rook.type === PIECE_TYPES.ROOK && !rook.hasMoved &&
                         !getPieceAt(startRow, 1) && !getPieceAt(startRow, 2) && !getPieceAt(startRow, 3) && // Squares between must be empty
                         !isSquareAttacked(startRow, 2, opponentColor) && !isSquareAttacked(startRow, 3, opponentColor)) // Squares king passes through cannot be attacked
                     {
                          addMove(startRow, 2, { isCastling: 'queenSide' }); // King moves to C-file
                     }
                }
            }
            break;
    }

    return moves;
}

/**
 * Checks if a specific square is under attack by any piece of the attacker's color.
 * @param {number} targetRow - Row of the square to check.
 * @param {number} targetCol - Column of the square to check.
 * @param {string} attackerColor - The color of the pieces potentially attacking.
 * @returns {boolean} True if the square is attacked, false otherwise.
 */
function isSquareAttacked(targetRow, targetCol, attackerColor) {
    // Iterate through every square on the board
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = getPieceAt(r, c);
            // If there's a piece of the attacking color on this square
            if (piece && piece.color === attackerColor) {
                // Generate the moves this piece *could* make (ignoring whose turn it is)
                // Use a simplified version that just checks attack patterns, not full legality
                const attackMoves = generateAttackMovesIgnoringTurn(r, c);
                // Check if any of these attack moves land on the target square
                if (attackMoves.some(move => move.row === targetRow && move.col === targetCol)) {
                    return true; // The square is attacked
                }
            }
        }
    }
    return false; // No piece of the attacker's color attacks the square
}

/**
 * Helper for isSquareAttacked: Generates only the squares a piece *attacks*,
 * ignoring whose turn it is and complex legality like check. Faster for attack checks.
 * @param {number} startRow
 * @param {number} startCol
 * @returns {Array<{row: number, col: number}>} Squares attacked by the piece.
 */
function generateAttackMovesIgnoringTurn(startRow, startCol) {
     const piece = getPieceAt(startRow, startCol);
    if (!piece) return [];

    const moves = [];
    const color = piece.color;

    // Simplified check: can the piece potentially land here? (doesn't check blocking for sliding pieces beyond first hit)
    const addAttackIfValid = (endRow, endCol) => {
        if (isWithinBoard(endRow, endCol)) { // Only add if on board
             moves.push({ row: endRow, col: endCol });
        }
    };

    // Simplified sliding check: add squares until blocked
     const addSlidingAttacks = (directions) => {
        for (const [dr, dc] of directions) {
            for (let i = 1; ; i++) {
                const endRow = startRow + i * dr;
                const endCol = startCol + i * dc;
                if (!isWithinBoard(endRow, endCol)) break;
                addAttackIfValid(endRow, endCol); // Add square as potentially attacked
                if (getPieceAt(endRow, endCol)) break; // Stop if blocked by ANY piece
            }
        }
    };

     switch (piece.type) {
        case PIECE_TYPES.PAWN:
            const direction = color === COLORS.WHITE ? -1 : 1;
            // Pawns only attack diagonally forward
            addAttackIfValid(startRow + direction, startCol - 1);
            addAttackIfValid(startRow + direction, startCol + 1);
            break;
         case PIECE_TYPES.KNIGHT:
            const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            knightMoves.forEach(([dr, dc]) => addAttackIfValid(startRow + dr, startCol + dc));
            break;
        case PIECE_TYPES.BISHOP:
            addSlidingAttacks([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
            break;
        case PIECE_TYPES.ROOK:
            addSlidingAttacks([[-1, 0], [1, 0], [0, -1], [0, 1]]);
            break;
        case PIECE_TYPES.QUEEN:
            addSlidingAttacks([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
            break;
        case PIECE_TYPES.KING:
             const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            kingMoves.forEach(([dr, dc]) => addAttackIfValid(startRow + dr, startCol + dc));
            break;
    }
    return moves;
}


/**
 * Finds the current position (row, col) of the king for a given color.
 * @param {string} kingColor - COLORS.WHITE or COLORS.BLACK.
 * @returns {{row: number, col: number} | null} Coordinates or null if king not found (shouldn't happen).
 */
function findKing(kingColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.type === PIECE_TYPES.KING && piece.color === kingColor) {
                return { row: r, col: c };
            }
        }
    }
    console.error("King not found for color:", kingColor);
    return null; // Should not happen in a valid game state
}

/**
 * Checks if the specified player's king is currently in check.
 * @param {string} playerColor - The color of the king to check.
 * @returns {boolean} True if the king is in check, false otherwise.
 */
function isKingInCheck(playerColor) {
    const kingPos = findKing(playerColor);
    if (!kingPos) return false; // King not found, cannot be in check
    const opponentColor = playerColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    // Check if the king's square is attacked by any opponent piece
    return isSquareAttacked(kingPos.row, kingPos.col, opponentColor);
}

/**
 * Generates all fully legal moves for the piece at [startRow, startCol].
 * Filters pseudo-legal moves by simulating each move and checking if it
 * results in the player's own king being in check.
 * @param {number} startRow
 * @param {number} startCol
 * @returns {Array<object>} List of fully legal move objects {row, col, ...}.
 */
function getValidMovesForPiece(startRow, startCol) {
    const piece = getPieceAt(startRow, startCol);
     // Ensure it's the current player's piece
     if (!piece || piece.color !== currentPlayer) {
        return [];
    }

    const pseudoLegalMoves = generatePseudoLegalMoves(startRow, startCol);
    const legalMoves = [];

    // Store original state to revert after simulation
    const originalBoardState = boardState.map(row => row.map(p => p ? {...p} : null));
    const originalEnPassant = enPassantTargetSquare ? {...enPassantTargetSquare} : null;

    for (const move of pseudoLegalMoves) {
        // --- Simulate the move ---
        boardState[move.row][move.col] = boardState[startRow][startCol]; // Move piece
        boardState[startRow][startCol] = null; // Empty start square
        if (move.isEnPassant) {
             const capturedPawnRow = startRow;
             const capturedPawnCol = move.col;
             boardState[capturedPawnRow][capturedPawnCol] = null;
        }
        // --- Check if the king is in check AFTER the simulated move ---
        if (!isKingInCheck(currentPlayer)) {
            legalMoves.push(move);
        }
        // --- Revert the board state ---
        boardState = originalBoardState.map(row => row.map(p => p ? {...p} : null));
        enPassantTargetSquare = originalEnPassant ? {...originalEnPassant} : null;
    }

    return legalMoves;
}

/**
 * Generates all legal moves available for the current player across all their pieces.
 * @returns {Array<object>} An array of move objects, each containing
 * { startRow, startCol, endRow, endCol, ...moveDetails }.
 */
function getAllLegalMovesForCurrentPlayer() {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = getPieceAt(r, c);
            if (piece && piece.color === currentPlayer) {
                const moves = getValidMovesForPiece(r, c);
                moves.forEach(move => {
                    allMoves.push({
                        startRow: r,
                        startCol: c,
                        endRow: move.row,
                        endCol: move.col,
                        ...move
                    });
                });
            }
        }
    }
    return allMoves;
}


/**
 * Selects a random legal move for the current player.
 * Assumes this is called only when it is the computer's turn.
 * @returns {object | null} A random move object { startRow, startCol, endRow, endCol, ... } or null if no legal moves exist.
 */
function getRandomMoveForComputer() {
    const legalMoves = getAllLegalMovesForCurrentPlayer();
    if (legalMoves.length === 0) {
        console.log("getRandomMoveForComputer: No legal moves found.");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    const randomMove = legalMoves[randomIndex];
    console.log("getRandomMoveForComputer: Selected move -", randomMove);
    return randomMove;
}


/**
 * Updates the game status (check, checkmate, stalemate) based on the current board state
 * and the player whose turn it is *about to be*. Should be called *after* a move is made.
 */
function updateGameStatus() {
    gameStatus.isCheck = isKingInCheck(currentPlayer);
    const hasLegalMoves = getAllLegalMovesForCurrentPlayer().length > 0;

    if (gameStatus.isCheck && !hasLegalMoves) {
        gameStatus.isCheckmate = true;
        gameStatus.winner = currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        console.log("Checkmate!", gameStatus.winner, "wins.");
    } else if (!gameStatus.isCheck && !hasLegalMoves) {
        gameStatus.isStalemate = true;
        gameStatus.winner = 'draw';
        console.log("Stalemate! Draw.");
    } else {
        gameStatus.isCheckmate = false;
        gameStatus.isStalemate = false;
        gameStatus.winner = null;
    }
    // TODO: Add checks for other draw conditions
}


/**
 * Attempts to make a move on the board, performing full legality checks and updating game state.
 * @param {number} startRow
 * @param {number} startCol
 * @param {number} endRow
 * @param {number} endCol
 * @param {string} [promotionPieceType=null] - Optional: type ('queen', 'rook', etc.) to promote a pawn to. Required if move is a promotion.
 * @returns {{ success: boolean, move: object | null, capturedPiece: object | null, moveNotation: string, specialMoves: object, castledRookMove?: object, enPassantCaptureCoords?: object }} <-- MODIFIED RETURN TYPE
 * Result object indicating success, details of the move, and any captured piece.
 */
function makeMove(startRow, startCol, endRow, endCol, promotionPieceType = null) {
    const pieceToMove = getPieceAt(startRow, startCol);
    if (!pieceToMove || pieceToMove.color !== currentPlayer) {
        console.warn("Invalid move attempt: No piece or wrong color.", {startRow, startCol, currentPlayer});
        return { success: false, move: null, capturedPiece: null, moveNotation: "", specialMoves: {} }; // <-- Includes move: null
    }

    const legalMoves = getValidMovesForPiece(startRow, startCol);
    const moveDetails = legalMoves.find(m => m.row === endRow && m.col === endCol);

    if (!moveDetails) {
         console.warn("Invalid move attempt: Move not found in legal moves.", {startRow, startCol, endRow, endCol, piece: pieceToMove.type});
        return { success: false, move: null, capturedPiece: null, moveNotation: "", specialMoves: {} }; // <-- Includes move: null
    }

     const promotionRank = currentPlayer === COLORS.WHITE ? 0 : 7;
     if (pieceToMove.type === PIECE_TYPES.PAWN && endRow === promotionRank) {
         if (!promotionPieceType) {
             console.warn("Promotion required but no piece type specified. Defaulting to Queen.");
             promotionPieceType = PIECE_TYPES.QUEEN;
         }
          else if (![PIECE_TYPES.QUEEN, PIECE_TYPES.ROOK, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT].includes(promotionPieceType)) {
             console.warn("Invalid promotion type provided, defaulting to Queen:", promotionPieceType);
             promotionPieceType = PIECE_TYPES.QUEEN;
         }
     }
     if (moveDetails.promotion && !promotionPieceType) {
         promotionPieceType = moveDetails.promotion;
     }


    // --- Execute the Move and Update State ---
    let capturedPiece = boardState[endRow][endCol];
    const specialMovesResult = {};
    let enPassantCaptureCoords = null;
    let castledRookMove = null;

    const previousEnPassantTarget = enPassantTargetSquare;
    enPassantTargetSquare = null;

    if (moveDetails.isEnPassant) {
        const capturedPawnRow = startRow;
        const capturedPawnCol = endCol;
        capturedPiece = boardState[capturedPawnRow][capturedPawnCol];
        boardState[capturedPawnRow][capturedPawnCol] = null;
        specialMovesResult.enPassantCapture = true;
        enPassantCaptureCoords = { row: capturedPawnRow, col: capturedPawnCol };
        console.log("En passant capture at:", enPassantCaptureCoords);
    }

    if (capturedPiece) {
        capturedPieces[currentPlayer].push(capturedPiece);
    }

    boardState[endRow][endCol] = pieceToMove;
    boardState[startRow][startCol] = null;
    pieceToMove.hasMoved = true;

    if (moveDetails.isCastling) {
        specialMovesResult.castled = moveDetails.isCastling;
        const rookStartCol = moveDetails.isCastling === 'kingSide' ? 7 : 0;
        const rookEndCol = moveDetails.isCastling === 'kingSide' ? 5 : 3;
        const rook = boardState[startRow][rookStartCol];
        if (rook && rook.type === PIECE_TYPES.ROOK) {
            boardState[startRow][rookEndCol] = rook;
            boardState[startRow][rookStartCol] = null;
            rook.hasMoved = true;
             castledRookMove = { startRow: startRow, startCol: rookStartCol, endRow: startRow, endCol: rookEndCol };
             console.log("Castling performed:", moveDetails.isCastling);
        } else {
            console.error("Castling error: Rook not found or invalid at expected position!", {startRow, rookStartCol});
        }
    }

    // Update promotion type *within* the specialMovesResult
    if (moveDetails.promotion || promotionPieceType) {
         const finalPromotionType = promotionPieceType || moveDetails.promotion;
         boardState[endRow][endCol].type = finalPromotionType;
         specialMovesResult.promotion = finalPromotionType; // Ensure this is set
         console.log("Pawn promoted to:", finalPromotionType);
    }


    if (moveDetails.isDoublePawnPush) {
        enPassantTargetSquare = { row: (startRow + endRow) / 2, col: startCol };
        console.log("New en passant target:", enPassantTargetSquare);
    }

    // Update Castling Rights
    if (pieceToMove.type === PIECE_TYPES.KING) {
        castlingRights[currentPlayer].kingSide = false;
        castlingRights[currentPlayer].queenSide = false;
    }
    else if (pieceToMove.type === PIECE_TYPES.ROOK) {
        const homeRank = currentPlayer === COLORS.WHITE ? 7 : 0;
        if (startRow === homeRank) {
            if (startCol === 0) castlingRights[currentPlayer].queenSide = false;
            if (startCol === 7) castlingRights[currentPlayer].kingSide = false;
        }
    }
    if (capturedPiece && capturedPiece.type === PIECE_TYPES.ROOK) {
         const opponentColor = currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
         const opponentHomeRank = opponentColor === COLORS.WHITE ? 7 : 0;
         if(endRow === opponentHomeRank) {
             if (endCol === 0) castlingRights[opponentColor].queenSide = false;
             if (endCol === 7) castlingRights[opponentColor].kingSide = false;
         }
    }

    // Switch Player Turn FIRST
    const previousPlayer = currentPlayer; // Store who made the move
    currentPlayer = (currentPlayer === COLORS.WHITE) ? COLORS.BLACK : COLORS.WHITE;
    // Update status AFTER switching player
    updateGameStatus();

    const moveNotation = generateAlgebraicNotation(
        pieceToMove, startRow, startCol, endRow, endCol,
        capturedPiece, moveDetails.isCastling, specialMovesResult.promotion,
        gameStatus.isCheck, gameStatus.isCheckmate, moveDetails.isEnPassant
    );
    moveHistory.push(moveNotation);

    console.log(`Move executed: ${moveNotation}. Turn: ${currentPlayer}. Check: ${gameStatus.isCheck}`);

    // --- FIX: Include move details in the return object ---
    // Ensure promotion type used here matches the one applied to the board state
    const actualPromotionType = specialMovesResult.promotion || null;
    const moveDataForReturn = {
        startRow: startRow,
        startCol: startCol,
        endRow: endRow,
        endCol: endCol,
        piece: { type: pieceToMove.type, color: pieceToMove.color }, // Use original piece type before potential promotion for notation context maybe? Or final type? Let's use final type.
        // piece: { type: boardState[endRow][endCol].type, color: boardState[endRow][endCol].color }, // Use final piece type
        promotion: actualPromotionType // Pass the actual promotion result
    };

    return {
        success: true,
        move: moveDataForReturn, // <-- CORRECTED PART
        capturedPiece: capturedPiece,
        moveNotation: moveNotation,
        specialMoves: specialMovesResult,
        castledRookMove: castledRookMove,
        enPassantCaptureCoords: enPassantCaptureCoords
    };
}


/**
 * Generates standard algebraic notation (SAN) for a move.
 * @param {object} piece - The piece that moved (original type, before promotion).
 * @param {number} startRow
 * @param {number} startCol
 * @param {number} endRow
 * @param {number} endCol
 * @param {object | null} capturedPiece - The piece that was captured (if any).
 * @param {string | undefined} castlingType - 'kingSide' or 'queenSide' if castling occurred.
 * @param {string | undefined} promotionType - e.g., 'queen', 'rook' if promotion occurred.
 * @param {boolean} isCheck - Is the opponent's king in check after the move?
 * @param {boolean} isCheckmate - Is it checkmate after the move?
 * @param {boolean} wasEnPassantCapture - Was this move an en passant capture?
 * @returns {string} The move in standard algebraic notation.
 */
function generateAlgebraicNotation(piece, startRow, startCol, endRow, endCol, capturedPiece, castlingType, promotionType, isCheck, isCheckmate, wasEnPassantCapture) {
    if (castlingType === 'kingSide') return isCheckmate ? 'O-O#' : (isCheck ? 'O-O+' : 'O-O');
    if (castlingType === 'queenSide') return isCheckmate ? 'O-O-O#' : (isCheck ? 'O-O-O+' : 'O-O-O');

    const pieceSymbols = { pawn: "", rook: "R", knight: "N", bishop: "B", queen: "Q", king: "K" };
    const files = "abcdefgh";
    const ranks = "87654321";

    let notation = "";
    // Use the original piece type for the main symbol, UNLESS it's a pawn capture
    const pieceSymbol = (piece.type === PIECE_TYPES.PAWN && !capturedPiece) ? "" : pieceSymbols[piece.type];

    if (piece.type === PIECE_TYPES.PAWN && capturedPiece) {
         notation += files[startCol]; // Add starting file for pawn captures
    } else if (piece.type !== PIECE_TYPES.PAWN) {
        notation += pieceSymbol;
        // TODO: Add disambiguation logic here if necessary
    }


    if (capturedPiece) {
        notation += "x";
    }

    notation += files[endCol] + ranks[endRow];

    if (promotionType) {
        // Get symbol for the *promoted* piece type
        const promotedSymbol = pieceSymbols[promotionType];
        notation += "=" + promotedSymbol.toUpperCase();
    }

    if (isCheckmate) {
        notation += "#";
    } else if (isCheck) {
        notation += "+";
    }

    return notation;
}


// --- Export Public Functions and Constants ---
export {
    initializeGame,
    getPieceAt,
    getCurrentPlayer,
    getBoardState,
    getCapturedPieces,
    getMoveHistory,
    getGameStatus,
    getValidMovesForPiece,
    makeMove,
    getRandomMoveForComputer,
    PIECE_TYPES,
    COLORS,
};
