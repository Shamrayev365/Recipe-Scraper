export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (targetUrl) {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'CleanRecipeBot/1.0 (Compatible; RSS/Sitemap Reader)'
          }
        });
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: {
            'Content-Type': res.headers.get('content-type') || 'application/xml',
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
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen font-sans pb-12">
  <header class="bg-emerald-600 text-white shadow-md sticky top-0 z-50">
    <div class="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center space-x-3 cursor-pointer" onclick="showHome()">
        <i class="fa-solid fa-utensils text-2xl text-emerald-200"></i>
        <h1 class="text-2xl font-bold tracking-tight">CleanRecipe</h1>
      </div>
      <form id="search-form" onsubmit="handleSearch(event)" class="w-full md:w-96 flex">
        <input type="text" id="search-input" placeholder="Search all sites..." class="w-full px-4 py-2 rounded-l-lg text-slate-800 focus:outline-none text-sm" required />
        <button type="submit" class="bg-emerald-800 hover:bg-emerald-900 px-4 py-2 rounded-r-lg font-medium transition"><i class="fa-solid fa-magnifying-glass"></i></button>
      </form>
      <div class="flex items-center space-x-4">
        <button type="button" onclick="toggleUnits()" id="global-unit-toggle" class="text-xs bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg border border-emerald-500">Units: Metric</button>
      </div>
    </div>
  </header>
  <main class="max-w-5xl mx-auto px-4 mt-6">
    <section id="sites-manager" class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-globe text-emerald-600"></i> Saved Recipe Feeds & Sites</h2>
        <button type="button" onclick="toggleSitesModal(true)" class="text-xs bg-emerald-100 text-emerald-800 font-semibold px-3 py-1.5 rounded-lg"><i class="fa-solid fa-gear"></i> Manage & Index</button>
      </div>
      <div id="saved-sites-pills" class="flex flex-wrap gap-2 text-xs"></div>
    </section>
    <div id="notification" class="fixed bottom-4 right-4 bg-emerald-800 text-white px-6 py-3 rounded-lg shadow-xl transform translate-y-20 opacity-0 transition-all duration-300 z-50">Notification</div>
    <section id="main-view">
      <h2 class="text-2xl font-bold mb-6 text-slate-700 hidden" id="view-title">Search Results</h2>
      <div id="results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min"></div>
    </section>
  </main>
  
  <div id="sites-modal" class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center hidden p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-slate-800">Manage & Index Feeds</h3>
        <button onclick="toggleSitesModal(false)" class="text-xl">&times;</button>
      </div>
      <form onsubmit="addCustomSite(event)" class="mb-4 bg-slate-50 p-3 rounded border">
        <input type="text" id="new-site-name" placeholder="Site Name (e.g. Connoisseurus Veg)" class="w-full px-2 py-1 mb-2 border rounded text-xs" required />
        <input type="url" id="new-site-feed" placeholder="RSS Feed URL (e.g. https://site.com/feed/)" class="w-full px-2 py-1 mb-2 border rounded text-xs" required />
        <button type="submit" class="w-full bg-emerald-600 text-white py-1 rounded text-xs font-semibold">Add Feed</button>
      </form>
      <ul id="modal-sites-list" class="space-y-2 overflow-y-auto pr-1 flex-grow mb-4"></ul>
      <button onclick="toggleSitesModal(false)" class="bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg">Done</button>
    </div>
  </div>

  <script>
    let savedSites = JSON.parse(localStorage.getItem('clean_recipe_saved_sites') || JSON.stringify([
      { name: "Connoisseur Veg", feedUrl: "https://connoisseurusveg.com/feed/", recipes: [] }
    ]));

    function saveSites() {
      localStorage.setItem('clean_recipe_saved_sites', JSON.stringify(savedSites));
      renderSitesPills();
      renderModalSitesList();
    }

    function renderSitesPills() {
      const container = document.getElementById('saved-sites-pills');
      container.innerHTML = '';
      savedSites.forEach(site => {
        container.innerHTML += \`<div class="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5"><span class="font-semibold">\${site.name}</span> <span class="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 rounded-full font-bold">\${site.recipes.length} indexed</span></div>\`;
      });
    }

    function renderModalSitesList() {
      const list = document.getElementById('modal-sites-list');
      list.innerHTML = '';
      savedSites.forEach((site, index) => {
        list.innerHTML += \`<li class="flex justify-between items-center bg-slate-50 p-2.5 rounded text-xs border border-slate-200">
          <div class="truncate max-w-[240px]"><span class="font-bold">\${site.name}</span><br/><span class="text-slate-400">\${site.feedUrl}</span><br/><span class="text-emerald-600">\${site.recipes.length} recipes indexed</span></div>
          <div class="flex gap-1 items-center">
            <button type="button" onclick="indexFeed(\${index})" class="bg-emerald-600 text-white px-2.5 py-1 rounded font-medium">Index</button>
            <button type="button" onclick="removeSite(\${index})" class="bg-red-100 text-red-700 px-2 py-1 rounded"><i class="fa-solid fa-trash"></i></button>
          </div>
        </li>\`;
      });
    }

    function addCustomSite(e) {
      e.preventDefault();
      const name = document.getElementById('new-site-name').value.trim();
      const feedUrl = document.getElementById('new-site-feed').value.trim();
      if (name && feedUrl) {
        savedSites.push({ name, feedUrl, recipes: [] });
        saveSites();
        e.target.reset();
      }
    }

    function removeSite(index) {
      savedSites.splice(index, 1);
      saveSites();
    }

    function toggleSitesModal(show) {
      document.getElementById('sites-modal').classList.toggle('hidden', !show);
    }

    async function indexFeed(index) {
      const site = savedSites[index];
      showNotification(\`Indexing \${site.name}...\`);
      try {
        const res = await fetch(\`/?url=\${encodeURIComponent(site.feedUrl)}\`);
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        let extracted = [];
        const items = xml.querySelectorAll('item, entry, url');
        items.forEach(node => {
          let title = node.querySelector('title')?.textContent;
          let loc = node.querySelector('link')?.textContent || node.querySelector('loc')?.textContent;
          if (!loc && node.querySelector('link')) {
            loc = node.querySelector('link').getAttribute('href');
          }
          if (title && loc) {
            extracted.push({ title: title.trim(), url: loc.trim() });
          }
        });

        site.recipes = extracted;
        saveSites();
        showNotification(\`Successfully indexed \${extracted.length} recipes!\`);
      } catch(e) {
        showNotification("Failed to parse feed/sitemap.");
      }
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

    function handleSearch(e) {
      e.preventDefault();
      const query = document.getElementById('search-input').value.trim().toLowerCase();
      if (!query) return;
      document.getElementById('sites-manager').classList.add('hidden');
      
      let results = [];
      savedSites.forEach(s => {
        s.recipes.forEach(r => {
          if (r.title.toLowerCase().includes(query)) {
            results.push({
              title: r.title,
              source: s.name,
              url: r.url,
              image: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80"
            });
          }
        });
      });

      renderResultsGrid(results, \`Results for "\${query}"\`);
    }

    function renderResultsGrid(results, titleStr) {
      const title = document.getElementById('view-title');
      title.innerText = titleStr; title.classList.remove('hidden');
      const grid = document.getElementById('results-grid');
      grid.innerHTML = '';
      if (results.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-slate-500 text-center py-10">No matching recipes found in indexed feeds. Try indexing more sites or pasting a direct URL.</p>';
        return;
      }
      results.forEach((res) => {
        grid.innerHTML += \`<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div class="h-44 w-full bg-slate-100 overflow-hidden"><img src="\${res.image}" class="w-full h-full object-cover"></div>
          <div class="p-4 flex-grow flex flex-col justify-between">
            <div><span class="text-[10px] font-bold text-emerald-600 uppercase">\${res.source}</span><h3 class="text-base font-bold text-slate-800 mt-1 mb-2">\${res.title}</h3></div>
            <a href="\${res.url}" target="_blank" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white text-center py-2 rounded-lg font-semibold mt-2 transition">Open Original Site</a>
          </div>
        </div>\`;
      });
    }

    renderSitesPills();
    renderModalSitesList();
  </script>
</body>
</html>
