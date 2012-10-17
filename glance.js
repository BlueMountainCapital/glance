/*jslint browser: true*/
/*global $, openDatabase, cubism, d3*/
(function () {
    "use strict";
        
    var createPageStatement = "CREATE TABLE IF NOT EXISTS Pages (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT)",
        createMetricStatement = "CREATE TABLE IF NOT EXISTS Metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, page INTEGER, metric TEXT)",
        selectPageStatement = "SELECT * FROM Pages WHERE Pages.path = ?",
        selectMetricStatement = "SELECT Metrics.metric FROM Pages INNER JOIN Metrics ON Pages.id = Metrics.page WHERE Pages.path = ?",
        insertPageStatement = "INSERT INTO Pages (path) VALUES (?)",
        insertMetricStatement = "INSERT INTO Metrics (page, metric) VALUES (?, ?)",
        deleteAllStatement = "DELETE FROM Metrics",
        db = openDatabase("Metrics-0.0.1", "1.0", "Metric names", 200000),
        context = cubism.context()
            .serverDelay(1000)
            .step(10000)
            .size(1280);
    
    function getPath() {
        var search = window.location.search || "",
            path = search.match("path=(.+)"),
            fileName = '';
        if (path) {
            fileName = path[1];
        }
        return fileName;
    }
    
    function createTable() {
        db.transaction(function (transaction) {
            transaction.executeSql(createPageStatement);
            transaction.executeSql(createMetricStatement);
            transaction.executeSql(selectPageStatement, [getPath()], function (t, d) {
                if (d.rows.length === 0) {
                    transaction.executeSql(insertPageStatement, [getPath()]);
                }
            }, function () {
                transaction.executeSql(insertPageStatement, [getPath()]);
            });
        });
    }
    
    $(createTable);
    
    function getConfig(callback) {
        d3.json("configuration.json", callback);
    }
    
    function stock(config, name, callback) {
        var graphite = context.graphite(config.GraphitePath);
        return graphite.metric(name);
    }
    
    function setUpD3(allMetrics) {
        var selection = d3.select("#data")
            .selectAll(".horizon")
            .data(allMetrics);

        selection.enter()
            .append("div", ".bottom")
            .attr("class", "horizon")
            .call(context.horizon()
                  .height(30)
                  .colors(["#006d2c", "#31a354", "#74c476", "#bae4b3", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"])
                  .format(d3.format(",.2f")));
        
        selection
            .exit()
            .remove();
    }
    
    function selectDataHandler(transaction, results) {
        getConfig(function (config) {
            var path = getPath(),
                i = 0,
                metrics = [],
                found = null,
                selection = null,
                allMetrics = null;
        
            config.Pages.forEach(function (p) {
                if (p.Path === path) {
                    found = p;
                }
            });
            
            if (results.rows.length === 0 && !found.BaseValues) {
                $("#metric").css("display", "");
            } else {
                // if this is the first time that we are running and we just added a new metric, then we need to hide it again
                $("#metric").css("display", "none");
            }
            
            for (i = 0; i < results.rows.length; i = i + 1) {
                metrics.push(results.rows.item(i).metric);
            }
            
            allMetrics = metrics.map(function (row) { return stock(config, row); });
                
            if (found.BaseValues) {
                found.BaseValues.forEach(function (value) {
                    if (value.Query) {
                        var metric = stock(config, value.Query);
                        if (value.Name) {
                            metric = metric.alias(value.Name);
                        }
                        if (value.Extent) {
                            metric.extent = function () { return value.Extent; };
                        }
                        allMetrics = allMetrics.concat(metric);
                        setUpD3(allMetrics);
                    } else if (value.ExpansionQuery) {
                        context.graphite(config.GraphitePath)
                            .find(value.ExpansionQuery, function (error, results) {
                                var expansionMetrics = results.map(function (result) {
                                    var metric = stock(config, result);
                                    if (value.Extent) {
                                        metric.extent = function () { return value.Extent; };
                                    }
                                    return metric;
                                });
                                allMetrics = allMetrics.concat(expansionMetrics);
                                setUpD3(allMetrics);
                            });
                    }
                });
            }
            setUpD3(allMetrics);
        });
    }
    
    function errorDataHandler() {
        $("#metric").css("display", "");
    }
    
    function refreshDisplayTransaction(transaction) {
        var path = getPath();
        transaction.executeSql(selectMetricStatement, [path], selectDataHandler, errorDataHandler);
    }
    
    function refreshDisplay() {
        db.transaction(refreshDisplayTransaction);
    }
    
    function insertMetric(metric) {
        db.transaction(function (transaction) {
            var path = getPath();
            transaction.executeSql(selectPageStatement, [path], function (t, d) {
                if (d.rows.length === 1) {
                    transaction.executeSql(insertMetricStatement, [d.rows.item(0).id, metric]);
                    refreshDisplayTransaction(transaction);
                }
            });
        });
    }
    
    function addMetricForm(e) {
        e.preventDefault();
        getConfig(function (config) {
            insertMetric(config.DefaultMetric);
        });
    }
    
    function addMetricButton(e) {
        e.preventDefault();
        var value = $("#search").data().typeahead.query;
        getConfig(function (config) {
            d3.json(config.GraphitePath + "/metrics/find?query=" + value, function (json) {
                if (json.length === 1 && json[0].leaf === 1) {
                    insertMetric(value);
                    document.getElementById("search").value = "";
                }
            });
        });
    }
    
    function reset() {
        db.transaction(function (transaction) {
            transaction.executeSql(deleteAllStatement);
            refreshDisplayTransaction(transaction);
        });
    }
    
    
    function autoComplete(query, process) {
        getConfig(function (config) {
            var processedQuery = query,
                url = "";
            if (processedQuery.indexOf(config.DefaultSearch) < 0) {
                processedQuery = config.DefaultSearch + processedQuery;
            }
            url = config.GraphitePath + "/metrics/find?query=" + processedQuery + "*";
            d3.json(url, function (metrics) {
                process(metrics.map(function (e) { return e.id; }));
            });
        });
    }
    
    function navigate() {
        var fileName = getPath();
        getConfig(function (config) {
            var key = '',
                content = '<ul class="nav nav-pills">',
                theme = null;
            config.Pages.forEach(function (page) {
                var match = false,
                    linkClass = '';
                if (page.Path === fileName) {
                    linkClass = ' class="active"';
                } else {
                    linkClass = '';
                }
                content = content + '<li' + linkClass + '><a href="'
                    + window.location.origin + window.location.pathname
                    + "?path=" + page.Path + '">' + page.Name + '</a></li>';
            });
            content = content + '</ul>';
            $("#navigation").append(content);
        });
    }
                
    $(function () {
        navigate();
    });
    
    context.on("focus", function (i) {
        d3.selectAll(".value").style("right", i === null ? null : context.size() - i + "px");
    });
    
    // This provides the "Search" box with the autocomplete functionality
    $(function () {
        $('#search').typeahead({source: autoComplete});
        $('#add-metric').submit(addMetricForm);
        $('#search-form').submit(addMetricButton);
        $('#reset-btn').click(reset);
        refreshDisplay();
    
        d3.select("#data").selectAll(".axis")
            .data(["bottom"])
            .enter().append("div")
            .attr("class", function (d) { return d + " axis"; })
            .each(function (d) { d3.select(this).call(context.axis().ticks(12).orient(d)); });
        
        d3.select("#data").append("div")
            .attr("class", "rule")
            .call(context.rule());
    });
}());