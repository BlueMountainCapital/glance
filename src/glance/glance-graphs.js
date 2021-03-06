/*jslint browser:true*/
/*globals d3,$,glance*/
(function () {
    "use strict";
    function Graphs() {
    }
    
    var graphs_prototype = Graphs.prototype,
        eons = 1280;
    
    graphs_prototype.horizon = function (handler) {
        return function (selection) {
            var horizon = selection.enter()
                .append("div", ".bottom")
                .attr("class", "horizon " + handler.type)
                .style("height", "20px")
                .style("width", eons + "px"),
                chart = d3.horizon()
                .width(eons)
                .height(20)
                .bands(5)
                .mode("offset");
            horizon.append("div")
                .attr("class", "label label-info title");
            horizon.append("div")
                .attr("class", "label label-info value");
            horizon.append("svg")
                .attr('class', 'svg-data')
                .attr("width", eons + "px")
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
                    start = new Date(now - (eons * step)),
                    end = new Date(now),
                    format = d3.format(metric.format()),
                    cancellation = null,
                    calculate = function () {
                        metric.calculate(start, end, step, function (error, values) {
                            var v = [], lastValue = null, i = 0;
                            if (error) {
                                glance.displayError(error);
                            } else {
                                if (values.length < eons) {
                                    for (i = 0; i < eons - values.length; i = i + 1) {
                                        v[i] = metric.values[i + values.length];
                                    }
                                    for (i = 0; i < values.length; i = i + 1) {
                                        v[i + (eons - values.length)] = values[i];
                                    }
                                    values = v;
                                }
                                metric.values = values;
                                lastValue = values[values.length - 1];
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
                        start = end;
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