(function () {

	var grid = document.getElementById('projects-grid');
	var filters = document.getElementById('projects-filters');

	if (!grid || !filters)
		return;

	fetch('data/projects.json')
		.then(function (res) { return res.json(); })
		.then(function (projects) {
			projects.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
			renderFilters(projects);
			renderGrid(projects);
		})
		.catch(function (err) {
			grid.innerHTML = '<p>Could not load projects.</p>';
			console.error(err);
		});

	function renderFilters(projects) {
		var tools = [];
		projects.forEach(function (p) {
			if (tools.indexOf(p.tool) === -1)
				tools.push(p.tool);
		});

		var html = '<button type="button" class="project-filter active" data-tool="all">All</button>';
		tools.forEach(function (tool) {
			html += '<button type="button" class="project-filter" data-tool="' + escapeHtml(tool) + '">' + escapeHtml(tool) + '</button>';
		});
		filters.innerHTML = html;

		filters.addEventListener('click', function (e) {
			var btn = e.target.closest('.project-filter');
			if (!btn)
				return;

			filters.querySelectorAll('.project-filter').forEach(function (b) { b.classList.remove('active'); });
			btn.classList.add('active');

			var tool = btn.getAttribute('data-tool');
			var cards = grid.querySelectorAll('.project-card');
			cards.forEach(function (card) {
				var show = tool === 'all' || card.getAttribute('data-tool') === tool;
				card.style.display = show ? '' : 'none';
			});
		});
	}

	function renderGrid(projects) {
		grid.innerHTML = projects.map(renderCard).join('');
	}

	function renderCard(project) {
		var dateLabel = formatDate(project.date);
		var links = '';

		if (project.link) {
			links += '<a href="' + escapeHtml(project.link) + '" target="_blank" rel="noopener" class="button small project-card-link">View</a>';
		}
		if (project.videoLink) {
			links += '<a href="' + escapeHtml(project.videoLink) + '" target="_blank" rel="noopener" class="button small project-card-link">Video</a>';
		}

		var tags = (project.tags || []).map(function (t) {
			return '<span class="project-tag">' + escapeHtml(t) + '</span>';
		}).join('');

		return (
			'<div class="project-card" data-tool="' + escapeHtml(project.tool) + '">' +
				'<div class="project-card-header">' +
					'<span class="project-status project-status-' + escapeHtml(project.status) + '">' + escapeHtml(project.status) + '</span>' +
					'<span class="project-date">' + dateLabel + '</span>' +
				'</div>' +
				'<h3>' + escapeHtml(project.title) + '</h3>' +
				'<p class="project-tool">' + escapeHtml(project.tool) + '</p>' +
				'<p class="project-description">' + escapeHtml(project.description) + '</p>' +
				'<div class="project-tags">' + tags + '</div>' +
				'<div class="project-links">' + links + '</div>' +
			'</div>'
		);
	}

	function formatDate(dateStr) {
		var d = new Date(dateStr + 'T00:00:00');
		if (isNaN(d.getTime()))
			return dateStr;
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
	}

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

})();
