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

// --- Game State History for Undo ---
let gameStateHistory = []; // Stack to store previous game states

// --- Initial Board Setup (Standard Chess Layout) ---
const initialBoardSetup = [
    // Row 0 (Black Back Rank)
    [{ type: PIECE_TYPES.ROOK, color: COLORS.BLACK }, { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK }, { type: PIECE_TYPES.BISHOP, color: COLORS.BLACK }, { type: PIECE_TYPES.QUEEN, color: COLORS.BLACK }, { type: PIECE_TYPES.KING, color: COLORS.BLACK }, { type: PIECE_TYPES.BISHOP, color: COLORS.BLACK }, { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK }, { type: PIECE_TYPES.ROOK, color: COLORS.BLACK }],
    // Row 1 (Black Pawns)
    Array(8).fill({ type: PIECE_TYPES.PAWN, color: COLORS.BLACK }),
    // Rows 2-5 (Empty Squares)
    Array(8).fill(null), Array(8).fill(null), Array(8).fill(null), Array(8).fill(null),
    // Row 6 (White Pawns)
    Array(8).fill({ type: PIECE_TYPES.PAWN, color: COLORS.WHITE }),
    // Row 7 (White Back Rank)
    [{ type: PIECE_TYPES.ROOK, color: COLORS.WHITE }, { type: PIECE_TYPES.KNIGHT, color: COLORS.WHITE }, { type: PIECE_TYPES.BISHOP, color: COLORS.WHITE }, { type: PIECE_TYPES.QUEEN, color: COLORS.WHITE }, { type: PIECE_TYPES.KING, color: COLORS.WHITE }, { type: PIECE_TYPES.BISHOP, color: COLORS.WHITE }, { type: PIECE_TYPES.KNIGHT, color: COLORS.WHITE }, { type: PIECE_TYPES.ROOK, color: COLORS.WHITE }],
];

/**
 * Initializes or resets the game state to the standard starting position.
 */
function initializeGame() {
    boardState = initialBoardSetup.map(row => row.map(piece => piece ? { ...piece, hasMoved: false } : null));
    currentPlayer = COLORS.WHITE;
    moveHistory = [];
    capturedPieces = { [COLORS.WHITE]: [], [COLORS.BLACK]: [] };
    gameStatus = { isCheck: false, isCheckmate: false, isStalemate: false, winner: null };
    castlingRights = { [COLORS.WHITE]: { kingSide: true, queenSide: true }, [COLORS.BLACK]: { kingSide: true, queenSide: true } };
    enPassantTargetSquare = null;
    gameStateHistory = []; // Clear history
    console.log("Chess logic initialized for a new game.");
}

// --- Getter Functions ---
function getPieceAt(row, col) {
    if (!isWithinBoard(row, col)) return null;
    if (!boardState) { console.error("getPieceAt called before boardState initialized!"); return null; }
    return boardState[row][col];
}
function getCurrentPlayer() { return currentPlayer; }
function getBoardState() { return boardState; }
function getCapturedPieces() { return capturedPieces; }
function getMoveHistory() { return moveHistory; }
function getGameStatus() { return gameStatus; }

