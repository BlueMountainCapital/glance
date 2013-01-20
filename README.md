# Glance: Web Metrics dashboard
===


Glance is a web metrics dashboard which runs entirely in the browser.

[API Reference](API.md)

## Pages

Easily define new pages:
```javascript
glance.page("cpu", "CPU")
      .search("*.cpu")
```

Ordering is easy as well:
```javascript
page.sort(sortFunc)
```

## Handlers

Handlers allow for easy definition of new metrics.