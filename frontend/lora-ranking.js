document.addEventListener('DOMContentLoaded', (event) => {
  fetchRankings();
});

function fetchRankings() {
  const subset = new URLSearchParams(window.location.search).get('subset') || 'default';
  fetch(`/api/lora-rankings/${subset}`)
    .then(response => response.json())
    .then(data => {
      const rankingContainer = document.getElementById('ranking-container');
      rankingContainer.innerHTML = '';
      data.forEach(item => {
        const rankingItem = document.createElement('div');
        rankingItem.className = 'ranking-item';
        rankingItem.innerHTML = `
          <span>${item.lora}</span>
          <span>Elo: ${item.elo}</span>
          <span>Matches: ${item.matches}</span>
        `;
        rankingContainer.appendChild(rankingItem);
      });
    })
    .catch(error => {
      console.error('Error fetching rankings:', error);
    });
}
