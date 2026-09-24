---
date: 2026-09-22
title: Why I Turned the Projects Page Into a Filterable Dashboard
slug: filterable-projects-dashboard
description: A short walkthrough of why the projects archive on this site uses a status donut chart and combinable filters instead of a plain grid of cards.
tags: Process, Data Viz, Web Dev
thumbnail:
---

Most portfolio sites list projects as a static grid: a card per project, maybe a tag underneath. That works fine at five projects. It stops working once you have five *kinds* of projects — some finished, some in progress, spanning half a dozen tools — and a visitor just wants to answer one question fast: *what has this person actually shipped in Python?*

So the [projects page](../index.html#one) on this site is built differently.

## The data model

Every project lives in one JSON file, one object per project:

```json
{
  "date": "2026-02-21",
  "tool": "Python",
  "title": "Yelp Review Bias Detection",
  "status": "featured",
  "tags": ["Python", "NLP"],
  "link": "https://..."
}
```

Nothing on the page is hand-written HTML. The status donut, the proportional bar underneath it, the four summary boxes, and the full project list all read from that same filtered array — so they can never drift out of sync with each other.

## Two filters, combined with AND

- Click a **status** on the donut or legend (Featured, Completed, In Progress, Learning) to narrow the list to that status. Click it again to clear it.
- Click a **technology** pill to filter by tool. Shift-click adds another tool with OR logic, so "Python OR SQL" is one click away.

The two combine with AND — "Featured AND (Python OR SQL)" — which is the actual question most visitors have, phrased as two clicks instead of a sentence.

## Why this is worth writing up

None of this needed a framework. It's ~400 lines of vanilla JavaScript rendering into a couple of `<div>`s, with the data-viz decisions (donut segment gaps, color assignment, tooltip behavior) worked out deliberately rather than defaulted to. That's the part I think is worth a post: the filtering *pattern* is more useful to remember than the specific chart library, because it applies to this blog's own archive too, once there are enough posts to make browsing by tag worthwhile.
