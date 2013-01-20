# Glance API

## glance singleton

### version

Version of glance in use

### Tab page(path, name, icon)

Adds a page defined by the path. The name is used in navigation (unless icon is defined), and in the page title. If icon is defined, then it is used in the navigation bar.

### defaultMetric(metric)

Defines the default metric to use when showing the message that no metrics were defined for the page.

### Handler graphite(host)

Defines a metric handler using graphite.

## handler

### handler alias(function (metric))

Defines a function to alias an incoming metric.

### handler startSearches(string)

Starts all searches with this string; it allows for easier searching if all of the metrics start with the same clause.

## metric

*Available through glance.metric.*

### new(name, type)

Type is the metric type (i.e. `"graphite"`)

### name

This is the name of the metric.

## Tab

### search(searchstring)

Add metrics that match the search string.

### sort(sortFunction(metric, metric))

Sorts the metrics on the page by the sort function.

### call(function)

Calls the function on each metric that will be displayed for the tab.

### keepLast()

Keeps the last value in graphite.