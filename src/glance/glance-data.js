/*globals glance,localStorage*/
(function () {
    "use strict";
    function getForPath(path) {
        return JSON.parse(localStorage.getItem("metrics-" + path)) || [];
    }

    function setForPath(path, array) {
        return localStorage.setItem("metrics-" + path, JSON.stringify(array));
    }

    glance.data = {
        getAllMetrics: function (path) {
            var metrics = getForPath(path)
                .map(glance.metric.prototype.identifier);
            metrics.forEach(function (metric) {
                metric.remove = function () {
                    glance.data.removeMetric(path, metric);
                };
            });
            return metrics;
        },
        insertMetric: function (path, metric) {
            setForPath(path, getForPath(path).concat(metric.identifier()));
        },
        resetPath: function (path) {
            setForPath(path, []);
        },
        removeMetric: function (path, metric) {
            var identifier = metric.identifier();
            setForPath(path, getForPath(path).filter(function (id) {
                return id !== identifier;
            }));
        }
    };
}());