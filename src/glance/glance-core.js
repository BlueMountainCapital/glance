/*jslint browser:true*/
/*globals $,d3*/

var glance = {
    version: "0.2-beta3",
    branch: "graphs"
};

(function () {
    "use strict";

    glance.displayError = function (message) {
        // Show the alert!
        var alertList = $("#alert"),
            alert = alertList[0];
        alertList.css("display", "");
        alert.innerHTML = alert.innerHTML + message + "<br/>";
    };

    function getPath() {
        var search = window.location.search || "",
            path = search.match(new RegExp("path=(.+)")),
            fileName = '';
        if (path) {
            fileName = path[1];
        }
        return fileName;
    }
    
    glance.handler = function (type) {
        return {
            type: type
        };
    };
    
    glance.handlers = {
        all: [],
        add: function (handler) {
            if (handler.type === "all" || handler.type === "add") {
                throw "Cannot add a handler whose type is all or add";
            }
            this.all.push(handler);
            this[handler.type] = handler;
        }
    };

    glance.page = function (path, name, icon) {
        var localPath = getPath(),
            tab = new glance.tab();
        
        // We need to set up the environment
        if (localPath === path) {
            (function () {
                document.title = "glance | " + name;
                function doLoad() {
                    var handlersMetrics = {};
    
                    function push(handlersMetrics) {
                        return function (metric) {
                            handlersMetrics[metric.type] = (handlersMetrics[metric.type] || []).concat(metric);
                        };
                    }

                    glance.data.getAllMetrics(path).forEach(push(handlersMetrics));

                    glance.handlers.all.forEach(function (handler) {
                        tab.getMetrics(handler, function (metrics) {
                            if (handlersMetrics[handler.type] !== undefined) {
                                handlersMetrics[handler.type].forEach(
                                    function (metric) {
                                        metrics.push(metric);
                                    }
                                );
                            }
                            if (metrics.length > 0) {
                                $("#welcome-alert").css("display", "none");
                            }
                            
                            d3.select("#data")
                                .selectAll(".horizon." + handler.type)
                                .data(metrics)
                                .call(glance.graphs.horizon(handler));
                        });
                    });
                }
                
                function reset(e) {
                    e.preventDefault();
                    var path = getPath();
                    glance.handlers.all.forEach(function (handler) {
                        handler.data((tab.metrics || []).filter(function (metric) {
                            return metric.type === handler.type;
                        }));
                    });
                    glance.data.resetPath(path);
                }
    
                $(function () {
                    var title = icon
                        ? '<i class="icon-' + icon + '"></i>'
                        : name,
                        line = $('#navigation'),
                        interval = null,
                        search = $('#search'),
                        searchForm = $('#search-form'),
                        lastSearch = "";
                    
                    $("#navigation-pills").append(
                        '<li class="active"><a href="'
                            + window.location.origin + window.location.pathname
                            + '?path=' + path + '">' + title + '</a></li>'
                    );

                    doLoad();
                    
                    interval = setInterval(function () {
                        clearInterval(interval);
                        line.mouseout();
                    }, 1500);
                    
                    line.mouseover(function () {
                        clearInterval(interval);
                        d3.select('#navigation').transition().style('height', '30px');
                        d3.select('#navigation-buttons').transition().style('top', '20px');
                        d3.select('#navigation-line').transition().style('color', '#ffffff');
                    });
                    line.mouseout(function () {
                        d3.select('#navigation').transition().style('height', '5px');
                        d3.select('#navigation-buttons').transition().style('top', '-35px');
                        d3.select('#navigation-line').transition().style('color', '#000');
                    });
                    search.keyup(function () {
                        var text = search.val();
                        d3.select('#data')
                            .selectAll('.horizon')
                            .style('display', '')
                            .filter(function (metric) {
                                return !metric.matches(text);
                            })
                            .style('display', 'none');
                    });
                    search.typeahead({source: function (text, process) {
                        var allMetrics = [];
                        glance.handlers.all.forEach(function (handler) {
                            handler.search(text, function (metrics) {
                                metrics.forEach(function (metric) { allMetrics.push(metric.name); });
                                process(allMetrics);
                            });
                        });
                    }});
                    searchForm.submit(function (e) {
                        e.preventDefault();
                        var allMetrics = [],
                            text = search.val(),
                            path = getPath();
                        glance.handlers.all.forEach(function (handler) {
                            handler.search(text, function (metrics) {
                                metrics.forEach(function (metric) {
                                    if (metric.isLeaf) {
                                        glance.data.insertMetric(path, metric);
                                    }
                                });
                                doLoad();
                            });
                        });
                    });
                    glance.graphs.axis();
                });
            }());
        } else {
            $(function () {
                var title = icon
                    ? '<i class="icon-' + icon + '"></i>'
                    : name;
                $("#navigation-pills").append(
                    '<li><a href="'
                        + window.location.origin + window.location.pathname
                        + '?path=' + path + '">' + title + '</a></li>'
                );
            });
        }
        return tab;
    };

    glance.defaultMetric = function (defaultMetric) {
        var path = getPath(),
            type = defaultMetric.type;

        $(function () {
            function addMetricForm(e) {
                e.preventDefault();
                var handler = glance.handlers[defaultMetric.type],
                    metric = glance.metric.prototype.identifier(defaultMetric.identifier());
                glance.data.insertMetric(path, metric);
                d3.select("#data")
                    .selectAll(".horizon")
                    .data([metric])
                    .call(glance.graphs.horizon(handler));
                $("#welcome-alert").css("display", "none");
            }

            $('#add-metric').submit(addMetricForm);
            $('#add-metric').css('display', '');
        });

        return this;
    };
}());