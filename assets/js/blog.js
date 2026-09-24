(function () {

	// This site has no build step. Posts are discovered at runtime by asking
	// GitHub's own API to list the files in content/writing/ on this repo —
	// so dropping a new .md file in that folder and pushing it is enough for
	// it to appear here, with no other file needing to change. See README
	// notes in the PR description for the tradeoffs of that approach.
	var OWNER = 'RichardNOR';
	var REPO = 'richardnor.github.io';
	var REF = 'main';
	var CONTENT_PATH = 'content/writing';

	var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	var postsPromise = null;

	function loadPosts() {
		if (postsPromise)
			return postsPromise;

		var apiUrl = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + CONTENT_PATH + '?ref=' + REF;

		postsPromise = fetch(apiUrl)
			.then(function (res) {
				if (!res.ok)
					throw new Error('Could not list posts (HTTP ' + res.status + ')');
				return res.json();
			})
			.then(function (entries) {
				var mdFiles = entries.filter(function (e) { return e.type === 'file' && /\.md$/i.test(e.name); });
				return Promise.all(mdFiles.map(function (e) {
					return fetch(e.download_url)
						.then(function (r) { return r.text(); })
						.then(function (raw) { return parsePost(raw); });
				}));
			})
			.then(function (posts) {
				posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
				return posts;
			});

		return postsPromise;
	}

	// --- content parsing -----------------------------------------------

	function parseFrontmatter(raw) {
		var match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
		if (!match)
			return { data: {}, content: raw };

		var data = {};
		match[1].split('\n').forEach(function (line) {
			var idx = line.indexOf(':');
			if (idx === -1)
				return;
			var key = line.slice(0, idx).trim();
			var value = line.slice(idx + 1).trim();
			if (key)
				data[key] = value;
		});

		return { data: data, content: match[2] };
	}

	function parsePost(raw) {
		var parsed = parseFrontmatter(raw);
		var data = parsed.data;
		return {
			date: data.date || '',
			title: data.title || 'Untitled',
			slug: data.slug || '',
			description: data.description || '',
			tags: data.tags ? data.tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [],
			thumbnail: data.thumbnail || '',
			contentMarkdown: parsed.content
		};
	}

	// --- helpers ---------------------------------------------------------

	function formatMonthYear(dateStr) {
		var d = new Date(dateStr + 'T00:00:00');
		if (isNaN(d.getTime()))
			return dateStr;
		return MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
	}

	function formatDateShort(dateStr) {
		var d = new Date(dateStr + 'T00:00:00');
		if (isNaN(d.getTime()))
			return dateStr;
		return MONTH_NAMES[d.getMonth()].slice(0, 3) + ' ' + d.getDate() + ', ' + d.getFullYear();
	}

	function esc(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	// --- index page --------------------------------------------------------

	function renderIndex() {
		var root = document.getElementById('blog-index');
		if (!root)
			return;

		loadPosts().then(function (posts) {
			if (posts.length === 0) {
				root.innerHTML = '<p class="blog-empty">No posts yet.</p>';
				return;
			}

			var html = '';
			var currentGroup = null;

			posts.forEach(function (p) {
				var group = formatMonthYear(p.date);
				if (group !== currentGroup) {
					if (currentGroup !== null)
						html += '</ul>';
					html += '<h2 class="blog-group-heading">' + esc(group) + '</h2><ul class="blog-list">';
					currentGroup = group;
				}
				html += renderRow(p);
			});

			html += '</ul>';
			root.innerHTML = html;
		}).catch(function (err) {
			root.innerHTML = '<p class="blog-empty">Could not load posts right now.</p>';
			console.error(err);
		});
	}

	function renderRow(p) {
		var thumb = p.thumbnail
			? '<img class="blog-thumb" src="' + esc(p.thumbnail) + '" alt="" loading="lazy">'
			: '<span class="blog-thumb blog-thumb-empty" aria-hidden="true"></span>';

		return (
			'<li class="blog-row">' +
				'<a class="blog-row-link" href="post.html?slug=' + encodeURIComponent(p.slug) + '">' +
					thumb +
					'<span class="blog-row-date">' + esc(formatDateShort(p.date)) + '</span>' +
					'<span class="blog-row-title">' + esc(p.title) + '</span>' +
				'</a>' +
			'</li>'
		);
	}

	// --- post page -----------------------------------------------------

	function renderPost() {
		var root = document.getElementById('blog-post');
		if (!root)
			return;

		var slug = new URLSearchParams(location.search).get('slug');
		if (!slug) {
			root.innerHTML = '<p class="blog-empty">No post specified.</p>';
			return;
		}

		loadPosts().then(function (posts) {
			var post = null;
			for (var i = 0; i < posts.length; i++) {
				if (posts[i].slug === slug) {
					post = posts[i];
					break;
				}
			}

			if (!post) {
				root.innerHTML = '<p class="blog-empty">Post not found.</p>';
				return;
			}

			document.title = post.title + ' — Richard Noruwa';

			if (post.description) {
				var metaDesc = document.querySelector('meta[name="description"]');
				if (!metaDesc) {
					metaDesc = document.createElement('meta');
					metaDesc.setAttribute('name', 'description');
					document.head.appendChild(metaDesc);
				}
				metaDesc.setAttribute('content', post.description);
			}

			var tagsHtml = post.tags.map(function (t) {
				return '<span class="blog-tag">' + esc(t) + '</span>';
			}).join('');

			var bodyHtml = window.marked
				? window.marked.parse(post.contentMarkdown)
				: '<p>' + esc(post.contentMarkdown) + '</p>';

			root.innerHTML =
				'<h1 class="blog-post-title">' + esc(post.title) + '</h1>' +
				'<p class="blog-post-meta">' + esc(formatDateShort(post.date)) + '</p>' +
				(tagsHtml ? '<div class="blog-tags">' + tagsHtml + '</div>' : '') +
				'<div class="blog-content">' + bodyHtml + '</div>';
		}).catch(function (err) {
			root.innerHTML = '<p class="blog-empty">Could not load this post right now.</p>';
			console.error(err);
		});
	}

	renderIndex();
	renderPost();

})();
