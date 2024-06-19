let currentPair = [];
let subset = 'default'; // Default subset

document.addEventListener('DOMContentLoaded', (event) => {
  fetchSubsets();
});

function fetchSubsets() {
  fetch('/api/subsets')
    .then(response => response.json())
    .then(data => {
      const subsetSelect = document.getElementById('subset-select');
      if (!subsetSelect) {
        console.error('Subset select element not found');
        return;
      }
      subsetSelect.innerHTML = ''; // Clear existing options
      data.forEach(subsetName => {
        const option = document.createElement('option');
        option.value = subsetName;
        option.textContent = subsetName;
        subsetSelect.appendChild(option);
      });
      subset = data[0]; // Set default subset to the first one
      fetchMatch();
    })
    .catch(error => console.error('Error fetching subsets:', error));
}

function fetchMatch() {
  fetch(`/api/match/${subset}`)
    .then(response => response.json())
    .then(data => {
      currentPair = [data.image1, data.image2];
      document.getElementById('image1').src = `images/${subset}/${currentPair[0]}`;
      document.getElementById('image2').src = `images/${subset}/${currentPair[1]}`;
    })
    .catch(error => console.error('Error fetching match:', error));
}

function vote(winnerIndex) {
  const winner = currentPair[winnerIndex - 1];
  const loser = currentPair[winnerIndex === 1 ? 1 : 0];
  fetch(`/api/vote/${subset}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ winner, loser })
  }).then(() => {
    fetchMatch();
  }).catch(error => console.error('Error recording vote:', error));
}

function changeSubset() {
  const subsetSelect = document.getElementById('subset-select');
  subset = subsetSelect.value;
  fetchMatch();
}

function confirmDelete(imageIndex) {
  const image = currentPair[imageIndex - 1];
  if (confirm(`Are you sure you want to delete ${image}?`)) {
    deleteImage(image);
  }
}

function deleteImage(image) {
  fetch(`/api/image/${subset}/${image}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(() => {
    fetchMatch();
  }).catch(error => console.error('Error deleting image:', error));
}
