(function () {

	var STATUS_ORDER = ['in-progress', 'featured', 'completed', 'learning'];

	var STATUS_META = {
		'in-progress': { label: 'In Progress', hex: '#2a78d6', textOn: '#ffffff', description: 'Actively being built right now.' },
		'featured':    { label: 'Featured',    hex: '#eb6834', textOn: '#ffffff', description: 'Highlighted work worth a closer look.' },
		'completed':   { label: 'Completed',   hex: '#1baf7a', textOn: '#ffffff', description: 'Finished and shipped.' },
		'learning':    { label: 'Learning',    hex: '#eda100', textOn: '#0b0b0b', description: 'Practice projects for building new skills.' }
	};

	var root = document.getElementById('projects-app');
	if (!root)
		return;

	var allProjects = [];
	var state = { status: null, tools: new Set() };
	var tooltipEl = null;

	fetch('data/projects.json')
		.then(function (res) { return res.json(); })
		.then(function (data) {
			allProjects = data.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
			render();
		})
		.catch(function (err) {
			root.innerHTML = '<p>Could not load projects.</p>';
			console.error(err);
		});

	// --- state / filtering -------------------------------------------------

	function getFiltered() {
		return allProjects.filter(function (p) {
			var statusOk = !state.status || p.status === state.status;
			var toolOk = state.tools.size === 0 || state.tools.has(p.tool);
			return statusOk && toolOk;
		});
	}

	function toggleStatus(status) {
		state.status = (state.status === status) ? null : status;
		render();
	}

	function clickTool(tool, additive) {
		if (additive) {
			if (state.tools.has(tool))
				state.tools.delete(tool);
			else
				state.tools.add(tool);
		} else if (state.tools.size === 1 && state.tools.has(tool)) {
			state.tools.clear();
		} else {
			state.tools.clear();
			state.tools.add(tool);
		}
		render();
	}

	function clearToolFilters() {
		state.tools.clear();
		render();
	}

	function clearAllFilters() {
		state.status = null;
		state.tools.clear();
		render();
	}

	function countByStatus(list) {
		var counts = {};
		STATUS_ORDER.forEach(function (s) { counts[s] = 0; });
		list.forEach(function (p) {
			if (counts.hasOwnProperty(p.status))
				counts[p.status]++;
		});
		return counts;
	}

	// --- render --------------------------------------------------------------

	function render() {
		hideTooltip();

		var filtered = getFiltered();

		var html = '' +
			renderHeader() +
			renderInProgress() +
			renderStatusOverview(filtered) +
			renderCategoryBoxes(filtered) +
			renderToolFilters() +
			renderList(filtered);

		root.innerHTML = html;
		attachHandlers();
	}

	function renderHeader() {
		var count = allProjects.length;
		var latest = allProjects.reduce(function (max, p) {
			return (!max || p.date > max) ? p.date : max;
		}, null);

		return (
			'<div class="projects-header">' +
				'<h2>My Projects</h2>' +
				'<p class="projects-meta">Last updated ' + esc(formatDateLong(latest)) + ' &middot; ' + count + ' project' + (count === 1 ? '' : 's') + '</p>' +
			'</div>'
		);
	}

	function renderInProgress() {
		var items = allProjects.filter(function (p) { return p.status === 'in-progress'; });
		if (items.length === 0)
			return '';

		var pills = items.map(function (p) {
			var href = p.link || p.videoLink;
			var tag = href ? 'a' : 'span';
			var hrefAttr = href ? ' href="' + esc(href) + '" target="_blank" rel="noopener"' : '';
			return (
				'<li>' +
					'<' + tag + ' class="in-progress-pill"' + hrefAttr + '>' +
						'<span class="status-dot" style="background:' + STATUS_META['in-progress'].hex + '"></span>' +
						esc(p.title) + ' <span class="ip-tool">' + esc(p.tool) + '</span>' +
					'</' + tag + '>' +
				'</li>'
			);
		}).join('');

		return (
			'<section class="projects-in-progress">' +
				'<h3>Currently building</h3>' +
				'<ul class="in-progress-list">' + pills + '</ul>' +
			'</section>'
		);
	}

	function renderStatusOverview(filtered) {
		var counts = countByStatus(filtered);
		var total = filtered.length;
		var present = STATUS_ORDER.filter(function (s) { return counts[s] > 0; });

		return (
			'<section class="status-overview">' +
				'<h3>Projects by status</h3>' +
				'<div class="status-chart-row">' +
					renderDonut(counts, total, present) +
					renderLegend(counts, total, present) +
				'</div>' +
				renderBar(counts, total, present) +
			'</section>'
		);
	}

	function renderDonut(counts, total, present) {
		var cx = 100, cy = 100, r = 70, sw = 26;
		var circumference = 2 * Math.PI * r;
		var gap = present.length > 1 ? 3 : 0;
		var cumulative = 0;
		var segments = '';

		present.forEach(function (status) {
			var count = counts[status];
			var fraction = count / total;
			var rawLen = fraction * circumference;
			var visibleLen = Math.max(rawLen - gap, 0);
			var pct = Math.round(fraction * 100);
			var meta = STATUS_META[status];
			var inactive = state.status && state.status !== status;

			segments +=
				'<circle class="donut-segment' + (inactive ? ' is-inactive' : '') + '" ' +
					'cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' +
					'stroke="' + meta.hex + '" ' +
					'stroke-dasharray="' + visibleLen + ' ' + (circumference - visibleLen) + '" ' +
					'stroke-dashoffset="' + (-cumulative) + '" ' +
					'data-status="' + status + '" data-count="' + count + '" data-pct="' + pct + '" ' +
					'tabindex="0" role="button" aria-pressed="' + (state.status === status) + '" ' +
					'aria-label="' + esc(meta.label) + ': ' + count + ' project' + (count === 1 ? '' : 's') + ', ' + pct + '%">' +
				'</circle>';

			cumulative += rawLen;
		});

		return (
			'<svg class="status-donut" viewBox="0 0 200 200" role="img" aria-label="Projects by status">' +
				'<circle class="donut-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-width="' + sw + '"></circle>' +
				'<g transform="rotate(-90 ' + cx + ' ' + cy + ')">' + segments + '</g>' +
				'<text class="donut-center-value" x="' + cx + '" y="' + (cy - 4) + '">' + total + '</text>' +
				'<text class="donut-center-label" x="' + cx + '" y="' + (cy + 16) + '">project' + (total === 1 ? '' : 's') + '</text>' +
			'</svg>'
		);
	}

	function renderLegend(counts, total, present) {
		if (present.length === 0)
			return '<ul class="status-legend"></ul>';

		var items = present.map(function (status) {
			var meta = STATUS_META[status];
			var count = counts[status];
			var pct = Math.round((count / total) * 100);
			return (
				'<li>' +
					'<button type="button" class="status-legend-item" data-status="' + status + '" ' +
						'aria-pressed="' + (state.status === status) + '" ' +
						'data-count="' + count + '" data-pct="' + pct + '">' +
						'<span class="status-dot" style="background:' + meta.hex + '"></span>' +
						'<span class="status-legend-label">' + esc(meta.label) + '</span>' +
						'<span class="status-legend-count">' + count + '</span>' +
					'</button>' +
				'</li>'
			);
		}).join('');

		return '<ul class="status-legend">' + items + '</ul>';
	}

	function renderBar(counts, total, present) {
		if (total === 0)
			return '<div class="status-bar"></div>';

		var segments = present.map(function (status) {
			var meta = STATUS_META[status];
			var count = counts[status];
			var pct = Math.round((count / total) * 100);
			var label = pct >= 12 ? '<span class="status-bar-inline-label" style="color:' + meta.textOn + '">' + count + '</span>' : '';

			return (
				'<div class="status-bar-segment" style="width:' + pct + '%; background:' + meta.hex + '" ' +
					'tabindex="0" role="img" data-status="' + status + '" data-count="' + count + '" data-pct="' + pct + '" ' +
					'aria-label="' + esc(meta.label) + ': ' + count + ' project' + (count === 1 ? '' : 's') + ', ' + pct + '%">' +
					label +
				'</div>'
			);
		}).join('');

		return '<div class="status-bar">' + segments + '</div>';
	}

	function renderCategoryBoxes(filtered) {
		var counts = countByStatus(filtered);
		var boxes = STATUS_ORDER.filter(function (s) { return counts[s] > 0; }).map(function (status) {
			var meta = STATUS_META[status];
			return (
				'<div class="status-box" style="--accent:' + meta.hex + '">' +
					'<h4>' + esc(meta.label) + '</h4>' +
					'<div class="status-box-count">' + counts[status] + '</div>' +
					'<p>' + esc(meta.description) + '</p>' +
				'</div>'
			);
		}).join('');

		if (!boxes)
			return '';

		return '<div class="status-boxes">' + boxes + '</div>';
	}

	function renderToolFilters() {
		var tools = [];
		allProjects.forEach(function (p) {
			if (tools.indexOf(p.tool) === -1)
				tools.push(p.tool);
		});
		tools.sort();

		var allActive = state.tools.size === 0;
		var html = '<button type="button" class="tool-pill' + (allActive ? ' is-active' : '') + '" data-tool="all">All</button>';

		tools.forEach(function (tool) {
			var active = state.tools.has(tool);
			html += '<button type="button" class="tool-pill' + (active ? ' is-active' : '') + '" data-tool="' + esc(tool) + '">' + esc(tool) + '</button>';
		});

		return '<div class="tool-filters" role="group" aria-label="Filter by technology">' + html + '</div>';
	}

	function renderList(filtered) {
		if (filtered.length === 0) {
			return (
				'<div class="project-list-empty">' +
					'No projects match the current filters.' +
					'<div><button type="button" class="clear-filters-btn">Clear filters</button></div>' +
				'</div>'
			);
		}

		var rows = filtered.map(function (p) {
			var meta = STATUS_META[p.status];
			var href = p.link || p.videoLink;
			var titleHtml = href
				? '<a class="pl-title" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a>'
				: '<span class="pl-title">' + esc(p.title) + '</span>';

			return (
				'<li class="project-list-row">' +
					'<span class="pl-date">' + esc(formatDateShort(p.date)) + '</span>' +
					'<span class="pl-tool">' + esc(p.tool) + '</span>' +
					titleHtml +
					'<span class="pl-status"><span class="status-dot" style="background:' + meta.hex + '"></span>' + esc(meta.label) + '</span>' +
					'<p class="pl-desc">' + esc(p.description) + '</p>' +
				'</li>'
			);
		}).join('');

		return '<ul class="project-list">' + rows + '</ul>';
	}

	// --- events ----------------------------------------------------------

	function attachHandlers() {
		root.querySelectorAll('.donut-segment, .status-legend-item').forEach(function (el) {
			el.addEventListener('click', function () { toggleStatus(el.getAttribute('data-status')); });
			el.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					toggleStatus(el.getAttribute('data-status'));
				}
			});
			el.addEventListener('mouseenter', onSegmentHover);
			el.addEventListener('mousemove', positionTooltip);
			el.addEventListener('mouseleave', hideTooltip);
			el.addEventListener('focus', onSegmentHover);
			el.addEventListener('blur', hideTooltip);
		});

		root.querySelectorAll('.status-bar-segment').forEach(function (el) {
			el.addEventListener('mouseenter', onSegmentHover);
			el.addEventListener('mousemove', positionTooltip);
			el.addEventListener('mouseleave', hideTooltip);
			el.addEventListener('focus', onSegmentHover);
			el.addEventListener('blur', hideTooltip);
		});

		root.querySelectorAll('.tool-pill').forEach(function (el) {
			el.addEventListener('click', function (e) {
				var tool = el.getAttribute('data-tool');
				if (tool === 'all')
					clearToolFilters();
				else
					clickTool(tool, e.shiftKey);
			});
		});

		var clearBtn = root.querySelector('.clear-filters-btn');
		if (clearBtn)
			clearBtn.addEventListener('click', clearAllFilters);
	}

	function onSegmentHover(e) {
		var el = e.currentTarget;
		var status = el.getAttribute('data-status');
		var meta = STATUS_META[status];
		var count = el.getAttribute('data-count');
		var pct = el.getAttribute('data-pct');

		var tip = ensureTooltip();
		tip.textContent = meta.label + ': ' + count + ' project' + (count === '1' ? '' : 's') + ' (' + pct + '%)';
		tip.hidden = false;

		if (e.type === 'focus') {
			var rect = el.getBoundingClientRect();
			tip.style.left = (rect.left + rect.width / 2) + 'px';
			tip.style.top = (rect.top - 10) + 'px';
		} else {
			positionTooltip(e);
		}
	}

	function positionTooltip(e) {
		if (e.type !== 'mousemove' && e.type !== 'mouseenter')
			return;
		var tip = ensureTooltip();
		tip.style.left = e.clientX + 'px';
		tip.style.top = (e.clientY - 12) + 'px';
	}

	function ensureTooltip() {
		if (!tooltipEl) {
			tooltipEl = document.createElement('div');
			tooltipEl.className = 'proj-tooltip';
			tooltipEl.setAttribute('role', 'status');
			tooltipEl.hidden = true;
			document.body.appendChild(tooltipEl);
		}
		return tooltipEl;
	}

	function hideTooltip() {
		if (tooltipEl)
			tooltipEl.hidden = true;
	}

	// --- helpers -----------------------------------------------------------

	function formatDateLong(dateStr) {
		var d = new Date(dateStr + 'T00:00:00');
		if (isNaN(d.getTime()))
			return dateStr;
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function formatDateShort(dateStr) {
		var d = new Date(dateStr + 'T00:00:00');
		if (isNaN(d.getTime()))
			return dateStr;
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
	}

	function esc(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

})();
