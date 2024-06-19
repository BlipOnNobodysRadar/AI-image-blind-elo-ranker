const express = require('express');  // Import the Express framework
const bodyParser = require('body-parser');  // Import the body-parser middleware for parsing JSON request bodies
const fs = require('fs');  // Import the filesystem module for interacting with the file system
const path = require('path');  // Import the path module for working with file and directory paths
const pngMetadata = require('png-metadata');  // Import the png-metadata module for reading PNG metadata

const app = express();  // Create an Express application instance
app.use(bodyParser.json());  // Use the body-parser middleware to parse JSON request bodies

// Serve the frontend static files from the '../frontend' directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve images static files from the '../images' directory
app.use('/images', express.static(path.join(__dirname, '../images')));

let subsets = {};  // Object to hold multiple subsets

// Load available subsets from the images directory
function loadSubsets() {
  const subsetsDir = path.join(__dirname, '../images');
  return fs.readdirSync(subsetsDir).filter(subset => fs.statSync(path.join(subsetsDir, subset)).isDirectory());
}

// Load or initialize Elo ratings and match count for each subset
function loadSubset(subset) {
  const subsetPath = path.join(__dirname, `../images/${subset}`);
  if (!fs.existsSync(subsetPath)) {
    throw new Error(`Subset ${subset} does not exist`);
  }

  let images = fs.readdirSync(subsetPath).filter(file => file.match(/\.(jpg|jpeg|png|webp|gif)$/));  // Only include valid image files
  let { eloRatings, matchCount, loraModelRatings } = fs.existsSync(`eloRatings-${subset}.json`)
    ? JSON.parse(fs.readFileSync(`eloRatings-${subset}.json`))
    : initializeRatings(images, subsetPath);

  subsets[subset] = { images, eloRatings, matchCount, loraModelRatings };
}

// Initialize Elo ratings, match counts, and lora model ratings for images
function initializeRatings(images, subsetPath) {
  const eloRatings = {};
  const matchCount = {};
  const loraModelRatings = {};
  images.forEach(image => {
    const metadata = getMetadata(path.join(subsetPath, image));
    const loraMatch = metadata.match(/<lora:([^:]+):/);
    if (loraMatch) {
      const loraModel = loraMatch[1];
      eloRatings[image] = 1000;  // Initialize all images with 1000 Elo rating
      matchCount[image] = 0;  // Initialize match count to 0
      if (!loraModelRatings[loraModel]) {
        loraModelRatings[loraModel] = { rating: 1000, count: 0 };  // Initialize lora model rating if not already present
      }
    } else {
      console.error(`No loraModel found in metadata for image: ${image}`);
    }
  });
  return { eloRatings, matchCount, loraModelRatings };
}

// Get metadata from a PNG image
function getMetadata(imagePath) {
  try {
    const buffer = pngMetadata.readFileSync(imagePath);
    const chunks = pngMetadata.splitChunk(buffer);
    const textChunks = chunks.filter(chunk => chunk.type === 'tEXt');
    const parametersChunk = textChunks.find(chunk => chunk.data.includes('parameters'));
    return parametersChunk ? parametersChunk.data : '';
  } catch (error) {
    console.error(`Error reading PNG metadata for image: ${imagePath}`, error);
    return '';
  }
}

// Endpoint to get the list of available subsets
app.get('/api/subsets', (req, res) => {
  res.json(loadSubsets());
});

// Endpoint to get the list of images in a subset
app.get('/api/images/:subset', (req, res) => {
  const subset = req.params.subset;
  if (!subsets[subset]) {
    loadSubset(subset);
  } else {
    updateSubsetImages(subset);  // Update subset images if already loaded
  }
  res.json(subsets[subset].images);
});

// Endpoint to get a pair of images for a match
app.get('/api/match/:subset', (req, res) => {
  const subset = req.params.subset;
  if (!subsets[subset]) {
    loadSubset(subset);
  } else {
    updateSubsetImages(subset);  // Update subset images if already loaded
  }
  const { images, eloRatings, matchCount } = subsets[subset];
  const [image1, image2] = selectPair(images, eloRatings, matchCount);
  res.json({ image1, image2 });
});

// Endpoint to get Elo rankings for images in a subset
app.get('/api/elo-rankings/:subset', (req, res) => {
  const subset = req.params.subset;
  if (!subsets[subset]) {
    loadSubset(subset);
  } else {
    updateSubsetImages(subset);  // Update subset images if already loaded
  }
  const { eloRatings, matchCount } = subsets[subset];
  const sortedImages = Object.keys(eloRatings).sort((a, b) => eloRatings[b] - eloRatings[a]);
  res.json(sortedImages.map(image => ({ image, elo: eloRatings[image], matches: matchCount[image] })));
});

// Endpoint to get Elo rankings for lora models in a subset
app.get('/api/lora-rankings/:subset', (req, res) => {
  const subset = req.params.subset;
  if (!subsets[subset]) {
    loadSubset(subset);
  } else {
    updateSubsetImages(subset);  // Update subset images if already loaded
  }
  const { loraModelRatings } = subsets[subset];
  const sortedLoras = Object.keys(loraModelRatings).sort((a, b) => loraModelRatings[b].rating - loraModelRatings[a].rating);
  res.json(sortedLoras.map(lora => ({ lora, elo: loraModelRatings[lora].rating, matches: loraModelRatings[lora].count })));
});

