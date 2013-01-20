/*globals glance*/
(function () {
    "use strict";
    
    function Tab() {
    }
    
    var tab_prototype = Tab.prototype;

    tab_prototype.getMetrics = function (handler, callback) {
        this.retrieveMetrics(handler, callback, []);
    };

    tab_prototype.retrieveMetrics = function (handler, callback) {
        callback([]);
    };

    tab_prototype.metrics = function (cb) {
        var prevGetMetrics = this.retrieveMetrics;
        this.retrieveMetrics = function (handler, callback, allMetrics) {
            cb(handler, function (metrics) {
                metrics.forEach(function (metric) { if (metric.isLeaf) { allMetrics.push(metric); } });
                callback(allMetrics);
            });
            prevGetMetrics(handler, callback, allMetrics);
        };
        return this;
    };

    tab_prototype.search = function (string) {
        this.metrics(function (handler, callback) {
            handler.search(string, callback);
        });
        return this;
    };

    tab_prototype.call = function (cb) {
        var prevGetMetrics = this.retrieveMetrics;
        this.retrieveMetrics = function (handler, callback, allMetrics) {
            prevGetMetrics(handler, function (metrics) {
                metrics.forEach(cb);
                callback(metrics);
            }, allMetrics);
        };
        return this;
    };

    tab_prototype.sort = function (comparer) {
        var prevGetMetrics = this.retrieveMetrics;
        this.retrieveMetrics = function (handler, callback, allMetrics) {
            prevGetMetrics(handler, function (metrics) {
                metrics.sort(comparer || handler.comparer);
                callback(metrics);
            }, allMetrics);
        };
        return this;
    };
    
    tab_prototype.asPercent = function (percentage) {
        this.call(function (metric) {
            metric.asPercentage = percentage;
        });
        return this;
    };
    
    tab_prototype.keepLast = function () {
        this.call(function (metric) {
            metric.keepLastValue = true;
        });
        return this;
    };
    
    glance.tab = Tab;
}());