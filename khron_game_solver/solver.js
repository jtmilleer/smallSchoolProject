// solver.js

// High beam width to find complex 5-letter combinations
const BEAM_WIDTH =100000; 

// We need a special set of "5-letter word starts" to know if we are on the right track
let FIVE_LETTER_PREFIXES = new Set();

async function autoPlay() {
    // 1. Build a specialized map for 5-letter words
    if (typeof DICTIONARY === 'undefined' || DICTIONARY.size === 0) {
        console.warn("⏳ Dictionary loading...");
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (FIVE_LETTER_PREFIXES.size === 0) {
        console.log("📚 Analyzing Dictionary for 5-Letter Potentials...");
        buildFiveLetterMap();
    }
    
    console.log("🚀 LONG-WORD HUNTER STARTED");
    if(document.getElementById('resetButton')) document.getElementById('resetButton').click();

    // 2. Initialize State
    let candidates = [{
        board: Array(25).fill(null),
        disabled: Array(25).fill(false),
        rawScore: 0,
        wordsMade: [], // Track lengths
        moves: [] 
    }];

    // 3. Simulation Loop
    for (let step = 0; step < dailyLetters.length; step++) {
        const letter = dailyLetters[step];
        let nextGen = [];

        for (let cand of candidates) {
            for (let i = 0; i < 25; i++) {
                if (cand.board[i] === null && !cand.disabled[i]) {
                    
                    let nextBoard = [...cand.board];
                    nextBoard[i] = letter;
                    
                    // Optimization: Quick Sanity Check
                    // If placing this letter creates "QZ" or junk that matches NOTHING, skip immediately.
                    if (!isValidSequence(nextBoard, i)) continue;

                    let nextDisabled = [...cand.disabled];
                    let nextWords = [...cand.wordsMade];
                    
                    // A. Calculate immediate points
                    let movePoints = processMoveLogic(nextBoard, nextDisabled, nextWords);
                    
                    // B. The "Long Game" Heuristic
                    // This is where we force it to prioritize 5-letter words
                    let heuristic = calculateLongWordStrategy(nextBoard, nextDisabled, step, movePoints, nextWords);

                    // C. Score Tracking
                    let currentRaw = cand.rawScore + movePoints;
                    
                    // D. Penalty Tracking (Live)
                    let tilesPlaced = step + 1;
                    let tilesUsed = nextDisabled.filter(x => x).length;
                    let unusedPenalty = (tilesPlaced - tilesUsed) * 4;

                    nextGen.push({
                        board: nextBoard,
                        disabled: nextDisabled,
                        rawScore: currentRaw,
                        // SortScore dictates which paths survive. 
                        // We weight the heuristic heavily to force the behavior.
                        sortScore: currentRaw + heuristic - unusedPenalty, 
                        wordsMade: nextWords,
                        moves: [...cand.moves, i]
                    });
                }
            }
        }

        // 4. Prune
        nextGen.sort((a, b) => b.sortScore - a.sortScore);
        candidates = nextGen.slice(0, BEAM_WIDTH);

        if (step % 2 === 0) {
            console.log(`Step ${step+1}/${dailyLetters.length} | Top Real Score: ${candidates[0].rawScore}`);
            await new Promise(r => setTimeout(r, 0));
        }
    }

    // 5. Final Calculation
    candidates.forEach(cand => {
        let unused = cand.board.filter((l, i) => l !== null && !cand.disabled[i]).length;
        cand.finalRealScore = cand.rawScore + calculateAdvancedBonuses(cand.wordsMade) - (unused * 4);
    });
    
    candidates.sort((a, b) => b.finalRealScore - a.finalRealScore);

    const best = candidates[0];
    console.log(`🏆 FINAL SCORE: ${best.finalRealScore}`);
    console.log("Moves:", best.moves);

    // 6. Play
    let idx = 0;
    let timer = setInterval(() => {
        if (idx >= best.moves.length) clearInterval(timer);
        else placeLetter(best.moves[idx++]);
    }, 200);
}

// --- LONG WORD STRATEGY ENGINE ---
function calculateLongWordStrategy(board, disabled, step, movePoints, wordsMade) {
    let pot = 0;

    // 1. THE "SHORT WORD TAX"
    // If we just made a 3-letter word, penalize it to discourage settling early.
    // However, if that 3-letter word is part of a 5-letter word (e.g. "THE" inside "THERE"), 
    // we might forgive it IF the cells didn't get locked (but they do get locked).
    // So generally: Locked 3-letter words are bad news for high scores.
    let lastWordLen = wordsMade.length > 0 ? wordsMade[wordsMade.length - 1] : 0;
    
    if (movePoints > 0) {
        if (lastWordLen === 3) pot -= 15; // Punish 3s
        if (lastWordLen === 4) pot += 10; // 4s are okay
        if (lastWordLen === 5) pot += 100; // 5s are GOLD
    }

    // 2. THE "PIPELINE" SCANNER
    // Check every row/col. If it currently forms a valid prefix for a 5-letter word, reward it.
    // e.g. "S", "T", "R", null, null -> "STR" is a prefix for "STRIP", "STRAP", etc.
    
    // Rows
    for (let r=0; r<5; r++) {
        pot += analyzeLinePotential([r*5, r*5+1, r*5+2, r*5+3, r*5+4], board, disabled);
    }
    // Cols
    for (let c=0; c<5; c++) {
        pot += analyzeLinePotential([c, c+5, c+10, c+15, c+20], board, disabled);
    }

    // 3. BONUS HUNTER
    // If a pipeline overlaps a bonus square, double the reward.
    board.forEach((l, i) => {
        if (l && !disabled[i] && bonusCells.includes(i)) {
            pot += 10;
        }
    });

    return pot;
}

function analyzeLinePotential(indices, board, disabled) {
    // Construct the string currently in this line
    let chars = "";
    let lockedCount = 0;
    
    for (let idx of indices) {
        if (board[idx]) chars += board[idx];
        if (disabled[idx]) lockedCount++;
    }

    // If the line is empty or fully locked, ignore
    if (chars.length === 0 || lockedCount > 0) return 0;

    // Is this string a start to a 5-letter word?
    // We check our special map.
    if (FIVE_LETTER_PREFIXES.has(chars)) {
        // Yes! Reward based on length. The closer to 5, the higher the reward.
        // length 2: +5
        // length 3: +15
        // length 4: +40 (Almost there!)
        if (chars.length === 2) return 5;
        if (chars.length === 3) return 15;
        if (chars.length === 4) return 40;
    }
    
    return 0;
}

// --- MAP BUILDERS ---
function buildFiveLetterMap() {
    DICTIONARY.forEach(word => {
        if (word.length === 5) {
            // Add all prefixes: "A", "AP", "APP", "APPL", "APPLE"
            let p = "";
            for (let c of word) {
                p += c;
                FIVE_LETTER_PREFIXES.add(p);
            }
        }
    });
}

function isValidSequence(board, idx) {
    // Quick Neighbor Check to prune impossible boards
    // If we place 'Q' next to 'Z', and 'QZ' isn't in any 5-letter word, kill it.
    
    // Horizontal
    if (idx % 5 < 4 && board[idx+1]) {
        let s = board[idx] + board[idx+1];
        if (!FIVE_LETTER_PREFIXES.has(s) && !FIVE_LETTER_PREFIXES.has(s.split('').reverse().join(''))) return false;
    }
    // Vertical
    if (idx < 20 && board[idx+5]) {
        let s = board[idx] + board[idx+5];
        if (!FIVE_LETTER_PREFIXES.has(s) && !FIVE_LETTER_PREFIXES.has(s.split('').reverse().join(''))) return false;
    }
    return true;
}


// --- SCORING (Unchanged) ---
function calculateAdvancedBonuses(wordLengths) {
    let counts = {3:0, 4:0, 5:0};
    wordLengths.forEach(len => counts[len]++);
    if (counts[5] >= 2 && counts[3]===0 && counts[4]===0) return 75;
    if (counts[4] >= 2 && counts[3]===0 && counts[5]===0) return 50;
    if (counts[3] >= 3 && counts[4]===0 && counts[5]===0) return 25;
    return 0;
}

function processMoveLogic(board, disabled, wordsTracker) {
    let pointsGained = 0;
    let cellsToLock = new Set();

    const check = (indices) => {
        for (let idx of indices) {
            if (board[idx] === null || disabled[idx]) return; 
        }

        let letters = indices.map(i => board[i]);
        let word = letters.join('');
        let rev = letters.slice().reverse().join('');
        
        let fwd = DICTIONARY.has(word);
        let bwd = DICTIONARY.has(rev);

        let base = (indices.length === 5) ? 13 : (indices.length === 4) ? 7 : 4;
        let multiplier = 1;
        indices.forEach(i => {
            if (bonusCells.includes(i)) multiplier *= (bonusCells.indexOf(i) === 4) ? 3 : 2;
        });

        if (fwd) {
            pointsGained += (base * multiplier);
            wordsTracker.push(indices.length);
            indices.forEach(i => cellsToLock.add(i));
        }
        if (bwd) {
            pointsGained += (base * multiplier);
            wordsTracker.push(indices.length);
            indices.forEach(i => cellsToLock.add(i));
        }
    };

    // 5s
    for(let r=0; r<5; r++) check([r*5, r*5+1, r*5+2, r*5+3, r*5+4]);
    for(let c=0; c<5; c++) check([c, c+5, c+10, c+15, c+20]);
    check([0,6,12,18,24]); check([4,8,12,16,20]);

    // 4s
    for(let r=0; r<5; r++) { check([r*5, r*5+1, r*5+2, r*5+3]); check([r*5+1, r*5+2, r*5+3, r*5+4]); }
    for(let c=0; c<5; c++) { check([c, c+5, c+10, c+15]); check([c+5, c+10, c+15, c+20]); }
    check([0,6,12,18]); check([6,12,18,24]); check([1,7,13,19]); check([5,11,17,23]);
    check([3,7,11,15]); check([9,13,17,21]); check([4,8,12,16]); check([8,12,16,20]);

    // 3s
    for(let r=0; r<5; r++) { check([r*5, r*5+1, r*5+2]); check([r*5+1, r*5+2, r*5+3]); check([r*5+2, r*5+3, r*5+4]); }
    for(let c=0; c<5; c++) { check([c, c+5, c+10]); check([c+5, c+10, c+15]); check([c+10, c+15, c+20]); }
    check([0,6,12]); check([6,12,18]); check([12,18,24]);
    check([4,8,12]); check([8,12,16]); check([12,16,20]);
    check([1,7,13]); check([7,13,19]); check([3,7,11]); check([7,11,15]);
    check([2,8,14]); check([10,16,22]); check([2,6,10]); check([14,18,22]); 
    check([5,11,17]); check([11,17,23]); check([9,13,17]); check([13,17,21]);

    cellsToLock.forEach(i => disabled[i] = true);
    return pointsGained;
}