// Endpoint to record a vote and update Elo ratings
app.post('/api/vote/:subset', (req, res) => {
  const subset = req.params.subset;
  const { winner, loser } = req.body;
  if (!subsets[subset]) {
    loadSubset(subset);
  }
  const { eloRatings, matchCount, loraModelRatings } = subsets[subset];
  updateEloRatings(winner, loser, eloRatings, matchCount, loraModelRatings, subset);
  fs.writeFileSync(`eloRatings-${subset}.json`, JSON.stringify({ eloRatings, matchCount, loraModelRatings }));
  res.json({ message: 'Vote recorded' });
});

// Endpoint to delete an image and its caption
app.delete('/api/image/:subset/:image', (req, res) => {
  const subset = req.params.subset;
  const image = req.params.image;
  const imagePath = path.join(__dirname, `../images/${subset}/${image}`);
  const captionPath = imagePath.replace(/\.(jpg|jpeg|png|webp|gif)$/, '.txt');

  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);  // Delete the image file
  }

  if (fs.existsSync(captionPath)) {
    fs.unlinkSync(captionPath);  // Delete the associated caption file
  }

  // Remove image from subset
  const { images, eloRatings, matchCount } = subsets[subset];
  const index = images.indexOf(image);
  if (index > -1) {
    images.splice(index, 1);
  }
  delete eloRatings[image];
  delete matchCount[image];

  // Save the updated data
  fs.writeFileSync(`eloRatings-${subset}.json`, JSON.stringify({ eloRatings, matchCount }));

  res.json({ message: 'Image and caption deleted' });
});

// Update the images in a subset by checking for new images
function updateSubsetImages(subset) {
  const subsetPath = path.join(__dirname, `../images/${subset}`);
  let images = fs.readdirSync(subsetPath).filter(file => file.match(/\.(jpg|jpeg|png|webp|gif)$/));
  const { eloRatings, matchCount, loraModelRatings } = subsets[subset];
  
  // Check for new images
  images.forEach(image => {
    if (!eloRatings[image]) {
      const metadata = getMetadata(path.join(subsetPath, image));
      const loraMatch = metadata.match(/<lora:([^:]+):/);
      if (loraMatch) {
        const loraModel = loraMatch[1];
        eloRatings[image] = 1000;  // Initialize new image with 1000 Elo rating
        matchCount[image] = 0;  // Initialize match count to 0
        if (!loraModelRatings[loraModel]) {
          loraModelRatings[loraModel] = { rating: 1000, count: 0 };  // Initialize lora model rating if not already present
        }
      } else {
        console.error(`No loraModel found in metadata for image: ${image}`);
      }
    }
  });

  subsets[subset].images = images;  // Update subset images
}

// Select a pair of images for a match
function selectPair(images, eloRatings, matchCount) {
  const newImages = images.filter(image => matchCount[image] < 10);  // Images with less than 10 matches
  if (newImages.length > 1) {
    const [image1, image2] = getRandomPair(newImages);
    return [image1, image2];
  } else {
    return getClosestPair(images, eloRatings);
  }
}

// Get a random pair of images
function getRandomPair(images) {
  let index1 = Math.floor(Math.random() * images.length);
  let index2;
  do {
    index2 = Math.floor(Math.random() * images.length);
  } while (index1 === index2);
  return [images[index1], images[index2]];
}

// Get a pair of images with the closest Elo ratings
function getClosestPair(images, eloRatings) {
  let minDiff = Infinity;
  let pair = [];
  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const diff = Math.abs(eloRatings[images[i]] - eloRatings[images[j]]);
      if (diff < minDiff) {
        minDiff = diff;
        pair = [images[i], images[j]];
      }
    }
  }
  return pair;
}

// Update Elo ratings after a vote
function updateEloRatings(winner, loser, eloRatings, matchCount, loraModelRatings, subset) {
  const k = getKFactor(matchCount[winner], matchCount[loser]);
  const winnerRating = eloRatings[winner];
  const loserRating = eloRatings[loser];

  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  eloRatings[winner] = winnerRating + k * (1 - expectedWinner);
  eloRatings[loser] = loserRating + k * (0 - expectedLoser);

  matchCount[winner] += 1;
  matchCount[loser] += 1;

  const winnerMetadata = getMetadata(path.join(__dirname, '../images', subset, winner));
  const loserMetadata = getMetadata(path.join(__dirname, '../images', subset, loser));

  const winnerLoraMatch = winnerMetadata.match(/<lora:([^:]+):/);
  const loserLoraMatch = loserMetadata.match(/<lora:([^:]+):/);

  if (winnerLoraMatch && loserLoraMatch) {
    const winnerLora = winnerLoraMatch[1];
    const loserLora = loserLoraMatch[1];

    // Avoid updating lora ratings if they are the same
    if (winnerLora !== loserLora) {
      const winnerLoraRating = loraModelRatings[winnerLora].rating;
      const loserLoraRating = loraModelRatings[loserLora].rating;

      const expectedLoraWinner = 1 / (1 + Math.pow(10, (loserLoraRating - winnerLoraRating) / 400));
      const expectedLoraLoser = 1 - expectedLoraWinner;

      loraModelRatings[winnerLora].rating = winnerLoraRating + k * (1 - expectedLoraWinner);
      loraModelRatings[loserLora].rating = loserLoraRating + k * (0 - expectedLoraLoser);

      loraModelRatings[winnerLora].count += 1;
      loraModelRatings[loserLora].count += 1;
    }
  }
}

// Get the K-factor for Elo rating updates based on match counts
function getKFactor(winnerMatches, loserMatches) {
  const baseK = 32;
  if (winnerMatches < 30 && loserMatches < 30) {
    return baseK;
  } else if (winnerMatches < 30 || loserMatches < 30) {
    return baseK / 2;
  } else {
    return baseK / 4;
  }
}

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
