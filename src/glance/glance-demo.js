/*globals d3,glance*/
(function () {
    "use strict";
    
    glance.demo = function (metrics) {
        var handler = glance.handler("demo");

        handler.createMetric = function (path, isLeaf, limits) {
            var metric = new glance.metric(path, handler.type);
            metric.path = path;
            metric.isLeaf = isLeaf;
            metric.getPath = function () {
                return path;
            };
            // Because this is a demo, and there is no request that should be cancelled, the cancel function is a no-op.
            metric.cancel = function () {
            };
            
            metric.calculate = function (start, stop, step, callback) {
                var limiter = (limits || [0.0, 1.0]).sort(),
                    current = start.valueOf(),
                    range = limiter[1] - limiter[0],
                    lastValue = Math.random() * range + limiter[0],
                    upDownRange = range / 10,
                    values = [[current, lastValue]];
                while (current < stop.valueOf()) {
                    current = current + step;
                    lastValue = Math.min(Math.max(lastValue + (Math.random() * upDownRange * (Math.random() > 0.5 ? 1 : -1)), limiter[0]), limiter[1]);
                    values.push([current, lastValue]);
                }
                
                callback(null, values);
            };
            return metric;
        };

        handler.search = function (prefix, result) {
            result(metrics.filter(function (m) {
                return m.matches(prefix);
            }).map(function (m) {
                var metric = handler.createMetric(m.path, true, m.limits);
                metric.name = m.alias || m.name || m.path;
                return metric;
            }));
        };

        glance.handlers.add(handler);
        return handler;
    };
}());