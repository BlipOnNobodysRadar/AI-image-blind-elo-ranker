# AI Image Elo Ranker

This is a quick and dirty Node.js project to rate the Elo of both individual AI-generated images and their associated Loras pulled from .png metadata. It could be adapted to rate any arbitrary aspect of the metadata, but for now, that's all it does.

## Prerequisites

- Node.js (v12.x or higher)
- npm (v6.x or higher)

## Installation

1. **Clone the repository**:

   ```sh
    git clone https://github.com/BlipOnNobodysRadar/AI-image-blind-elo-ranker.git
    cd AI-image-blind-elo-ranker
   ```
2. **Install dependencies**
    ```sh
    npm install
    ```

## Usage

1. **Start the server:**
    ```sh
    node backend/server.js
    ```
2. **Open the application in your browser:**
    Navigate to `http://localhost:3000` in your web browser.

## Directory Structure
```
AI-IMAGE-RANKER/
├── backend/
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── lora-ranking.js
│   ├── lora-rankings.html
│   ├── ranking.js
│   ├── rankings.html
│   └── script.js
├── images/
│   ├── placeholder subset/
│   └── placeholder subset 2/
├── node_modules/
├── package-lock.json
├── package.json
└── README.md
```

## Adding Images

- Place your images in one of the subset directories inside the images directory (e.g., `images/placeholder subset/`).
- Ensure the images are in `.jpg`, `.jpeg`, `.png`, `.webp`, or `.gif` format.

## Deleting Images

- To delete an image, click the "Delete Image" button below the image in the UI.
- Confirm the deletion when prompted.

## How It Works

- **Rating Images**: The app displays two images side-by-side. Click on the image you prefer to vote for it.
- **Updating Rankings**: The Elo ratings are updated based on your votes. You can view the rankings on the "Elo Rankings" and "Lora Rankings" pages.
- **Metadata Handling**: The application reads the metadata from `.png` images to determine associated Loras.

## API Endpoints

- `GET /api/subsets`: Get all available subsets.
- `GET /api/images/`: Get all images in a subset.
- `GET /api/match/`: Get a pair of images to vote on.
- `GET /api/elo-rankings/`: Get Elo rankings of images in a subset.
- `GET /api/lora-rankings/`: Get Elo rankings of Loras in a subset.
- `POST /api/vote/`: Submit a vote.
- `DELETE /api/image/`: Delete an image.

## Example Workflow

1. **Start the Server**: Run `node backend/server.js`.
2. **Open Browser**: Go to `http://localhost:3000`.
3. **Select Subset**: Use the dropdown to select an image subset.
4. **Vote**: Click on the image you prefer. The Elo ratings will update accordingly.
5. **View Rankings**: Navigate to the "Elo Rankings" or "Lora Rankings" pages to see updated rankings.
6. **Delete Images**: Use the "Delete Image" button if needed.
