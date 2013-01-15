/*jslint browser:true*/
/*globals $,cubism,d3*/
/* Copyright 2013 BlueMountain Capital */
var glance = {
    handlers: [],
    version: "0.2-beta1"
};

(function () {
    "use strict";

    var context = cubism.context()
        .serverDelay(1000)
        .step(10000)
        .size(1280);

    function displayError(message) {
        // Show the alert!
        var alertList = $("#alert"),
            alert = alertList[0];
        alertList.css("display", "");
        alert.innerHTML = alert.innerHTML + message + "<br/>";
    }

    function getPath() {
        var search = window.location.search || "",
            path = search.match(new RegExp("path=(.+)")),
            fileName = '';
        if (path) {
            fileName = path[1];
        }
        return fileName;
    }
    
    function Metric(name, type) {
        this.name = name;
        this.shortName = name;
        this.type = type;
        this.matches = function (test) {
            return this.name.indexOf(test) >= 0;
        };
    }
    
    function Page() {
    }
    
    
    function GlanceMetricHandler(type) {
        this.type = type;
    }
    
    function GlanceData() {
        function getForPath(path) {
            return JSON.parse(localStorage.getItem("metrics-" + path)) || [];
        }

        function setForPath(path, array) {
            return localStorage.setItem("metrics-" + path, JSON.stringify(array));
        }

        this.getAllMetrics = function (path) {
            return getForPath(path);
        };

        this.insertMetric = function (path, metric) {
            setForPath(path, getPath(path).concat(metric));
        };

        this.resetPath = function (path) {
            setForPath(path, []);
        };
    }

    glance.page = function (path, name, icon) {
        var localPath = getPath(),
            glance = this,
            page = new Page();
        
        // We need to set up the environment
        if (localPath === path) {
            (function () {
                var localHandlers = glance.handlers;

                document.title = "glance | " + name;
                function doLoad() {
                    var handlersMetrics = {};
    
                    function push(handlersMetrics) {
                        return function (metric) {
                            handlersMetrics[metric.type] = (handlersMetrics[metric.type] || []).concat(metric);
                        };
                    }

                    new GlanceData().getAllMetrics(path).forEach(push(handlersMetrics));

                    localHandlers.forEach(function (handler) {
                        page.getMetrics(handler, function (metrics) {
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
                            handler.data(metrics);
                        });
                    });
                }
                
                function reset(e) {
                    e.preventDefault();
                    var path = getPath();
                    localHandlers.forEach(function (handler) {
                        handler.data((page.metrics || []).filter(function (metric) {
                            return metric.type === handler.type;
                        }));
                    });
                    new GlanceData().resetPath(path);
                }
    
                $(function () {
                    var title = icon
                        ? '<i class="icon-' + icon + '"></i>'
                        : name,
                        line = $('#navigation'),
                        interval = null,
                        search = $('#search'),
                        lastSearch = "";
                    $("#navigation ul").append(
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
                    $('#search').keyup(function () {
                        var text = $('#search').val();
                        d3.select('#data')
                            .selectAll('.horizon')
                            .style('display', '')
                            .filter(function (metric) {
                                return metric.matches(text);
                            })
                            .style('display', 'none');
                    });
                    $('#search').typeahead({source: function (text, process) {
                        var allMetrics = [];
                        glance.handlers.forEach(function (handler) {
                            handler.search(text, function (metrics) {
                                metrics.forEach(function (metric) { allMetrics.push(metric.shortName); });
                                process(allMetrics);
                            });
                        });
                    }});
                    
                    d3.select("#data")
                        .selectAll(".axis")
                        .data(["bottom"])
                        .enter().append("div")
                        .attr("class", function (d) { return d + " axis"; })
                        .each(function (d) { d3.select(this).call(context.axis().ticks(12).orient(d)); });
        
                    d3.select("#data")
                        .append("div")
                        .attr("class", "rule")
                        .call(context.rule());

                    d3.select("#data")
                        .selectAll(".title")
                        .attr("class", "label label-info title");

                    context.on("focus", function (i) {
                        d3.selectAll(".value").style("right", i === null ? null : context.size() - i + "px");
                        var data = $("#data")[0],
                            left = data.offsetLeft;
                        d3.selectAll(".line")
                            .style("position", "fixed")
                            .style("left", i === null ? null : left + i + "px");
                    });
                });
            }());
        } else {
            $(function () {
                var title = icon
                    ? '<i class="icon-' + icon + '"></i>'
                    : name;
                $("#navigation ul").append(
                    '<li><a href="'
                        + window.location.origin + window.location.pathname
                        + '?path=' + path + '">' + title + '</a></li>'
                );
            });
        }
        return page;
    };

    glance.defaultMetric = function (defaultMetric) {
        var data = new GlanceData(),
            handlers = this.handlers,
            path = getPath(),
            type = defaultMetric.type;

        $(function () {
            function addMetricForm(e) {
                e.preventDefault();
                data.insertMetric(path, defaultMetric);
                var matchingHandlers = handlers.filter(function (handler) {
                    return type === handler.type;
                });
                if (matchingHandlers.length > 1) {
                    displayError("Multiple matching handlers for type " + type);
                } else if (matchingHandlers.length === 0) {
                    displayError("No matching handlers for type " + type);
                } else {
                    matchingHandlers[0].data([defaultMetric]);
                }
                $("#welcome-alert").css("display", "none");
            }

            $('#add-metric').submit(addMetricForm);
        });

        return this;
    };

    glance.graphiteHandler = function (url) {
        var handler = new GlanceMetricHandler("graphite");

        handler.createMetric = function (path, isLeaf) {
            var metric = new Metric(path, handler.type);
            metric.isLeaf = isLeaf;
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

        handler.graphiteMetric = function (metric) {
            var graphite = context.graphite(url);
            if (metric.asPercentage) {
                metric.name = "asPercent(" + metric.name + "," + metric.asPercentage + ")";
            }
            if (metric.keepLastValue) {
                metric.name = "keepLastValue(" + metric.name + ")";
            }
            return graphite.metric(metric.name);
        };

        handler.data = function (allMetrics) {
            d3.select("#data")
                .selectAll(".horizon")
                .data([])
                .exit()
                .remove();
            
            var selection = d3.select("#data")
                .selectAll(".horizon")
                .data(allMetrics.map(handler.graphiteMetric));

            selection
                .enter()
                .append("div", ".bottom")
                .attr("class", "horizon")
                .call(context.horizon()
                        .height(30)
                        .colors(["#006d2c", "#31a354", "#74c476", "#bae4b3", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"])
                        .format(d3.format(",.2f")));
                    
            selection
                .selectAll(".title")
                .attr("class", "label label-info title");

            selection
                .selectAll(".value")
                .attr("class", "label label-info value");
            
            selection.exit()
                .remove();
        };
        
        handler.alias = function (namealiaser) {
            var cMetric = handler.createMetric,
                gMetric = handler.graphiteMetric;
            handler.createMetric = function () {
                var m = cMetric.apply(handler, arguments);
                m.alias = namealiaser(m.name);
                m.matches = function (test) {
                    return this.alias.indexOf(test) >= 0 || this.name.indexOf(test) >= 0;
                };
                return m;
            };
            handler.graphiteMetric = function (metric) {
                var m = gMetric(metric);
                m = m.alias(metric.alias);
                return m;
            };
            return handler;
        };
        
        handler.startSearches = function (prefix) {
            var previousSearch = handler.search;
            handler.search = function (search, callback) {
                previousSearch(prefix + search, function (metrics) {
                    metrics.forEach(function (metric) {
                        metric.shortName = metric.name.substr(prefix.length);
                    });
                    callback(metrics);
                });
            };
            return this;
        };

        this.handlers.push(handler);
        return handler;
    };

    function MetricHolder() {
        this.metrics = [];
    }

    MetricHolder.prototype.push = function (metric) {
        this.metrics.push(metric);
    };

    Page.prototype.getMetrics = function (handler, callback) {
        this.retrieveMetrics(handler, callback, new MetricHolder());
    };

    Page.prototype.retrieveMetrics = function (handler, callback) {
        callback([]);
    };

    Page.prototype.metrics = function (cb) {
        var prevGetMetrics = this.retrieveMetrics;
        this.retrieveMetrics = function (handler, callback, allMetrics) {
            cb(handler, function (metrics) {
                metrics.forEach(function (metric) { if (metric.isLeaf) { allMetrics.push(metric); } });
                callback(allMetrics.metrics);
            });
            prevGetMetrics(handler, callback, allMetrics);
        };
        return this;
    };

    Page.prototype.search = function (string) {
        this.metrics(function (handler, callback) {
            handler.search(string, callback);
        });
        return this;
    };

    Page.prototype.call = function (cb) {
        var prevGetMetrics = this.retrieveMetrics;
        this.retrieveMetrics = function (handler, callback, allMetrics) {
            prevGetMetrics(handler, function (metrics) {
                metrics.forEach(cb);
                callback(metrics);
            }, allMetrics);
        };
        return this;
    };

    Page.prototype.sort = function (comparer) {
        var prevGetMetrics = this.retrieveMetrics;
        this.retrieveMetrics = function (handler, callback, allMetrics) {
            prevGetMetrics(handler, function (metrics) {
                metrics.sort(comparer || handler.comparer);
                callback(metrics);
            }, allMetrics);
        };
        return this;
    };
    
    Page.prototype.asPercent = function (percentage) {
        this.call(function (metric) {
            metric.asPercentage = percentage;
        });
        return this;
    };
    
    Page.prototype.keepLast = function () {
        this.call(function (metric) {
            metric.keepLastValue = true;
        });
        return this;
    };
}());
