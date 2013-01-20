/*globals glance*/
(function () {
    "use strict";
    function Metric(name, type) {
        this.name = name;
        this.type = type;
    }
    
    var metric_prototype = Metric.prototype;
    metric_prototype.matches = function (test) {
        return this.name.indexOf(test) >= 0;
    };
    metric_prototype.isLeaf = false;
    metric_prototype.identifier = function (identifier) {
        if (typeof identifier === "string") {
            // we are tring to parse an identifier
            var split = identifier.split(';'),
                type = split[0],
                name = split[1];
            return glance.handlers[type].createMetric(name);
        } else {
            return this.type + ";" + this.name;
        }
    };
    metric_prototype.format = function () {
        return ",.2f";
    };
    
    glance.metric = Metric;
}());