// --- Move Generation & Validation ---
function isWithinBoard(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
function generatePseudoLegalMoves(startRow, startCol) { /* ... (code unchanged from previous version) ... */
    const piece = getPieceAt(startRow, startCol);
    if (!piece) return [];

    const moves = [];
    const color = piece.color;
    const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

    const addMove = (endRow, endCol, options = {}) => {
        if (!isWithinBoard(endRow, endCol)) return;
        const targetPiece = getPieceAt(endRow, endCol);
        if (targetPiece && targetPiece.color === color) return;
        moves.push({ row: endRow, col: endCol, isCapture: !!targetPiece, ...options });
    };

    const addSlidingMoves = (directions) => {
        for (const [dr, dc] of directions) {
            for (let i = 1; ; i++) {
                const endRow = startRow + i * dr;
                const endCol = startCol + i * dc;
                if (!isWithinBoard(endRow, endCol)) break;
                const targetPiece = getPieceAt(endRow, endCol);
                if (targetPiece) {
                    if (targetPiece.color === opponentColor) addMove(endRow, endCol);
                    break;
                }
                addMove(endRow, endCol);
            }
        }
    };

    switch (piece.type) {
        case PIECE_TYPES.PAWN:
            const direction = color === COLORS.WHITE ? -1 : 1;
            const startRank = color === COLORS.WHITE ? 6 : 1;
            const promotionRank = color === COLORS.WHITE ? 0 : 7;
            let endRow = startRow + direction;
            let endCol = startCol;
            if (isWithinBoard(endRow, endCol) && !getPieceAt(endRow, endCol)) {
                if (endRow === promotionRank) ['queen', 'rook', 'bishop', 'knight'].forEach(p => addMove(endRow, endCol, { promotion: p }));
                else addMove(endRow, endCol);
                if (startRow === startRank) {
                    endRow = startRow + 2 * direction;
                    if (isWithinBoard(endRow, endCol) && !getPieceAt(endRow, endCol)) addMove(endRow, endCol, { isDoublePawnPush: true });
                }
            }
            for (const dc of [-1, 1]) {
                endRow = startRow + direction;
                endCol = startCol + dc;
                if (isWithinBoard(endRow, endCol)) {
                    const targetPiece = getPieceAt(endRow, endCol);
                    if (targetPiece && targetPiece.color === opponentColor) {
                         if (endRow === promotionRank) ['queen', 'rook', 'bishop', 'knight'].forEach(p => addMove(endRow, endCol, { promotion: p }));
                         else addMove(endRow, endCol);
                    }
                    if (enPassantTargetSquare && endRow === enPassantTargetSquare.row && endCol === enPassantTargetSquare.col) addMove(endRow, endCol, { isEnPassant: true });
                }
            }
            break;
        case PIECE_TYPES.KNIGHT:
            const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            for (const [dr, dc] of knightMoves) addMove(startRow + dr, startCol + dc);
            break;
        case PIECE_TYPES.BISHOP:
            addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
            break;
        case PIECE_TYPES.ROOK:
            addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]);
            break;
        case PIECE_TYPES.QUEEN:
            addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
            break;
        case PIECE_TYPES.KING:
            const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            for (const [dr, dc] of kingMoves) addMove(startRow + dr, startCol + dc);
            if (!piece.hasMoved && !isSquareAttacked(startRow, startCol, opponentColor)) {
                if (castlingRights[color].kingSide) {
                    const rook = getPieceAt(startRow, 7);
                    if (rook && rook.type === PIECE_TYPES.ROOK && !rook.hasMoved && !getPieceAt(startRow, 5) && !getPieceAt(startRow, 6) && !isSquareAttacked(startRow, 5, opponentColor) && !isSquareAttacked(startRow, 6, opponentColor)) addMove(startRow, 6, { isCastling: 'kingSide' });
                }
                if (castlingRights[color].queenSide) {
                     const rook = getPieceAt(startRow, 0);
                     if (rook && rook.type === PIECE_TYPES.ROOK && !rook.hasMoved && !getPieceAt(startRow, 1) && !getPieceAt(startRow, 2) && !getPieceAt(startRow, 3) && !isSquareAttacked(startRow, 2, opponentColor) && !isSquareAttacked(startRow, 3, opponentColor)) addMove(startRow, 2, { isCastling: 'queenSide' });
                }
            }
            break;
    }
    return moves;
}
function isSquareAttacked(targetRow, targetCol, attackerColor) { /* ... (code unchanged from previous version) ... */
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = getPieceAt(r, c);
            if (piece && piece.color === attackerColor) {
                const attackMoves = generateAttackMovesIgnoringTurn(r, c);
                if (attackMoves.some(move => move.row === targetRow && move.col === targetCol)) return true;
            }
        }
    }
    return false;
}
function generateAttackMovesIgnoringTurn(startRow, startCol) { /* ... (code unchanged from previous version) ... */
     const piece = getPieceAt(startRow, startCol);
    if (!piece) return [];
    const moves = [];
    const color = piece.color;
    const addAttackIfValid = (endRow, endCol) => { if (isWithinBoard(endRow, endCol)) moves.push({ row: endRow, col: endCol }); };
    const addSlidingAttacks = (directions) => {
        for (const [dr, dc] of directions) {
            for (let i = 1; ; i++) {
                const endRow = startRow + i * dr;
                const endCol = startCol + i * dc;
                if (!isWithinBoard(endRow, endCol)) break;
                addAttackIfValid(endRow, endCol);
                if (getPieceAt(endRow, endCol)) break;
            }
        }
    };
     switch (piece.type) {
        case PIECE_TYPES.PAWN: const dir = color === COLORS.WHITE ? -1 : 1; addAttackIfValid(startRow + dir, startCol - 1); addAttackIfValid(startRow + dir, startCol + 1); break;
        case PIECE_TYPES.KNIGHT: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => addAttackIfValid(startRow + dr, startCol + dc)); break;
        case PIECE_TYPES.BISHOP: addSlidingAttacks([[-1, -1], [-1, 1], [1, -1], [1, 1]]); break;
        case PIECE_TYPES.ROOK: addSlidingAttacks([[-1, 0], [1, 0], [0, -1], [0, 1]]); break;
        case PIECE_TYPES.QUEEN: addSlidingAttacks([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]); break;
        case PIECE_TYPES.KING: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => addAttackIfValid(startRow + dr, startCol + dc)); break;
    }
    return moves;
}
function findKing(kingColor) { /* ... (code unchanged from previous version) ... */
    if (!boardState) { console.error("findKing called before boardState initialized!"); return null; }
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.type === PIECE_TYPES.KING && piece.color === kingColor) return { row: r, col: c };
        }
    }
    console.error("King not found for color:", kingColor);
    return null;
}
function isKingInCheck(playerColor) { /* ... (code unchanged from previous version) ... */
    const kingPos = findKing(playerColor);
    if (!kingPos) return false;
    const opponentColor = playerColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    return isSquareAttacked(kingPos.row, kingPos.col, opponentColor);
}
function getValidMovesForPiece(startRow, startCol) { /* ... (code unchanged from previous version) ... */
    const piece = getPieceAt(startRow, startCol);
    if (!piece || piece.color !== currentPlayer) return [];

    const pseudoLegalMoves = generatePseudoLegalMoves(startRow, startCol);
    const legalMoves = [];
    const originalBoardState = boardState.map(row => row.map(p => p ? {...p} : null));
    // const originalEnPassant = enPassantTargetSquare ? {...enPassantTargetSquare} : null; // No need to restore this in simulation check

    for (const move of pseudoLegalMoves) {
        let tempBoard = originalBoardState.map(row => row.map(p => p ? {...p} : null));
        let tempPiece = tempBoard[startRow][startCol];
        tempBoard[move.row][move.col] = tempPiece;
        tempBoard[startRow][startCol] = null;
        if (move.isEnPassant) {
             const capturedPawnRow = startRow;
             const capturedPawnCol = move.col;
             tempBoard[capturedPawnRow][capturedPawnCol] = null;
        }
        const realBoardState = boardState;
        boardState = tempBoard; // Temporarily point boardState to tempBoard for isKingInCheck
        if (!isKingInCheck(currentPlayer)) legalMoves.push(move);
        boardState = realBoardState; // Restore boardState
    }
    return legalMoves;
}
function getAllLegalMovesForCurrentPlayer() { /* ... (code unchanged from previous version) ... */
    const allMoves = [];
    if (!boardState) { console.error("getAllLegalMovesForCurrentPlayer called before boardState initialized!"); return []; }
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = getPieceAt(r, c);
            if (piece && piece.color === currentPlayer) {
                const moves = getValidMovesForPiece(r, c);
                moves.forEach(move => allMoves.push({ startRow: r, startCol: c, endRow: move.row, endCol: move.col, ...move }));
            }
        }
    }
    return allMoves;
}
function getRandomMoveForComputer() { /* ... (code unchanged from previous version) ... */
    const legalMoves = getAllLegalMovesForCurrentPlayer();
    if (legalMoves.length === 0) { console.log("getRandomMoveForComputer: No legal moves found."); return null; }
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    const randomMove = legalMoves[randomIndex];
    console.log("getRandomMoveForComputer: Selected move -", randomMove);
    return randomMove;
}
function evaluateBoardMaterial() { /* ... (code unchanged from previous version) ... */
    const pieceValues = { [PIECE_TYPES.PAWN]: 1, [PIECE_TYPES.KNIGHT]: 3, [PIECE_TYPES.BISHOP]: 3, [PIECE_TYPES.ROOK]: 5, [PIECE_TYPES.QUEEN]: 9, [PIECE_TYPES.KING]: 0 };
    let totalScore = 0;
    if (!boardState) { console.error("evaluateBoardMaterial called before boardState initialized!"); return 0; }
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = getPieceAt(r, c);
            if (piece) {
                const value = pieceValues[piece.type] || 0;
                if (piece.color === COLORS.WHITE) totalScore += value;
                else totalScore -= value;
            }
        }
    }
    return totalScore;
}
function updateGameStatus() { /* ... (code unchanged from previous version) ... */
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
}
function makeMove(startRow, startCol, endRow, endCol, promotionPieceType = null) { /* ... (code unchanged from previous version, includes history push) ... */
    const pieceToMove = getPieceAt(startRow, startCol);
    if (!pieceToMove || pieceToMove.color !== currentPlayer) {
        console.warn("Invalid move attempt: No piece or wrong color.", {startRow, startCol, currentPlayer});
        return { success: false, move: null, capturedPiece: null, moveNotation: "", specialMoves: {} };
    }
    const legalMoves = getValidMovesForPiece(startRow, startCol);
    const moveDetails = legalMoves.find(m => m.row === endRow && m.col === endCol);
    if (!moveDetails) {
         console.warn("Invalid move attempt: Move not found in legal moves.", {startRow, startCol, endRow, endCol, piece: pieceToMove.type});
        return { success: false, move: null, capturedPiece: null, moveNotation: "", specialMoves: {} };
    }
    const promotionRank = currentPlayer === COLORS.WHITE ? 0 : 7;
    if (pieceToMove.type === PIECE_TYPES.PAWN && endRow === promotionRank) {
        if (!promotionPieceType) promotionPieceType = PIECE_TYPES.QUEEN;
        else if (![PIECE_TYPES.QUEEN, PIECE_TYPES.ROOK, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT].includes(promotionPieceType)) promotionPieceType = PIECE_TYPES.QUEEN;
    }
    if (moveDetails.promotion && !promotionPieceType) promotionPieceType = moveDetails.promotion;

    const previousState = {
        boardState: boardState.map(row => row.map(p => p ? {...p} : null)),
        currentPlayer: currentPlayer,
        castlingRights: JSON.parse(JSON.stringify(castlingRights)),
        enPassantTargetSquare: enPassantTargetSquare ? {...enPassantTargetSquare} : null,
    };
    gameStateHistory.push(previousState);

    let capturedPiece = boardState[endRow][endCol] ? { ...boardState[endRow][endCol] } : null;
    const specialMovesResult = {};
    let enPassantCaptureCoords = null;
    let castledRookMove = null;
    enPassantTargetSquare = null;
    let movingPieceCopy = { ...pieceToMove };

    if (moveDetails.isEnPassant) {
        const capturedPawnRow = startRow; const capturedPawnCol = endCol;
        capturedPiece = boardState[capturedPawnRow][capturedPawnCol] ? { ...boardState[capturedPawnRow][capturedPawnCol] } : null;
        boardState[capturedPawnRow][capturedPawnCol] = null;
        specialMovesResult.enPassantCapture = true;
        enPassantCaptureCoords = { row: capturedPawnRow, col: capturedPawnCol };
    }
    if (capturedPiece) capturedPieces[previousState.currentPlayer].push(capturedPiece);
    boardState[endRow][endCol] = movingPieceCopy;
    boardState[startRow][startCol] = null;
    movingPieceCopy.hasMoved = true;
    if (moveDetails.isCastling) {
        specialMovesResult.castled = moveDetails.isCastling;
        const rookStartCol = moveDetails.isCastling === 'kingSide' ? 7 : 0; const rookEndCol = moveDetails.isCastling === 'kingSide' ? 5 : 3;
        const rook = boardState[startRow][rookStartCol];
        if (rook && rook.type === PIECE_TYPES.ROOK) {
            let rookCopy = { ...rook }; boardState[startRow][rookEndCol] = rookCopy; boardState[startRow][rookStartCol] = null; rookCopy.hasMoved = true;
            castledRookMove = { startRow: startRow, startCol: rookStartCol, endRow: startRow, endCol: rookEndCol };
        } else { console.error("Castling error: Rook not found!"); }
    }
    if (moveDetails.promotion || promotionPieceType) {
         const finalPromotionType = promotionPieceType || moveDetails.promotion;
         boardState[endRow][endCol].type = finalPromotionType; specialMovesResult.promotion = finalPromotionType;
    }
    if (moveDetails.isDoublePawnPush) enPassantTargetSquare = { row: (startRow + endRow) / 2, col: startCol };
    if (movingPieceCopy.type === PIECE_TYPES.KING) { castlingRights[previousState.currentPlayer].kingSide = false; castlingRights[previousState.currentPlayer].queenSide = false; }
    else if (movingPieceCopy.type === PIECE_TYPES.ROOK) { const homeRank = previousState.currentPlayer === COLORS.WHITE ? 7 : 0; if (startRow === homeRank) { if (startCol === 0) castlingRights[previousState.currentPlayer].queenSide = false; if (startCol === 7) castlingRights[previousState.currentPlayer].kingSide = false; } }
    if (capturedPiece && capturedPiece.type === PIECE_TYPES.ROOK) { const opponentColor = previousState.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE; const opponentHomeRank = opponentColor === COLORS.WHITE ? 7 : 0; if(endRow === opponentHomeRank) { if (endCol === 0) castlingRights[opponentColor].queenSide = false; if (endCol === 7) castlingRights[opponentColor].kingSide = false; } }

    currentPlayer = (previousState.currentPlayer === COLORS.WHITE) ? COLORS.BLACK : COLORS.WHITE;
    updateGameStatus();
    const moveNotation = generateAlgebraicNotation( pieceToMove, startRow, startCol, endRow, endCol, capturedPiece, moveDetails.isCastling, specialMovesResult.promotion, gameStatus.isCheck, gameStatus.isCheckmate, moveDetails.isEnPassant );
    moveHistory.push(moveNotation);
    console.log(`Move executed: ${moveNotation}. Turn: ${currentPlayer}. Check: ${gameStatus.isCheck}`);
    const finalPieceOnBoard = boardState[endRow][endCol];
    const moveDataForReturn = { startRow: startRow, startCol: startCol, endRow: endRow, endCol: endCol, piece: { type: finalPieceOnBoard.type, color: finalPieceOnBoard.color }, promotion: specialMovesResult.promotion || null };
    return { success: true, move: moveDataForReturn, capturedPiece: capturedPiece, moveNotation: moveNotation, specialMoves: specialMovesResult, castledRookMove: castledRookMove, enPassantCaptureCoords: enPassantCaptureCoords };
}
function undoMove() { /* ... (code unchanged from previous version) ... */
    if (gameStateHistory.length === 0) {
        console.warn("Undo failed: No history available.");
        return false; // Nothing to undo
    }
    const previousState = gameStateHistory.pop();
    boardState = previousState.boardState;
    currentPlayer = previousState.currentPlayer;
    castlingRights = previousState.castlingRights;
    enPassantTargetSquare = previousState.enPassantTargetSquare;
    if (moveHistory.length > 0) moveHistory.pop();
    console.warn("UndoMove: Captured piece list restoration is simplified/not fully implemented.");
    updateGameStatus();
    console.log("Move undone. Current player:", currentPlayer);
    return true;
}
function generateAlgebraicNotation(piece, startRow, startCol, endRow, endCol, capturedPiece, castlingType, promotionType, isCheck, isCheckmate, wasEnPassantCapture) { /* ... (code unchanged from previous version) ... */
    if (castlingType === 'kingSide') return isCheckmate ? 'O-O#' : (isCheck ? 'O-O+' : 'O-O');
    if (castlingType === 'queenSide') return isCheckmate ? 'O-O-O#' : (isCheck ? 'O-O-O+' : 'O-O-O');
    const pieceSymbols = { pawn: "", rook: "R", knight: "N", bishop: "B", queen: "Q", king: "K" };
    const files = "abcdefgh"; const ranks = "87654321"; let notation = "";
    const pieceSymbol = (piece.type === PIECE_TYPES.PAWN && !capturedPiece) ? "" : pieceSymbols[piece.type];
    if (piece.type === PIECE_TYPES.PAWN && capturedPiece) notation += files[startCol];
    else if (piece.type !== PIECE_TYPES.PAWN) notation += pieceSymbol;
    if (capturedPiece) notation += "x";
    notation += files[endCol] + ranks[endRow];
    if (promotionType) notation += "=" + pieceSymbols[promotionType].toUpperCase();
    if (isCheckmate) notation += "#"; else if (isCheck) notation += "+";
    return notation;
}

