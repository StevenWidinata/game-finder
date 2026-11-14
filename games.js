// Starter list of games. To make a game show up on every device by default,
// add it here and redeploy. Fields:
//   id          unique short id (letters/numbers/dashes)
//   name        game name
//   url         link to the game
//   category    one of the categories below (or a new one)
//   description what the game is, in plain words (helps search!)
//   tags        extra words people might search for
window.STARTER_GAMES = [
  // ---------- Words ----------
  { id: "wordle", name: "Wordle", url: "https://www.nytimes.com/games/wordle/index.html", category: "Words",
    description: "Guess the hidden 5-letter word in 6 tries.", tags: ["nyt", "5 letter", "daily word"] },
  { id: "quordle", name: "Quordle", url: "https://www.merriam-webster.com/games/quordle/", category: "Words",
    description: "Solve 4 Wordles at once in 9 tries.", tags: ["four", "4 words", "wordle"] },
  { id: "octordle", name: "Octordle", url: "https://www.merriam-webster.com/games/octordle/", category: "Words",
    description: "Solve 8 Wordles at once in 13 tries.", tags: ["eight", "8 words", "wordle"] },
  { id: "kilordle", name: "Kilordle", url: "https://jonesnxt.github.io/kilordle/", category: "Words",
    description: "1000 Wordle boards at the same time.", tags: ["thousand", "many", "wordle"] },
  { id: "absurdle", name: "Absurdle", url: "https://qntm.org/files/absurdle/absurdle.html", category: "Words",
    description: "Evil Wordle — the answer changes to dodge your guesses.", tags: ["hard", "adversarial", "wordle"] },
  { id: "wordle-unlimited", name: "Wordle Unlimited", url: "https://wordleunlimited.org/", category: "Words",
    description: "Play Wordle as many times as you want.", tags: ["infinite", "practice", "wordle"] },
  { id: "semantle", name: "Semantle", url: "https://semantle.com/", category: "Words",
    description: "Find the secret word by how close in meaning your guesses are.", tags: ["meaning", "similar", "hot cold"] },
  { id: "contexto", name: "Contexto", url: "https://contexto.me/", category: "Words",
    description: "Guess the secret word; each guess is ranked by how related it is.", tags: ["meaning", "rank", "related"] },
  { id: "connections", name: "Connections", url: "https://www.nytimes.com/games/connections", category: "Words",
    description: "Sort 16 words into 4 groups that share something.", tags: ["nyt", "groups", "categories"] },
  { id: "strands", name: "Strands", url: "https://www.nytimes.com/games/strands", category: "Words",
    description: "Find themed words hidden in a letter grid.", tags: ["nyt", "word search", "theme"] },
  { id: "spelling-bee", name: "Spelling Bee", url: "https://www.nytimes.com/puzzles/spelling-bee", category: "Words",
    description: "Make words from 7 letters; always use the center letter.", tags: ["nyt", "honeycomb", "letters"] },
  { id: "mini-crossword", name: "The Mini Crossword", url: "https://www.nytimes.com/crosswords/game/mini", category: "Words",
    description: "A small daily crossword you can finish in a minute.", tags: ["nyt", "crossword", "clues"] },
  { id: "waffle", name: "Waffle", url: "https://wafflegame.net/", category: "Words",
    description: "Swap letters in a waffle-shaped grid to fix 6 words.", tags: ["swap", "grid"] },
  { id: "squaredle", name: "Squaredle", url: "https://squaredle.app/", category: "Words",
    description: "Find words by connecting letters in a square grid.", tags: ["boggle", "grid", "word search"] },
  { id: "phrazle", name: "Phrazle", url: "https://solitaired.com/phrazle", category: "Words",
    description: "Wordle, but you guess a whole phrase.", tags: ["phrase", "sentence", "wordle"] },

  // ---------- Geography ----------
  { id: "globle", name: "Globle", url: "https://globle-game.com/", category: "Geography",
    description: "Guess the mystery country on a 3D globe — colors show hot or cold.", tags: ["country", "globe", "map", "world", "hot cold"] },
  { id: "worldle", name: "Worldle", url: "https://worldle.teuteuf.fr/", category: "Geography",
    description: "Guess the country from its outline shape.", tags: ["country", "shape", "silhouette", "map"] },
  { id: "flagle", name: "Flagle", url: "https://www.flagle.io/", category: "Geography",
    description: "Guess the country from its flag, revealed piece by piece.", tags: ["flag", "country"] },
  { id: "travle", name: "Travle", url: "https://travle.earth/", category: "Geography",
    description: "Connect two countries by naming the countries in between.", tags: ["country", "route", "border", "map"] },
  { id: "tradle", name: "Tradle", url: "https://oec.world/en/games/tradle", category: "Geography",
    description: "Guess the country from a chart of what it exports.", tags: ["country", "trade", "export", "economy"] },
  { id: "countryle", name: "Countryle", url: "https://countryle.com/", category: "Geography",
    description: "Guess the country using hints like continent, population and temperature.", tags: ["country", "clues", "stats"] },
  { id: "timeguessr", name: "TimeGuessr", url: "https://timeguessr.com/", category: "Geography",
    description: "See a photo, guess where and what year it was taken.", tags: ["photo", "year", "history", "location", "geoguessr"] },
  { id: "emovi", name: "Emovi", url: "https://emovi.teuteuf.fr/", category: "Music & Movies",
    description: "Guess the movie from emojis.", tags: ["film", "emoji"] },

  // ---------- Numbers & Logic ----------
  { id: "krillion", name: "Krillion", url: "https://krillion.io/", category: "Trivia & More",
    description: "7 prompts a day — the rarer your answer, the deeper you dive.", tags: ["rare answers", "prompts", "unique", "dive", "deep"] },
  { id: "nerdle", name: "Nerdle", url: "https://nerdlegame.com/", category: "Numbers & Logic",
    description: "Wordle for math — guess the hidden equation.", tags: ["math", "equation", "numbers"] },
  { id: "mathler", name: "Mathler", url: "https://www.mathler.com/", category: "Numbers & Logic",
    description: "Find the equation that equals the target number.", tags: ["math", "equation", "numbers"] },
  { id: "queens", name: "Queens", url: "https://www.linkedin.com/games/queens", category: "Numbers & Logic",
    description: "Place one queen in each row, column and color region.", tags: ["linkedin", "logic", "grid"] },

  // ---------- Music & Movies ----------
  { id: "bandle", name: "Bandle", url: "https://bandle.app/", category: "Music & Movies",
    description: "Guess the song as instruments are added one by one.", tags: ["song", "music", "heardle", "audio"] },
  { id: "framed", name: "Framed", url: "https://framed.wtf/", category: "Music & Movies",
    description: "Guess the movie from still frames.", tags: ["film", "movie", "picture"] },

  // ---------- Trivia & More ----------
  { id: "costcodle", name: "Costcodle", url: "https://costcodle.com/", category: "Trivia & More",
    description: "Guess the price of a Costco product.", tags: ["price", "shopping", "price is right"] },
  { id: "metazooa", name: "Metazooa", url: "https://metazooa.com/", category: "Trivia & More",
    description: "Guess the mystery animal using the tree of life.", tags: ["animal", "nature", "biology"] },
  { id: "metaflora", name: "Metaflora", url: "https://flora.metazooa.com/", category: "Trivia & More",
    description: "Guess the mystery plant using the tree of life.", tags: ["plant", "flower", "nature", "biology"] },
  { id: "wikitrivia", name: "Wikitrivia", url: "https://wikitrivia.tomjwatson.com/", category: "Trivia & More",
    description: "Put historical events and inventions in the right order.", tags: ["history", "timeline", "dates"] },
  { id: "loldle", name: "LoLdle", url: "https://loldle.net/", category: "Trivia & More",
    description: "Guess the League of Legends champion.", tags: ["league of legends", "lol", "champion", "video game"] },
  { id: "angle", name: "Angle", url: "https://www.angle.wtf/", category: "Trivia & More",
    description: "Guess the angle in degrees.", tags: ["degrees", "geometry", "math"] },
];
