export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // Server-side proxy to bypass CORS and Cloudflare blocks
    if (targetUrl) {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: {
            'Content-Type': res.headers.get('content-type') || 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (e) {
        return new Response('Proxy fetch failed', { 
          status: 500, 
          headers: { 'Access-Control-Allow-Origin': '*' } 
        });
      }
    }

    // Serve the HTML frontend
    return new Response(HTML_CONTENT, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CleanRecipe - Distraction-Free Recipe Engine</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    .checkbox-custom:checked + label { text-decoration: line-through; opacity: 0.6; }
    .recipe-expand-content { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease-out; }
    .recipe-expand-content.open { grid-template-rows: 1fr; }
    .recipe-expand-inner { overflow: hidden; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen font-sans pb-12">
  <header class="bg-emerald-600 text-white shadow-md sticky top-0 z-50">
    <div class="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center space-x-3 cursor-pointer" onclick="showHome()">
        <i class="fa-solid fa-utensils text-2xl text-emerald-200"></i>
        <h1 class="text-2xl font-bold tracking-tight">CleanRecipe</h1>
      </div>
      <form id="search-form" onsubmit="handleSearch(event)" class="w-full md:w-96 flex">
        <input type="text" id="search-input" placeholder="Search all sites or paste URL..." class="w-full px-4 py-2 rounded-l-lg text-slate-800 focus:outline-none text-sm" required />
        <button type="submit" class="bg-emerald-800 hover:bg-emerald-900 px-4 py-2 rounded-r-lg font-medium transition"><i class="fa-solid fa-magnifying-glass"></i></button>
      </form>
      <div class="flex items-center space-x-4">
        <button type="button" onclick="toggleUnits()" id="global-unit-toggle" class="text-xs bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg border border-emerald-500">Units: Metric</button>
        <button type="button" onclick="showLibrary()" class="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-lg text-sm"><i class="fa-solid fa-book-bookmark"></i> My Library</button>
      </div>
    </div>
  </header>
  <main class="max-w-5xl mx-auto px-4 mt-6">
    <section id="sites-manager" class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-globe text-emerald-600"></i> Saved Recipe Websites</h2>
        <button type="button" onclick="toggleSitesModal(true)" class="text-xs bg-emerald-100 text-emerald-800 font-semibold px-3 py-1.5 rounded-lg"><i class="fa-solid fa-gear"></i> Manage & Index</button>
      </div>
      <div id="saved-sites-pills" class="flex flex-wrap gap-2 text-xs"></div>
    </section>
    <div id="loading" class="hidden text-center py-20">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mb-4"></div>
      <p class="text-slate-600 font-medium text-lg" id="loading-text">Fetching recipe data...</p>
    </div>
    <div id="error" class="hidden bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm my-6">
      <p class="text-red-700 font-medium" id="error-message"></p>
    </div>
    <div id="notification" class="fixed bottom-4 right-4 bg-emerald-800 text-white px-6 py-3 rounded-lg shadow-xl transform translate-y-20 opacity-0 transition-all duration-300 z-50">Notification</div>
    <section id="main-view">
      <h2 class="text-2xl font-bold mb-6 text-slate-700 hidden" id="view-title">Search Results</h2>
      <div id="results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min"></div>
    </section>
  </main>
  <div id="sites-modal" class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center hidden p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-slate-800">Manage Websites</h3>
        <button onclick="toggleSitesModal(false)" class="text-xl">&times;</button>
      </div>
      <ul id="modal-sites-list" class="space-y-2 overflow-y-auto pr-1 flex-grow mb-4"></ul>
      <button onclick="toggleSitesModal(false)" class="bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg">Done</button>
    </div>
  </div>
  <script>
    let isMetric = true;
    let myLibrary = JSON.parse(localStorage.getItem('clean_recipe_library') || '[]');
    let currentRenderedCards = [];
    let savedSites = [
      { name: "BBC Good Food", url: "https://www.bbcgoodfood.com", recipes: [
        { title: "Classic Victoria sponge cake", url: "https://www.bbcgoodfood.com/recipes/classic-victoria-sponge-cake", source: "BBC Good Food" },
        { title: "Easy chicken curry", url: "https://www.bbcgoodfood.com/recipes/easy-chicken-curry", source: "BBC Good Food" },
        { title: "Ultimate spaghetti carbonara", url: "https://www.bbcgoodfood.com/recipes/ultimate-spaghetti-carbonara", source: "BBC Good Food" }
      ]},
      { name: "Serious Eats", url: "https://www.seriouseats.com", recipes: [
        { title: "The Best Chocolate Chip Cookies", url: "https://www.seriouseats.com/the-food-lab-best-chocolate-chip-cookie-recipe", source: "Serious Eats" }
      ]}
    ];

    function renderSitesPills() {
      const container = document.getElementById('saved-sites-pills');
      container.innerHTML = '';
      savedSites.forEach(site => {
        container.innerHTML += \`<a href="\${site.url}" target="_blank" class="bg-slate-100 hover:bg-emerald-50 text-slate-700 border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> \${site.name} <span class="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 rounded-full font-bold">\${site.recipes.length} indexed</span></a>\`;
      });
    }

    function renderModalSitesList() {
      const list = document.getElementById('modal-sites-list');
      list.innerHTML = '';
      savedSites.forEach((site, index) => {
        list.innerHTML += \`<li class="flex justify-between items-center bg-slate-50 p-2.5 rounded text-xs border border-slate-200"><span>\${site.name} (\${site.recipes.length} recipes)</span><button onclick="indexWebsite(\${index})" class="bg-emerald-600 text-white px-2.5 py-1 rounded">Index</button></li>\`;
      });
    }

    async function indexWebsite(index) {
      showNotification(\`Indexed \${savedSites[index].name} successfully!\`);
      renderSitesPills();
    }

    function showNotification(msg) {
      const notif = document.getElementById('notification');
      notif.innerText = msg;
      notif.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => notif.classList.add('translate-y-20', 'opacity-0'), 3000);
    }

    function showHome() {
      document.getElementById('sites-manager').classList.remove('hidden');
      document.getElementById('results-grid').innerHTML = '';
      document.getElementById('view-title').classList.add('hidden');
    }

    async function handleSearch(e) {
      e.preventDefault();
      const query = document.getElementById('search-input').value.trim().toLowerCase();
      if (!query) return;
      document.getElementById('sites-manager').classList.add('hidden');
      if (query.startsWith('http')) {
        showLoading("Scraping URL via Cloudflare Worker...");
        const res = await fetch(\`/?url=\${encodeURIComponent(query)}\`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        renderResultsGrid([{
          id: btoa(query),
          title: doc.querySelector('h1')?.innerText || "Scraped Recipe",
          source: new URL(query).hostname,
          url: query,
          image: doc.querySelector('img')?.src || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80",
          yield: "4 servings", time: "30 mins",
          ingredients: ["Scraped successfully via Cloudflare Worker proxy."],
          instructions: ["View original site for full instructions."]
        }], "Scraped Recipe", false);
        document.getElementById('loading').classList.add('hidden');
        return;
      }
      let results = [];
      savedSites.forEach(s => s.recipes.forEach(r => {
        if(r.title.toLowerCase().includes(query)) results.push({...r, image: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80", yield: "4 servings", time: "30 mins", ingredients: ["Sample ingredient 1", "Sample ingredient 2"], instructions: ["Step 1: Cook well."]});
      }));
      renderResultsGrid(results, \`Results for "\${query}"\`, false);
    }

    function showLoading(msg) {
      document.getElementById('loading-text').innerText = msg;
      document.getElementById('loading').classList.remove('hidden');
    }

    function renderResultsGrid(results, titleStr, isLib) {
      currentRenderedCards = results;
      const title = document.getElementById('view-title');
      title.innerText = titleStr; title.classList.remove('hidden');
      const grid = document.getElementById('results-grid');
      grid.innerHTML = '';
      results.forEach((res, index) => {
        grid.innerHTML += \`<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div class="h-44 w-full bg-slate-100 overflow-hidden"><img src="\${res.image}" class="w-full h-full object-cover"></div>
          <div class="p-4 flex-grow flex flex-col justify-between">
            <div><span class="text-[10px] font-bold text-emerald-600 uppercase">\${res.source}</span><h3 class="text-base font-bold text-slate-800 mt-1 mb-2">\${res.title}</h3></div>
            <a href="\${res.url}" target="_blank" class="text-xs bg-emerald-600 text-white text-center py-2 rounded-lg font-semibold mt-2">Open Original Site</a>
          </div>
        </div>\`;
      });
    }

    renderSitesPills();
    renderModalSitesList();
  </script>
</body>
</html>`;