// --- NEW: Minimax AI Logic ---

/**
 * The recursive Minimax function.
 * @param {number} depth - How many moves deep to search.
 * @param {boolean} isMaximizingPlayer - True if the current node represents the player trying to maximize the score (White), False for minimizing (Black).
 * @returns {number} The evaluated score of the best reachable position at the given depth.
 */
function minimax(depth, isMaximizingPlayer) {
    // Base case: maximum depth reached or game is over
    const currentStatus = getGameStatus(); // Check current status within simulation
    if (depth === 0 || currentStatus.isCheckmate || currentStatus.isStalemate) {
        // Handle terminal nodes explicitly
        if (currentStatus.isCheckmate) {
            // If checkmate, return a very high/low score depending on whose turn it would have been
            // If the maximizing player (White) was checkmated, return very low score.
            // If the minimizing player (Black) was checkmated, return very high score.
            return isMaximizingPlayer ? -Infinity : Infinity;
        }
        if (currentStatus.isStalemate) {
            return 0; // Stalemate is a draw
        }
        // If depth is 0, return static evaluation
        return evaluateBoardMaterial();
    }

    const legalMoves = getAllLegalMovesForCurrentPlayer(); // Get moves for the player whose turn it is IN THE SIMULATION

    if (isMaximizingPlayer) { // White's turn (or simulating White's turn) - maximize score
        let maxEval = -Infinity;
        for (const move of legalMoves) {
            // Simulate the move
            const moveResult = makeMove(move.startRow, move.startCol, move.endRow, move.endCol, move.promotion);
            if (moveResult.success) {
                // Recursively call minimax for the opponent's turn (minimizing player)
                const evalScore = minimax(depth - 1, false); // Depth decreases, switch player
                maxEval = Math.max(maxEval, evalScore);
                // Undo the move to backtrack
                undoMove();
            } else {
                 console.error("Minimax: makeMove failed during simulation!", move); // Should not happen if getAllLegalMoves is correct
            }
        }
         // If no legal moves were possible from this state (should be caught by base case, but safety check)
         if (legalMoves.length === 0) {
             return evaluateBoardMaterial(); // Or handle checkmate/stalemate explicitly again
         }
        return maxEval;
    } else { // Black's turn (or simulating Black's turn) - minimize score (good for Black is bad for White)
        let minEval = Infinity;
        for (const move of legalMoves) {
            // Simulate the move
            const moveResult = makeMove(move.startRow, move.startCol, move.endRow, move.endCol, move.promotion);
             if (moveResult.success) {
                // Recursively call minimax for the opponent's turn (maximizing player)
                const evalScore = minimax(depth - 1, true); // Depth decreases, switch player
                minEval = Math.min(minEval, evalScore);
                // Undo the move to backtrack
                undoMove();
            } else {
                 console.error("Minimax: makeMove failed during simulation!", move);
            }
        }
         // If no legal moves were possible
         if (legalMoves.length === 0) {
             return evaluateBoardMaterial(); // Or handle checkmate/stalemate explicitly again
         }
        return minEval;
    }
}

