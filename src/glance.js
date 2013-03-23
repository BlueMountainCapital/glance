
// src/glance/glance-core.js
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
// src/glance/glance-data.js
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
// src/glance/glance-graphite.js
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
// src/glance/glance-graphs.js
/*jslint browser:true*/
/*globals d3,$,glance*/
(function () {
    "use strict";
    function Graphs() {
    }
    
    var graphs_prototype = Graphs.prototype;
    
    graphs_prototype.horizon = function (handler) {
        return function (selection) {
            var horizon = selection.enter()
                .append("div", ".bottom")
                .attr("class", "horizon " + handler.type)
                .style("height", "20px")
                .style("width", "1280px"),
                chart = d3.horizon()
                .width(1280)
                .height(20)
                .bands(5)
                .mode("offset");
            horizon.append("div")
                .attr("class", "label label-info title");
            horizon.append("div")
                .attr("class", "label label-info value");
            horizon.append("svg")
                .attr('class', 'svg-data')
                .attr("width", "1280px")
                .attr("height", "20px");
            horizon.each(function (metric) {
                if (metric.remove) {
                    horizon.append("div")
                        .attr("class", "label label-important remove")
                        .style("right", "0px")
                        .style("display", "none")
                        .append("a")
                        .append("i")
                        .attr("class", "icon-trash")
                        .on('click', function () {
                            metric.remove();
                            horizon.remove();
                        });
                }
            });
            
            selection.each(function (metric) {
                var s = d3.select(this),
                    step = 1e4,
                    now = Date.now() - step,
                    start = new Date(now - (1280 * step)),
                    end = new Date(now),
                    format = d3.format(metric.format()),
                    cancellation = null,
                    calculate = function () {
                        metric.calculate(start, end, step, function (error, values) {
                            if (error) {
                                glance.displayError(error);
                            } else {
                                metric.values = values;
                                var lastValue = values[values.length - 1];
                                s.select('.value')
                                    .text(format(lastValue[1]));
                                s.select('.svg-data')
                                    .data([values])
                                    .call(chart);
                            }
                        });
                    },
                    interval = setInterval(function () {
                        now = Date.now() - step;
                        start = new Date(now - (1280 * step));
                        end = new Date(now);
                        calculate();
                    }, step);
                s.select('.title').text(metric.alias || metric.name);
                s.on('mousemove', function (d, i) {
                    var box = s[0][0],
                        e = d3.mouse(box),
                        loc = (box.clientWidth - e[0]);
                    d3.select('#data')
                        .selectAll('.horizon')
                        .selectAll('.value')
                        .style('right', (loc + "px"))
                        .text(function (metric) {
                            if (metric.values) {
                                return format(metric.values[metric.values.length - loc][1]);
                            }
                        });
                }).on('mouseout', function (d, i) {
                    d3.select('#data')
                        .selectAll('.horizon')
                        .selectAll('.value')
                        .style('right', null);
                    s.select('.remove')
                        .style('display', 'none');
                }).on('mouseover', function (d, i) {
                    s.select('.remove')
                        .style('display', '');
                });
                
                if (cancellation) {
                    cancellation();
                }
                
                if (metric.calculate) {
                    cancellation = function () {
                        clearInterval(interval);
                        metric.cancel();
                    };
                    calculate();
                }
            });
            
            selection.exit()
                .each(function (metric) {
                    metric.cancel();
                })
                .remove();
        };
    };
    
    graphs_prototype.axis = function () {
        
    };
    
    glance.graphs = new Graphs();
}());
// src/glance/glance-metric.js
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
// src/glance/glance-persistent.js
/*globals glance,$*/
(function () {
    "use strict";
    
    glance.persistence = function (url) {
        $("#share").css("display", "");
        $("#share").click(function (e) {
            e.preventDefault();
        });
    };
}());
// src/glance/glance-tab.js
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
