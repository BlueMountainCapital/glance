/*globals d3,glance*/
(function () {
    "use strict";
    
    glance.graphite = function (url) {
        var handler = glance.handler("graphite");

        handler.createMetric = function (path, isLeaf) {
            var metric = new glance.metric(path, handler.type);
            metric.path = path;
            metric.isLeaf = isLeaf;
            metric.getPath = function () {
                var p = path;
                if (this.asPercentage) {
                    p = "asPercent(" + p + "," + this.asPercentage + ")";
                }
                if (this.keepLastValue) {
                    p = "keepLastValue(" + p + ")";
                }
                return p;
            };
            metric.calculate = function (start, stop, step, callback) {
                var format = function (time) {
                        return Math.floor(time / 1000);
                    },
                    jsonUrl = url + "/render?format=json"
                        + "&target=" + encodeURIComponent(this.getPath(step))
                        + "&from=" + format(start)
                        + "&until=" + format(stop),
                    cancellation = d3.json(jsonUrl, function (data) {
                        metric.cancel = null;
                        if (!data) {
                            return callback(new Error("unable to load data"));
                        }
                        callback(null, data[0].datapoints.map(function (d) { return [d[1], d[0]]; }));
                    });
                metric.cancel = function () {
                    cancellation.abort();
                };
            };
            return metric;
        };

        handler.search = function (prefix, result) {
            var jsonUrl = url + "/metrics/find?format=completer&query=" + prefix;
            d3.json(jsonUrl, function (metrics) {
                var allMetrics = [];
                metrics.metrics.forEach(function (e) {
                    allMetrics.push(handler.createMetric(e.path, e.is_leaf === "1"));
                });
                result(allMetrics);
            });
        };
        
        handler.alias = function (namealiaser) {
            var cMetric = handler.createMetric;
            
            handler.createMetric = function () {
                var m = cMetric.apply(handler, arguments);
                m.alias = namealiaser(m.name);
                m.matches = function (test) {
                    return this.alias.indexOf(test) >= 0 || this.name.indexOf(test) >= 0;
                };
                return m;
            };
            return handler;
        };
        
        handler.startSearches = function (prefix) {
            var previousSearch = handler.search,
                previousCreateMetric = handler.createMetric;
            handler.search = function (search, callback) {
                previousSearch(prefix + search, function (metrics) {
                    metrics.forEach(function (metric) {
                        metric.name = metric.path.substr(prefix.length);
                    });
                    callback(metrics);
                });
            };
            handler.createMetric = function (path, isLeaf) {
                if (path.indexOf(prefix) !== 0) {
                    path = prefix + path;
                }
                return previousCreateMetric(path, isLeaf);
            };
            return this;
        };
        
        handler.baseStep = function (baseStep) {
            var previousCreateMetric = handler.createMetric;
            handler.createMetric = function () {
                var metric = previousCreateMetric.apply(handler, arguments),
                    previousGetPath = metric.getPath;
                metric.getPath = function (step) {
                    var prev = previousGetPath.call(metric, step);
                    if (baseStep === step) {
                        return prev;
                    } else {
                        return "summarize(" + prev + ",'" + (!(step % 36e5) ? step / 36e5 + "hour" : !(step % 6e4) ? step / 6e4 + "min" : step / 1e3 + "sec") + "')";
                    }
                };
                return metric;
            };
            return handler;
        };

        glance.handlers.add(handler);
        return handler;
    };
}());