/**
 * Finds the best move for the current player using the Minimax algorithm.
 * @param {number} depth - The search depth (how many moves ahead to look). Higher depth = smarter but slower.
 * @returns {object | null} The best move object { startRow, startCol, endRow, endCol, ... } or null if no moves available.
 */
function getBestMoveMinimax(depth) {
    const legalMoves = getAllLegalMovesForCurrentPlayer();
    if (legalMoves.length === 0) {
        console.log("getBestMoveMinimax: No legal moves available.");
        return null;
    }

    let bestMove = null;
    let bestValue;

    // Determine if the *actual* current player is maximizing (White) or minimizing (Black)
    const isMaximizing = (currentPlayer === COLORS.WHITE);
    bestValue = isMaximizing ? -Infinity : Infinity;

    console.log(`getBestMoveMinimax: Evaluating moves for ${currentPlayer} at depth ${depth}. Maximizing: ${isMaximizing}`);

    // Iterate through all possible legal moves for the current player
    for (const move of legalMoves) {
        // Simulate making the move
        const moveResult = makeMove(move.startRow, move.startCol, move.endRow, move.endCol, move.promotion);

        if (moveResult.success) {
            // Call minimax to evaluate the position AFTER this move, from the opponent's perspective
            // The opponent will play optimally from here, so we pass !isMaximizing
            const boardValue = minimax(depth - 1, !isMaximizing);
            // Undo the move to restore the original state for the next iteration
            undoMove();

            // Debug log for each move's evaluation
            // console.log(`Move: ${moveResult.moveNotation || 'N/A'}, Score: ${boardValue}`);

            // Compare the evaluation with the best value found so far
            if (isMaximizing) { // White wants to maximize the score
                if (boardValue > bestValue) {
                    bestValue = boardValue;
                    bestMove = move; // Store the move object itself
                }
            } else { // Black wants to minimize the score (best for Black = lowest score for White)
                if (boardValue < bestValue) {
                    bestValue = boardValue;
                    bestMove = move; // Store the move object itself
                }
            }
        } else {
            console.error("getBestMoveMinimax: makeMove failed during evaluation!", move);
        }
    }

    // If multiple moves have the same best value, Minimax typically picks the first one found.
    // Could add randomness here if desired for variety.
    if (!bestMove && legalMoves.length > 0) {
        console.warn("Minimax couldn't determine a best move, picking first legal move.");
        bestMove = legalMoves[0]; // Fallback if something went wrong
    }

    console.log(`getBestMoveMinimax: Best move found: ${bestMove ? JSON.stringify(bestMove) : 'None'}, Value: ${bestValue}`);
    return bestMove; // Return the full move object { startRow, startCol, endRow, endCol, ... }
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
    undoMove,
    getRandomMoveForComputer,
    evaluateBoardMaterial,
    minimax, // Export minimax if needed for debugging/advanced use
    getBestMoveMinimax, // <-- NEWLY ADDED
    PIECE_TYPES,
    COLORS,
};
