app.get('/api/elo-rankings/:subset', (req, res) => {
  const subset = req.params.subset;
  if (!subsets[subset]) {
    loadSubset(subset);
  }
  const { eloRatings, matchCount } = subsets[subset];
  const sortedImages = Object.keys(eloRatings).sort((a, b) => eloRatings[b] - eloRatings[a]);
  res.json(sortedImages.map(image => ({
    image,
    elo: eloRatings[image],
    matches: matchCount[image]
  })));
});

app.get('/api/lora-rankings/:subset', (req, res) => {
  const subset = req.params.subset;
  if (!subsets[subset]) {
    loadSubset(subset);
  }
  const { loraModelRatings, matchCount } = subsets[subset];
  const sortedLoras = Object.keys(loraModelRatings).sort((a, b) => loraModelRatings[b] - loraModelRatings[a]);
  res.json(sortedLoras.map(lora => ({
    lora,
    elo: loraModelRatings[lora],
    matches: Object.keys(matchCount).filter(key => key.includes(lora)).reduce((acc, key) => acc + matchCount[key], 0)
  })));
});
